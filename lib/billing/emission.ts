// El camino completo de una emisión, de un pedido cobrado a un CDR archivado.
//
// UN SOLO CAMINO. La caja (server action) y la API (POST /api/billing/emit)
// entran por aquí. Dos implementaciones del mismo recorrido acabarían
// discrepando justo en lo que no se puede discrepar: qué correlativo se sacó y
// qué se escribió al respecto.
//
// EL ORDEN IMPORTA, y este es el porqué de cada paso:
//
//   1. Se resuelve el emisor. Sin RUC, credencial o certificado no se saca
//      ningún número — un correlativo gastado por una configuración a medias es
//      un hueco que luego hay que justificarle a SUNAT.
//   2. Se saca el correlativo (una vez; un reintento reusa el suyo) y se ABRE
//      la fila del CDR en PENDIENTE. A partir de aquí, pase lo que pase, existe
//      constancia de en qué se gastó ese número.
//   3. Se llama al OSE.
//   4. Se cierra el CDR y se copia el desenlace al pedido, que es lo que lee el
//      ticket.
//
// NUNCA lanza. Lo que salga mal sale de aquí como una frase en español, porque
// esa frase la lee un mozo con el cliente todavía en la mesa.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import { SUNAT_ACCEPTED } from "@/lib/receipt";
import { breakdownFromTotal } from "@/lib/billing/igv";
import {
  drawCorrelative,
  SUNAT_DOC_CODE,
  type Correlative,
} from "@/lib/billing/correlatives";
import { openCdr, recordAttempt, settleCdr } from "@/lib/billing/cdr-service";
import {
  emitDocument,
  parseResponse,
  resolveIssuer,
  type ParsedEmission,
} from "@/lib/billing/ose-service";
import type { EmissionFailureCode } from "@/lib/billing/emit";

/** Lo que la caja renderiza después de cobrar. */
export type EmissionOutcome =
  | { status: "none" }
  | {
      status: "accepted";
      documentNo: string;
      hash: string | null;
      message: string;
      cdrId: string;
    }
  | {
      status: "failed";
      code: EmissionFailureCode;
      message: string;
      /** Existe salvo que se haya fallado antes de sacar número. */
      cdrId: string | null;
      /** Si tiene sentido que el job de reintentos lo vuelva a intentar. */
      retryable: boolean;
    };

type OrderRow = {
  id: string;
  deliveryFee: number;
  items: unknown;
  total: number;
  paidAt: Date | null;
  docSeries: string | null;
  docNumber: number | null;
  billingDocType: string | null;
  billingDocId: string | null;
  billingName: string | null;
  billingAddress: string | null;
  billingEmail: string | null;
};

const ORDER_SELECT = {
  id: true,
  deliveryFee: true,
  items: true,
  total: true,
  paidAt: true,
  docSeries: true,
  docNumber: true,
  billingDocType: true,
  billingDocId: true,
  billingName: true,
  billingAddress: true,
  billingEmail: true,
} as const;

/** Catálogo 06 de SUNAT, tal como se archiva en `cdrs`. */
const CUSTOMER_DOC_CODE: Record<string, string> = { dni: "1", ruc: "6" };

export async function emitForOrder(
  restaurantId: string,
  orderId: string,
  documentType: "boleta" | "factura"
): Promise<EmissionOutcome> {
  // El filtro por restaurante va en la misma consulta, no en un if posterior.
  const order = (await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    select: ORDER_SELECT,
  })) as OrderRow | null;

  if (!order) {
    return {
      status: "failed",
      code: "not_configured",
      message: "Pedido no encontrado.",
      cdrId: null,
      retryable: false,
    };
  }

  // 1 — el emisor, antes de gastar un número.
  const resolved = await resolveIssuer(restaurantId);
  if (!resolved.ok) {
    await writeToOrder(orderId, {
      status: "no_emitido",
      message: `${resolved.message} El cobro quedó registrado; entrega la nota de venta.`,
    });
    return {
      status: "failed",
      code: "not_configured",
      message: `${resolved.message} El cobro quedó registrado; entrega la nota de venta.`,
      cdrId: null,
      retryable: false,
    };
  }
  const issuer = resolved.issuer;

  // 2 — el correlativo. Un reintento reusa el que ya sacó.
  let correlative: Correlative;
  if (order.docSeries && order.docNumber != null) {
    correlative = {
      series: order.docSeries,
      number: order.docNumber,
      formatted: `${order.docSeries}-${String(order.docNumber).padStart(8, "0")}`,
      padded: String(order.docNumber).padStart(8, "0"),
    };
  } else {
    correlative = await drawCorrelative(restaurantId, documentType);
    await prisma.order.update({
      where: { id: orderId },
      data: { docSeries: correlative.series, docNumber: correlative.number },
    });
  }

  const lines = normalizeLines(order.items);
  if (order.deliveryFee) lines.push({ description: "Servicio de delivery", quantity: 1, unitPrice: order.deliveryFee });
  const totals = breakdownFromTotal(order.total, {
    rate: issuer.igvRate,
    taxed: issuer.taxed,
  });
  const issuedAt = order.paidAt ?? new Date();

  const cdr = await openCdr(restaurantId, {
    orderId: order.id,
    tipoDocumento: SUNAT_DOC_CODE[documentType],
    serie: correlative.series,
    correlativo: correlative.padded,
    numeroDocumento: correlative.formatted,
    cliente: {
      tipoDocumento: order.billingDocType
        ? (CUSTOMER_DOC_CODE[order.billingDocType] ?? "0")
        : "0",
      numeroDocumento: order.billingDocId,
      denominacion: order.billingName,
      email: order.billingEmail,
    },
    fechaEmision: issuedAt,
    total: order.total,
    gravada: totals.gravada,
    igv: totals.igv,
  });

  // 3 — el OSE.
  const raw = await emitDocument(issuer, {
    documentType,
    series: correlative.series,
    number: correlative.number,
    issuedAt,
    customer: order.billingDocId
      ? {
          docType: order.billingDocType === "ruc" ? "ruc" : "dni",
          docId: order.billingDocId,
          name: order.billingName,
          address: order.billingAddress,
          email: order.billingEmail,
        }
      : null,
    lines,
    total: order.total,
  });
  const parsed = parseResponse(raw);

  // 4 — se archiva.
  return persist(restaurantId, orderId, cdr.id, correlative.formatted, parsed, raw.ok ? null : raw.code);
}

