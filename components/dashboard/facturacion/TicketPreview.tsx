"use client";

import { useMemo } from "react";
import ReceiptDoc from "@/components/dashboard/boleta/ReceiptDoc";
import { buildReceipt } from "@/lib/receipt";
import type { BillingSettingsDTO } from "@/lib/billing/settings";

// A believable table, so the owner is judging the layout and not a lorem ipsum.
// Round prices on purpose: the IGV split is easier to check by eye.
const SAMPLE_LINES = [
  { name: "Lomo saltado", price: 42, quantity: 2, note: "término tres cuartos", round: 1 },
  { name: "Chicha morada jarra", price: 18, quantity: 1, round: 1 },
  { name: "Suspiro a la limeña", price: 16, quantity: 2, round: 2 },
];
const SAMPLE_TOTAL = SAMPLE_LINES.reduce((s, l) => s + l.price * l.quantity, 0);

/**
 * "Vista previa del ticket", design B: the paper beside the form, redrawn as
 * the owner types.
 *
 * Feeds the real renderer sample data — there is no second implementation of
 * the paper that could drift from what the printer receives. It previews the
 * INTERNAL nota de venta, because that is what this venue prints until an OSE
 * is connected; the electronic heading only appears on a document SUNAT
 * actually accepted.
 */
export default function TicketPreview({
  venueName,
  settings,
  notaVentaSeries,
  notaVentaNext,
}: {
  venueName: string;
  settings: BillingSettingsDTO;
  notaVentaSeries: string;
  notaVentaNext: number;
}) {
  const receipt = useMemo(
    () =>
      buildReceipt(
        {
          items: SAMPLE_LINES,
          total: SAMPLE_TOTAL,
          channel: "dine_in",
          customerName: "Familia Ramos",
          serverName: "Lucía",
          roundNumber: 2,
          paidAt: new Date(),
          paymentMethod: "efectivo",
          amountReceived: 200,
          changeGiven: 200 - SAMPLE_TOTAL,
          receiptSeries: notaVentaSeries,
          receiptNumber: notaVentaNext,
          table: { name: "Mesa 7" },
          documentType: "nota_venta",
          billingDocType: "dni",
          billingDocId: "70123456",
          billingName: "María Ramos Quispe",
        },
        settings.tradeName || venueName,
        {
          legalName: settings.legalName || null,
          ruc: settings.ruc || null,
          address: settings.address || null,
          phone: settings.phone || null,
          footerNote: settings.footerNote || null,
          paperWidth: settings.paperWidth,
          showIgv: settings.showIgv && settings.ruc.trim().length > 0,
          igvRate: settings.igvRate,
          autoPrint: settings.autoPrint,
          series: notaVentaSeries,
          tradeName: settings.tradeName || null,
          logoDataUrl: settings.logoDataUrl,
          showQr: settings.showQr,
          showCustomerRuc: settings.showCustomerRuc,
        }
      ),
    [settings, venueName, notaVentaSeries, notaVentaNext]
  );

  return (
    <aside className="lbd-bl-preview" aria-label="Vista previa del ticket">
      <span className="lbd-mono lbd-bl-eyebrow">VISTA PREVIA DEL TICKET</span>
      <div className="lbd-bl-paper">
        <ReceiptDoc receipt={receipt} />
      </div>
      <span className="lbd-bl-preview-note">
        Datos de ejemplo, al ancho real del rollo de {settings.paperWidth} mm.{" "}
        {settings.autoPrint ? "Se imprime solo al confirmar el pago." : "Impresión manual desde el pedido."}
      </span>
    </aside>
  );
}
