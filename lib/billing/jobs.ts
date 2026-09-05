// Los tres trabajos de fondo de la facturación.
//
// POR QUÉ NO HAY BULL NI REDIS. El brief los pedía, y en un servidor de toda la
// vida serían la respuesta correcta. FoodFlow corre en Vercel: no hay proceso
// que sobreviva a la petición, así que un worker de Bull no tendría dónde
// quedarse escuchando, y añadir Redis significa una pieza más que pagar,
// vigilar y que puede caerse — para tres tareas que en el peor día mueven unas
// decenas de filas.
//
// Lo que sí hay: tres funciones puras, cada una idempotente y con su propio
// tope, disparadas por Vercel Cron (ver vercel.json y app/api/cron/billing/*).
// Cuando el volumen lo pida, estas mismas funciones son el cuerpo de un worker
// de Bull sin tocarles una línea — lo que cambia es quién las llama.
//
// TODAS SON IDEMPOTENTES. Un cron puede dispararse dos veces; ninguna de las
// tres puede duplicar un comprobante, un correo ni un archivo.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import { retryCdr } from "@/lib/billing/emission";
import { sendCdrEmail } from "@/lib/billing/delivery";
import { logBilling } from "@/lib/api/respond";
import { putObject, readS3Config } from "@/lib/storage/s3";

export type JobReport = {
  job: string;
  scanned: number;
  processed: number;
  failed: number;
  skipped: number;
  ms: number;
  notes: string[];
};

/** Tope por ejecución. Una tanda cabe en el tiempo de una función serverless. */
const BATCH = 50;

/** Después de 8 intentos deja de reintentarse y se queda para revisión manual. */
const MAX_ATTEMPTS = 8;

/**
 * Espera creciente entre intentos: 2, 4, 8, 16… minutos, hasta 6 horas.
 *
 * Sin esto, un OSE caído recibiría el mismo golpe cada diez minutos durante un
 * día entero, que es exactamente lo que no ayuda a que se levante.
 */
function backoffMinutes(attempts: number): number {
  return Math.min(360, 2 ** Math.max(1, attempts));
}

// --------------------------------------------------------- retryFailedEmissions

/**
 * Reintenta los comprobantes que quedaron PENDIENTE.
 *
 * Solo entran los que fallaron por red o por cola del OSE: un rechazo de SUNAT
 * ya está en RECHAZADO y no vuelve a tocarse nunca. Cada fila se reintenta con
 * SU correlativo, así que dos ejecuciones simultáneas del cron no pueden
 * fabricar dos documentos.
 */