/**
 * Reintenta un CDR que quedó en PENDIENTE.
 *
 * Entra por aquí el job de reintentos y el botón "reintentar" de la caja. Usa
 * el número que ya tiene la fila: sacar uno nuevo dejaría un hueco en la serie.
 */
export async function retryCdr(restaurantId: string, cdrId: string): Promise<EmissionOutcome> {
  const cdr = await prisma.cdr.findFirst({ where: { id: cdrId, restaurantId } });
  if (!cdr) {
    return {
      status: "failed",
      code: "not_configured",
      message: "Ese comprobante no existe.",
      cdrId: null,
      retryable: false,
    };
  }
  if (cdr.estado !== "PENDIENTE") {
    return {
      status: "failed",
      code: "rejected",
      message:
        cdr.estado === "ACEPTADO"
          ? "Ese comprobante ya fue aceptado por SUNAT."
          : "SUNAT rechazó ese comprobante. Hay que emitir uno nuevo, no reintentar este.",
      cdrId: cdr.id,
      retryable: false,
    };
  }
  if (!cdr.orderId) {
    return {
      status: "failed",
      code: "not_configured",
      message: "Ese comprobante no está ligado a un pedido; no se puede reintentar solo.",
      cdrId: cdr.id,
      retryable: false,
    };
  }

  const documentType = cdr.tipoDocumento === "01" ? "factura" : "boleta";
  return emitForOrder(restaurantId, cdr.orderId, documentType);
}

async function persist(
  restaurantId: string,
  orderId: string,
  cdrId: string,
  documentNo: string,
  parsed: ParsedEmission,
  failureCode: EmissionFailureCode | null
): Promise<EmissionOutcome> {
  if (parsed.estado === "ACEPTADO") {
    await settleCdr(restaurantId, cdrId, {
      estado: "ACEPTADO",
      mensajeSunat: parsed.message,
      codigoSunat: parsed.sunatCode,
      hash: parsed.hash,
      pdfUrl: parsed.pdfUrl,
      xmlUrl: parsed.xmlUrl,
    });
    await writeToOrder(orderId, {
      status: SUNAT_ACCEPTED,
      message: parsed.message,
      hash: parsed.hash,
      link: parsed.pdfUrl,
    });
    return {
      status: "accepted",
      documentNo: parsed.documentNo ?? documentNo,
      hash: parsed.hash,
      message: parsed.message,
      cdrId,
    };
  }

  if (parsed.estado === "RECHAZADO") {
    await settleCdr(restaurantId, cdrId, {
      estado: "RECHAZADO",
      mensajeSunat: parsed.message,
      codigoSunat: parsed.sunatCode,
    });
  } else {
    // Sigue PENDIENTE: se anota el intento y el job volverá a por él.
    await recordAttempt(restaurantId, cdrId, parsed.message);
  }

  await writeToOrder(orderId, {
    status: parsed.estado === "RECHAZADO" ? "rechazado" : (failureCode ?? "pendiente"),
    message: parsed.message,
  });

  return {
    status: "failed",
    code: failureCode ?? "network",
    message: parsed.message,
    cdrId,
    retryable: parsed.retryable,
  };
}

/**
 * Copia el desenlace al pedido.
 *
 * El pedido es lo que lee el ticket, y `sunatStatus === "aceptado"` es el único
 * valor que le permite llamarse boleta electrónica. El CDR es el archivo; esto
 * es el papel que se entrega.
 */
async function writeToOrder(
  orderId: string,
  patch: { status: string; message: string; hash?: string | null; link?: string | null }
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      sunatStatus: patch.status,
      sunatMessage: patch.message.slice(0, 400),
      sunatHash: patch.hash ?? null,
      sunatLink: patch.link ?? null,
    },
  });
}

/** El snapshot JSON del pedido, saneado. Una línea rota no tumba la emisión. */
function normalizeLines(items: unknown) {
  const raw = Array.isArray(items) ? items : [];
  return raw
    .map((item) => {
      const line = item as { name?: unknown; price?: unknown; quantity?: unknown };
      return {
        description: typeof line.name === "string" ? line.name : "Consumo",
        quantity: Number(line.quantity) > 0 ? Number(line.quantity) : 1,
        unitPrice: Number(line.price) >= 0 ? Number(line.price) : 0,
      };
    })
    .filter((l) => l.unitPrice > 0);
}
