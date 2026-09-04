// The QR square printed on an electronic comprobante.
//
// SUNAT fixes both the content and the order of the fields: a pipe-separated
// line with the issuer's RUC, the document type code, series, correlative,
// IGV, total, date of issue, and the acquirer's document — followed by the
// hash of the signed XML. Anything else in that square is decoration.
//
// It is drawn ONLY for a comprobante an OSE accepted. A document with no hash
// has nothing legitimate to encode, so this returns null and the ticket prints
// the reserved square instead of a QR that resolves to nothing.
//
// Server only: qrcode reaches for node APIs.

import QRCode from "qrcode";
import { SUNAT_ACCEPTED, money, type ReceiptSettingsDTO } from "@/lib/receipt";

/** SUNAT's catálogo 01: 01 factura, 03 boleta. */
const DOC_CODE: Record<string, string> = { factura: "01", boleta: "03" };

/** Catálogo 06: 1 DNI, 6 RUC. 0 when the diner gave nothing. */
const ID_CODE: Record<string, string> = { dni: "1", ruc: "6" };

type OrderForQr = {
  total: number;
  paidAt: Date | null;
  documentType: string | null;
  docSeries: string | null;
  docNumber: number | null;
  billingDocType: string | null;
  billingDocId: string | null;
  sunatStatus: string | null;
  sunatHash: string | null;
};

export function sunatQrPayload(
  order: OrderForQr,
  settings: ReceiptSettingsDTO
): string | null {
  const code = order.documentType ? DOC_CODE[order.documentType] : undefined;
  if (
    !code ||
    !settings.ruc ||
    !order.docSeries ||
    order.docNumber == null ||
    order.sunatStatus !== SUNAT_ACCEPTED ||
    !order.sunatHash
  ) {
    return null;
  }

  // Menu prices in Peru already include IGV, so the tax is backed out of the
  // total exactly the way the printed breakdown does it.
  const igv = settings.showIgv
    ? Math.round((order.total - order.total / (1 + settings.igvRate)) * 100) / 100
    : 0;

  const issued = order.paidAt ?? new Date();
  const date = [
    issued.getFullYear(),
    String(issued.getMonth() + 1).padStart(2, "0"),
    String(issued.getDate()).padStart(2, "0"),
  ].join("-");

  return [
    settings.ruc,
    code,
    order.docSeries,
    String(order.docNumber),
    money(igv),
    money(order.total),
    date,
    order.billingDocId ? ID_CODE[order.billingDocType ?? "dni"] ?? "0" : "0",
    order.billingDocId ?? "",
    order.sunatHash,
  ].join("|");
}

export async function sunatQrDataUrl(
  order: OrderForQr,
  settings: ReceiptSettingsDTO
): Promise<string | null> {
  if (!settings.showQr) return null;
  const payload = sunatQrPayload(order, settings);
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(payload, {
      margin: 0,
      width: 220,
      // Thermal paper smudges; the highest correction level survives it.
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    // A ticket without its QR still has to reach the diner's hand.
    return null;
  }
}