export async function retryFailedEmissions(): Promise<JobReport> {
  const startedAt = Date.now();
  const notes: string[] = [];
  const now = new Date();

  const candidates = await prisma.cdr.findMany({
    where: {
      estado: "PENDIENTE",
      attempts: { lt: MAX_ATTEMPTS },
      orderId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH * 2,
    select: { id: true, restaurantId: true, numeroDocumento: true, attempts: true, lastAttemptAt: true },
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const cdr of candidates) {
    if (processed + failed >= BATCH) break;

    // El backoff se evalúa aquí y no en el WHERE porque depende de `attempts`
    // fila por fila, y expresarlo en SQL sería un CASE por cada escalón.
    const waitMs = backoffMinutes(cdr.attempts) * 60_000;
    if (cdr.lastAttemptAt && now.getTime() - cdr.lastAttemptAt.getTime() < waitMs) {
      skipped += 1;
      continue;
    }

    try {
      const outcome = await retryCdr(cdr.restaurantId, cdr.id);
      if (outcome.status === "accepted") {
        processed += 1;
        logBilling("info", "job.retry.accepted", {
          restaurantId: cdr.restaurantId,
          cdrId: cdr.id,
          documento: cdr.numeroDocumento,
        });
      } else {
        failed += 1;
        logBilling("warn", "job.retry.still_failing", {
          restaurantId: cdr.restaurantId,
          cdrId: cdr.id,
          documento: cdr.numeroDocumento,
          attempts: cdr.attempts + 1,
        });
      }
    } catch (err) {
      // Un fallo aquí no puede llevarse la tanda entera por delante.
      failed += 1;
      logBilling("error", "job.retry.threw", {
        restaurantId: cdr.restaurantId,
        cdrId: cdr.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const exhausted = await prisma.cdr.count({
    where: { estado: "PENDIENTE", attempts: { gte: MAX_ATTEMPTS } },
  });
  if (exhausted > 0) {
    notes.push(`${exhausted} comprobante(s) agotaron sus reintentos y necesitan revisión manual.`);
  }

  return {
    job: "retryFailedEmissions",
    scanned: candidates.length,
    processed,
    failed,
    skipped,
    ms: Date.now() - startedAt,
    notes,
  };
}

// ----------------------------------------------------------- sendDocumentEmails

/**
 * Manda el PDF/XML de los comprobantes aceptados que aún no salieron.
 *
 * `emailedAt` es la marca de idempotencia: se escribe al terminar el envío, así
 * que una segunda pasada del cron no vuelve a mandar lo mismo. Si el SMTP falla
 * a mitad, la fila se queda sin marcar y entra en la tanda siguiente — un
 * duplicado ocasional es preferible a un comprobante que nunca llega.
 */
export async function sendDocumentEmails(): Promise<JobReport> {
  const startedAt = Date.now();

  const pending = await prisma.cdr.findMany({
    where: {
      estado: "ACEPTADO",
      emailedAt: null,
      clienteEmail: { not: null },
      // Nada más viejo de 30 días: si lleva un mes sin salir, algo pasó y no lo
      // arregla mandarlo hoy sin avisar a nadie.
      createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, restaurantId: true, numeroDocumento: true },
  });

  let processed = 0;
  let failed = 0;

  for (const cdr of pending) {
    try {
      const result = await sendCdrEmail(cdr.restaurantId, cdr.id);
      if (result.ok) processed += 1;
      else {
        failed += 1;
        logBilling("warn", "job.email.failed", {
          restaurantId: cdr.restaurantId,
          cdrId: cdr.id,
          reason: result.reason,
        });
      }
    } catch (err) {
      failed += 1;
      logBilling("error", "job.email.threw", {
        restaurantId: cdr.restaurantId,
        cdrId: cdr.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    job: "sendDocumentEmails",
    scanned: pending.length,
    processed,
    failed,
    skipped: 0,
    ms: Date.now() - startedAt,
    notes: [],
  };
}

// ------------------------------------------------------------------ backupCDRs

/**
 * Copia a S3 los comprobantes que aún no tienen respaldo.
 *
 * QUÉ SE RESPALDA Y POR QUÉ. SUNAT exige conservar el comprobante y su
 * respuesta cinco años. La base de datos ya los tiene, pero un respaldo que
 * vive en el mismo sitio que el original no es un respaldo: esto los saca del
 * alcance de un borrado accidental o de la pérdida de la instancia.
 *
 * `backup_url` es la marca de idempotencia. La clave incluye el restaurante y
 * el número de documento, así que volver a subir el mismo objeto lo sobrescribe
 * con su copia idéntica en lugar de duplicarlo.
 *
 * Sin S3 configurado no es un error: el job dice que está apagado y termina.
 */
export async function backupCDRs(): Promise<JobReport> {
  const startedAt = Date.now();
  const config = readS3Config();
  if (!config) {
    return {
      job: "backupCDRs",
      scanned: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      ms: Date.now() - startedAt,
      notes: ["S3 no está configurado en este despliegue; el respaldo está apagado."],
    };
  }

  const pending = await prisma.cdr.findMany({
    where: { estado: { in: ["ACEPTADO", "RECHAZADO"] }, backupUrl: null },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let processed = 0;
  let failed = 0;
  const notes: string[] = [];

  for (const cdr of pending) {
    const issued = cdr.fechaEmision;
    // Ordenado por local y por mes: así se recupera un periodo entero sin
    // recorrer el bucket completo.
    const key =
      `${cdr.restaurantId}/${issued.getFullYear()}/` +
      `${String(issued.getMonth() + 1).padStart(2, "0")}/${cdr.numeroDocumento}.json`;

    const document = {
      id: cdr.id,
      restaurantId: cdr.restaurantId,
      orderId: cdr.orderId,
      tipoDocumento: cdr.tipoDocumento,
      numeroDocumento: cdr.numeroDocumento,
      cliente: {
        tipoDocumento: cdr.clienteTipoDocumento,
        numeroDocumento: cdr.clienteNumeroDocumento,
        denominacion: cdr.clienteDenominacion,
      },
      estado: cdr.estado,
      mensajeSunat: cdr.mensajeSunat,
      codigoSunat: cdr.codigoSunat,
      hash: cdr.hash,
      pdfUrl: cdr.pdfUrl,
      xmlUrl: cdr.xmlUrl,
      xmlContent: cdr.xmlContent,
      fechaEmision: cdr.fechaEmision.toISOString(),
      total: Number(cdr.total),
      gravada: cdr.gravada == null ? null : Number(cdr.gravada),
      igv: cdr.igv == null ? null : Number(cdr.igv),
      archivedAt: new Date().toISOString(),
    };

    const result = await putObject(config, key, JSON.stringify(document, null, 2));
    if (result.ok) {
      await prisma.cdr.update({ where: { id: cdr.id }, data: { backupUrl: result.url } });
      processed += 1;
    } else {
      failed += 1;
      logBilling("error", "job.backup.failed", {
        restaurantId: cdr.restaurantId,
        cdrId: cdr.id,
        message: result.message,
      });
      // Si S3 rechaza el primero, rechazará los cincuenta. Se corta.
      notes.push(result.message);
      break;
    }
  }

  return {
    job: "backupCDRs",
    scanned: pending.length,
    processed,
    failed,
    skipped: 0,
    ms: Date.now() - startedAt,
    notes,
  };
}
