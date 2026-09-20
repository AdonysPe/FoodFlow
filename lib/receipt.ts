// The printed document a diner is handed when a waiter charges the table.
//
// WHAT THIS IS NOT: a boleta de venta electrónica. Emitting one in Peru means
// a RUC, an authorised series, and sending the XML to SUNAT (directly or
// through an OSE/PSE) to get back a CDR. FoodFlow does none of that, so the
// ticket is printed as an internal sale note and says so at the foot. The
// shape below is deliberately the same one a real boleta needs — series,
// correlative, taxable base, IGV — so wiring an OSE in later is a new field
// and a new footer, not a new document.
//
// No "use server" and no Prisma import on purpose: this is pure formatting,
// shared by the receipt page and the settings preview.

import { PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/paymentMeta";

export const PAPER_WIDTHS = [58, 80] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];

export const PAPER_LABELS: Record<PaperWidth, string> = {
  58: "58 mm (ticketera pequeña)",
  80: "80 mm (ticketera estándar)",
};

// Printable area of each roll once the printer's own margins are taken out.
// These are the numbers the @page rule and the paper element are sized with.
export const PAPER_PRINTABLE_MM: Record<PaperWidth, number> = {
  58: 48,
  80: 72,
};

export const DEFAULT_SERIES = "NV01";

export type ReceiptSettingsDTO = {
  legalName: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  footerNote: string | null;
  paperWidth: PaperWidth;
  showIgv: boolean;
  igvRate: number;
  autoPrint: boolean;
  series: string;
  /** Nombre comercial, printed above the razón social when it differs. */
  tradeName: string | null;
  /** Already downscaled to printer size before it was stored. */
  logoDataUrl: string | null;
  showQr: boolean;
  showCustomerRuc: boolean;
};

export const RECEIPT_DEFAULTS: ReceiptSettingsDTO = {
  legalName: null,
  ruc: null,
  address: null,
  phone: null,
  footerNote: null,
  paperWidth: 80,
  // Off until the owner tells us they are afecto a IGV. Printing a tax
  // breakdown for a venue in the Nuevo RUS would be inventing a tax.
  showIgv: false,
  igvRate: 0.18,
  autoPrint: true,
  series: DEFAULT_SERIES,
  tradeName: null,
  logoDataUrl: null,
  showQr: true,
  showCustomerRuc: false,
};

export type ReceiptLine = {
  name: string;
  quantity: number;
  price: number;
  note?: string;
  round?: number;
};

/** What the diner asked for at the till. */
export type DocumentTypeValue = "nota_venta" | "boleta" | "factura";

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeValue, string> = {
  nota_venta: "Ticket",
  boleta: "Boleta",
  factura: "Factura",
};

export type ReceiptCustomer = {
  /** "DNI" or "RUC" — what goes before the number on the paper. */
  docLabel: string;
  docId: string;
  name: string | null;
  address: string | null;
};

export type ReceiptDTO = {
  // A charged order prints a numbered document; an open one prints a
  // PRECUENTA, which is the same detail with no number and no payment on it.
  kind: "boleta" | "precuenta";
  /** The heading, in the words the diner is entitled to read. */
  title: string;
  /**
   * True only when an OSE accepted this comprobante. Everything else — an
   * unconfigured venue, a rejected emission, a plain ticket — prints as an
   * internal nota de venta with the disclaimer at the foot.
   */
  electronic: boolean;
  documentNo: string | null;
  issuedAt: Date;
  venueName: string;
  legalName: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  footerNote: string | null;
  where: string;
  namedFor: string | null;
  serverName: string | null;
  rounds: number;
  lines: ReceiptLine[];
  dishCount: number;
  // Null when the venue has not declared it charges IGV.
  tax: { taxable: number; igv: number; rate: number } | null;
  total: number;
  payment: { label: string; amountReceived: number | null; change: number | null } | null;
  paperWidth: PaperWidth;
  logoDataUrl: string | null;
  customer: ReceiptCustomer | null;
  /** Reserve the square even before there is a QR to put in it. */
  showQr: boolean;
  /** Data URL of the SUNAT QR, only ever produced for an accepted document. */
  qrDataUrl: string | null;
  hash: string | null;
  /**
   * Set only by the till's pre-charge preview: draw the SUNAT block — the
   * legend, the QR square and the hash line — as empty reserved space, so the
   * waiter sees where it will land. A printed document never sets this; it
   * either earned the block or it prints as an internal nota de venta.
   */
  reservedFor: "boleta" | "factura" | null;
};

export function normalizePaperWidth(value: unknown): PaperWidth {
  return value === 58 ? 58 : 80;
}

/** `B001-00000042` — SUNAT pads electronic correlatives to eight digits. */
export function formatElectronicDocumentNo(series: string, counter: number): string {
  return `${(series || "").toUpperCase()}-${String(counter).padStart(8, "0")}`;
}

/** `NV01-000042` — the shape every printed sale document in Peru uses. */
export function formatDocumentNo(series: string, counter: number): string {
  const prefix = (series || DEFAULT_SERIES).toUpperCase();
  return `${prefix}-${String(counter).padStart(6, "0")}`;
}

/** Amounts on the ticket carry no symbol; the column header says S/ once. */
export function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function receiptDateLabel(date: Date): string {
  // es-PE puts a comma between date and time; a ticket column reads cleaner
  // without it.
  return date
    .toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

const CHANNEL_FALLBACK: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Para llevar",
  dine_in: "Salón",
};

