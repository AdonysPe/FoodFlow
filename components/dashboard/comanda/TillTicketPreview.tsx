"use client";

import { useEffect, useMemo, useRef } from "react";
import ReceiptDoc from "@/components/dashboard/boleta/ReceiptDoc";
import { buildReceipt, type ReceiptSettingsDTO } from "@/lib/receipt";
import { PAYMENT_METHOD_LONG_LABELS, type PaymentMethodValue } from "@/lib/paymentMeta";
import { formatElectronicNo } from "@/lib/billing/validation";
import type { OpenTabDTO } from "@/lib/comandaMeta";
import type { TillCustomer, TillDocumentType } from "./DocumentPicker";

/**
 * Componente 6 — la vista previa antes de confirmar.
 *
 * The same renderer the printer gets, fed the live state of the till: the
 * lines already on the tab, the comprobante the waiter picked and the customer
 * they typed. The SUNAT legend, the QR square and the hash line are drawn as
 * reserved space, because none of the three exists until the OSE answers.
 */
export default function TillTicketPreview({
  tab,
  venueName,
  settings,
  documentType,
  customer,
  method,
  amountReceived,
  documentNo,
  onClose,
}: {
  tab: OpenTabDTO;
  venueName: string;
  settings: ReceiptSettingsDTO;
  documentType: TillDocumentType;
  customer: TillCustomer;
  method: PaymentMethodValue | null;
  amountReceived: number | null;
  /** `B001-00000046`, or null for the internal ticket. */
  documentNo: string | null;
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

  const receipt = useMemo(() => {
    const change =
      method === "efectivo" && amountReceived != null
        ? Math.round((amountReceived - tab.total) * 100) / 100
        : null;

    return buildReceipt(
      {
        items: tab.lines,
        total: tab.total,
        channel: "dine_in",
        customerName: tab.customerName,
        serverName: tab.serverName,
        roundNumber: tab.roundNumber,
        paidAt: new Date(),
        paymentMethod: method,
        amountReceived,
        changeGiven: change,
        // Preview only: the real correlative is drawn at the moment of charging.
        receiptSeries: null,
        receiptNumber: null,
        table: { name: tab.tableName },
        documentType,
        billingDocType: documentType === "factura" ? "ruc" : "dni",
        billingDocId: customer.docId || null,
        billingName: customer.name || null,
        billingAddress: customer.address || null,
      },
      settings.tradeName || venueName,
      settings,
      { reserveFor: documentType === "nota_venta" ? null : documentType }
    );
  }, [tab, venueName, settings, documentType, customer, method, amountReceived]);

  // The preview knows the number it is about to take, even though the order
  // does not carry one yet.
  const withNumber = documentNo ? { ...receipt, documentNo } : receipt;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del comprobante"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/85 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-fg/[0.1] bg-ink-900 p-4 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Vista previa</h2>
            <p className="mt-0.5 text-[12px] text-faint">
              {documentNo
                ? `Se emitirá como ${documentNo}.`
                : "Ticket interno, sin numeración de SUNAT."}
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

        {method && (
          <p className="mt-2 text-[12px] text-faint">
            Pago: {PAYMENT_METHOD_LONG_LABELS[method]}
          </p>
        )}

        <div className="mt-3 flex justify-center overflow-x-auto">
          <div className="inline-block rounded-lg shadow-lift">
            <ReceiptDoc receipt={withNumber} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shared with the sheet's footer so both say the same number. */
export function previewDocumentNumber(
  documentType: TillDocumentType,
  series: { boletaSeries: string; boletaNext: number; facturaSeries: string; facturaNext: number }
): string | null {
  if (documentType === "boleta") return formatElectronicNo(series.boletaSeries, series.boletaNext);
  if (documentType === "factura") return formatElectronicNo(series.facturaSeries, series.facturaNext);
  return null;
}
