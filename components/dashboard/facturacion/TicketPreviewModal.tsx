"use client";

import { useEffect, useMemo, useRef } from "react";
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
 * "Vista previa del ticket".
 *
 * Feeds the real renderer sample data — there is no second implementation of
 * the paper that could drift from what the printer receives. It previews the
 * INTERNAL nota de venta, because that is what this venue prints until an OSE
 * is connected; the electronic heading only appears on a document SUNAT
 * actually accepted.
 */
export default function TicketPreviewModal({
  venueName,
  settings,
  notaVentaSeries,
  notaVentaNext,
  onClose,
}: {
  venueName: string;
  settings: BillingSettingsDTO;
  notaVentaSeries: string;
  notaVentaNext: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del ticket"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 px-4 py-10 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-fg/[0.1] bg-ink-900 p-5 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Vista previa del ticket</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-faint">
              Datos de ejemplo, al ancho real del rollo de {settings.paperWidth} mm.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-faint hover:bg-fg/[0.06] hover:text-fg/80"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 flex justify-center overflow-x-auto">
          <div className="inline-block rounded-lg shadow-lift">
            <ReceiptDoc receipt={receipt} />
          </div>
        </div>
      </div>
    </div>
  );
}
