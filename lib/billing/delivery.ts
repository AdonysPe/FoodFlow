// El envío del comprobante al cliente: una función, dos llamadores (la ruta
// de reenvío manual y el job que barre los pendientes).
//
// SOLO SE ENVÍA LO ACEPTADO. Mandarle a un cliente el PDF de un documento que
// SUNAT rechazó es entregarle un papel que no vale y que además contradice lo
// que dirá su contador. Un rechazado no se manda; se emite otro.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import { sendComprobante } from "@/lib/email/mailer";
import { getCdr } from "@/lib/billing/cdr-service";
import { checkEmail } from "@/lib/billing/validation";
import { money } from "@/lib/receipt";

export type DeliveryResult =
  | { ok: true; to: string; at: Date }
  | { ok: false; reason: "not_found" | "not_accepted" | "no_email" | "send_failed"; message: string };

const LABEL: Record<string, string> = {
  "01": "Factura",
  "03": "Boleta de venta",
  "07": "Nota de crédito",
};

export async function sendCdrEmail(
  restaurantId: string,
  cdrId: string,
  overrideEmail?: string | null
): Promise<DeliveryResult> {
  const cdr = await getCdr(restaurantId, cdrId);
  if (!cdr) {
    return { ok: false, reason: "not_found", message: "No encontramos ese comprobante." };
  }
  if (cdr.estado !== "ACEPTADO") {
    return {
      ok: false,
      reason: "not_accepted",
      message:
        cdr.estado === "PENDIENTE"
          ? "Ese comprobante todavía no lo acepta SUNAT. Espera a que se confirme antes de enviarlo."
          : "SUNAT rechazó ese comprobante; no se puede enviar. Hay que emitir uno nuevo.",
    };
  }

  const to = (overrideEmail ?? cdr.clienteEmail ?? "").trim();
  if (!to || checkEmail(to, { required: true })) {
    return {
      ok: false,
      reason: "no_email",
      message: "Ese comprobante no tiene un correo válido al que enviarlo.",
    };
  }

  const venue = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: { tradeName: true, legalName: true, restaurant: { select: { name: true } } },
  });
  const venueName =
    venue?.tradeName || venue?.legalName || venue?.restaurant?.name || "Tu restaurante";

  try {
    await sendComprobante({
      to,
      venueName,
      documentLabel: LABEL[cdr.tipoDocumento] ?? "Comprobante",
      documentNo: cdr.numeroDocumento,
      total: money(Number(cdr.total)),
      issuedAt: cdr.fechaEmision.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      pdfUrl: cdr.pdfUrl,
      xmlUrl: cdr.xmlUrl,
      xmlContent: cdr.xmlContent,
    });
  } catch (err) {
    // El detalle del fallo SMTP se queda en el log; hacia arriba va una frase.
    console.error(
      `[billing] envío del comprobante ${cdr.numeroDocumento} falló:`,
      err instanceof Error ? err.message : err
    );
    return {
      ok: false,
      reason: "send_failed",
      message: "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.",
    };
  }

  const at = new Date();
  await prisma.cdr.updateMany({
    where: { id: cdr.id, restaurantId },
    data: {
      emailedAt: at,
      // Si el reenvío fue a otra dirección, esa pasa a ser la de registro.
      ...(overrideEmail ? { clienteEmail: to.slice(0, 255) } : {}),
    },
  });

  return { ok: true, to, at };
}