type OrderForReceipt = {
  items: unknown;
  deliveryFee?: number;
  total: number;
  channel: string;
  customerName: string;
  serverName: string | null;
  roundNumber: number;
  paidAt: Date | null;
  paymentMethod: string | null;
  amountReceived: number | null;
  changeGiven: number | null;
  receiptSeries: string | null;
  receiptNumber: number | null;
  table: { name: string } | null;
  // Filled in from the cobro screen. All optional so the orders charged before
  // the comprobante picker existed still build a receipt.
  documentType?: DocumentTypeValue | null;
  docSeries?: string | null;
  docNumber?: number | null;
  billingDocType?: string | null;
  billingDocId?: string | null;
  billingName?: string | null;
  billingAddress?: string | null;
  sunatStatus?: string | null;
  sunatHash?: string | null;
};

/** The one value of `sunatStatus` that lets a ticket call itself a boleta. */
export const SUNAT_ACCEPTED = "aceptado";

const ELECTRONIC_TITLES: Record<DocumentTypeValue, string> = {
  nota_venta: "NOTA DE VENTA",
  boleta: "BOLETA DE VENTA ELECTRÓNICA",
  factura: "FACTURA ELECTRÓNICA",
};

export type BuildReceiptOptions = {
  /** Produced server-side from the accepted comprobante; never invented here. */
  qrDataUrl?: string | null;
  /** See ReceiptDTO.reservedFor — preview only. */
  reserveFor?: "boleta" | "factura" | null;
};

export function buildReceipt(
  order: OrderForReceipt,
  venueName: string,
  settings: ReceiptSettingsDTO,
  options: BuildReceiptOptions = {}
): ReceiptDTO {
  const lines = [...(Array.isArray(order.items) ? order.items : [])] as ReceiptLine[];
  const dishCount = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  if (order.deliveryFee) lines.push({ name: "Servicio de delivery", price: order.deliveryFee, quantity: 1 });

  const where = order.table?.name ?? CHANNEL_FALLBACK[order.channel] ?? "Salón";
  // The comanda writes the table name into customerName when nobody gave one,
  // so this only prints when the account is actually under someone's name.
  const namedFor =
    order.customerName && order.customerName !== where ? order.customerName : null;

  const total = order.total;
  const rate = settings.igvRate;
  // Menu prices in Peru are shown with IGV already inside, so the ticket
  // works backwards from the total instead of adding tax on top of it.
  const taxable = settings.showIgv ? Math.round((total / (1 + rate)) * 100) / 100 : 0;
  const tax = settings.showIgv
    ? { taxable, igv: Math.round((total - taxable) * 100) / 100, rate }
    : null;

  const method = order.paymentMethod as PaymentMethodValue | null;
  const payment =
    order.paidAt && method
      ? {
          label: PAYMENT_METHOD_LABELS[method] ?? method,
          amountReceived: order.amountReceived,
          changeGiven: order.changeGiven,
        }
      : null;

  // What the document IS follows the payment, not the number: orders charged
  // before numbering existed are still bills, they just have no correlative
  // to print. Only an unpaid account is a pre-bill.
  const numbered = order.receiptNumber != null;

  // An emission is only electronic once the OSE said so. Anything else falls
  // back to the internal document, whatever the waiter picked at the till —
  // printing "BOLETA" over a comprobante SUNAT never received is what gets a
  // restaurant fined.
  const electronic =
    order.sunatStatus === SUNAT_ACCEPTED &&
    (order.documentType === "boleta" || order.documentType === "factura");

  const title =
    order.paidAt == null
      ? "PRECUENTA"
      : electronic
        ? ELECTRONIC_TITLES[order.documentType as DocumentTypeValue]
        : ELECTRONIC_TITLES.nota_venta;

  // The customer block prints whenever the diner identified themselves, even
  // on an internal nota de venta: they asked for it to be made out to them.
  const docLabel = order.billingDocType === "ruc" ? "RUC" : "DNI";
  const customer: ReceiptCustomer | null =
    order.billingDocId || order.billingName
      ? {
          docLabel,
          docId: order.billingDocId ?? "",
          name: order.billingName ?? null,
          address: order.billingAddress ?? null,
        }
      : null;

  // A factura or a boleta always carries who it was made out to. On the plain
  // internal ticket that block is opt-in, because most venues do not ask the
  // diner for a document at all.
  const printCustomer =
    customer != null &&
    (order.documentType === "factura" ||
      order.documentType === "boleta" ||
      settings.showCustomerRuc);

  return {
    kind: order.paidAt ? "boleta" : "precuenta",
    title,
    electronic,
    // An accepted comprobante prints ITS number; everything else prints the
    // internal correlative, because that is the document being handed over.
    documentNo: electronic
      ? formatElectronicDocumentNo(order.docSeries ?? "", order.docNumber ?? 0)
      : numbered
        ? formatDocumentNo(order.receiptSeries ?? settings.series, order.receiptNumber!)
        : null,
    issuedAt: order.paidAt ?? new Date(),
    venueName,
    legalName: settings.legalName,
    ruc: settings.ruc,
    address: settings.address,
    phone: settings.phone,
    footerNote: settings.footerNote,
    where,
    namedFor,
    serverName: order.serverName,
    rounds: order.roundNumber,
    lines,
    dishCount,
    tax,
    total,
    payment: payment
      ? {
          label: payment.label,
          amountReceived: payment.amountReceived,
          change: payment.changeGiven,
        }
      : null,
    paperWidth: settings.paperWidth,
    logoDataUrl: settings.logoDataUrl,
    customer: printCustomer ? customer : null,
    showQr: settings.showQr,
    qrDataUrl: options.qrDataUrl ?? null,
    hash: order.sunatHash ?? null,
    reservedFor: electronic ? null : options.reserveFor ?? null,
  };
}
