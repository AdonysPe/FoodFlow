"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { payOrder, retryEmission } from "@/lib/actions/comanda";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LONG_LABELS,
  cashQuickAmounts,
  needsCashSplit,
  needsTenderedAmount,
  type ActivePaymentMethod,
} from "@/lib/paymentMeta";
import { formatPrice } from "@/components/dashboard/menu/ui";
import { checkDni, checkEmail, checkRequired, checkRuc } from "@/lib/billing/validation";
import type { ReceiptSettingsDTO } from "@/lib/receipt";
import type { OpenTabDTO } from "@/lib/comandaMeta";
import type { TillBillingState } from "@/lib/db/billing";
import DocumentPicker, {
  EMPTY_CUSTOMER,
  type TillCustomer,
  type TillDocumentType,
} from "./DocumentPicker";
import EmissionOverlay, { type EmissionView } from "./EmissionOverlay";
import TillTicketPreview, { previewDocumentNumber } from "./TillTicketPreview";
import type { SettledTab } from "./PaymentDone";

export default function PaymentSheet({
  tab,
  venueName,
  autoPrint,
  receiptSettings,
  billing,
  onBack,
  onPaid,
}: {
  tab: OpenTabDTO;
  venueName: string;
  // The owner's choice: jump straight to the print dialog after charging, or
  // land on a confirmation that offers the ticket. Straight to print is the
  // default — a till with a ticketera wants one tap, not two.
  autoPrint: boolean;
  receiptSettings: ReceiptSettingsDTO;
  /** Componente 8: whether this venue can emit at all, and what it is missing. */
  billing: TillBillingState;
  onBack: () => void;
  // Carries the amounts out of here: once the charge lands the tab stops
  // existing, so the confirmation screen cannot read them back off it.
  onPaid: (settled: SettledTab) => void;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const [docType, setDocType] = useState<TillDocumentType>(
    billing.ready ? "boleta" : "nota_venta"
  );
  const [customer, setCustomer] = useState<TillCustomer>(EMPTY_CUSTOMER);
  const [method, setMethod] = useState<ActivePaymentMethod | null>(null);
  const [received, setReceived] = useState("");
  const [preview, setPreview] = useState(false);
  const [emission, setEmission] = useState<EmissionView | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRetrying, startRetry] = useTransition();

  const receivedNum = Number(received);
  const hasReceived = received.trim() !== "" && Number.isFinite(receivedNum);
  const change = hasReceived ? Math.round((receivedNum - tab.total) * 100) / 100 : 0;
  const short = needsTenderedAmount(method) && hasReceived && receivedNum + 1e-6 < tab.total;
  const overSplit = needsCashSplit(method) && hasReceived && receivedNum - 1e-6 > tab.total;

  const quick = useMemo(() => cashQuickAmounts(tab.total), [tab.total]);

  // The same rules DocumentPicker shows inline, collapsed into "can we send
  // this". Kept here too because the confirm button is the thing that has to
  // stay disabled, and it lives outside the picker.
  const customerProblem = useMemo(() => {
    if (docType === "factura") {
      return (
        checkRuc(customer.docId) ??
        checkRequired(customer.name, "La razón social") ??
        checkRequired(customer.address, "La dirección") ??
        checkEmail(customer.email, { required: true })
      );
    }
    if (docType === "boleta") {
      return (
        (customer.docId ? checkDni(customer.docId) : null) ??
        (customer.email ? checkEmail(customer.email) : null)
      );
    }
    return null;
  }, [docType, customer]);

  const amountOk =
    method != null &&
    (needsTenderedAmount(method)
      ? hasReceived && !short
      : needsCashSplit(method)
        ? hasReceived && !overSplit
        : true);

  const canConfirm = method != null && amountOk && customerProblem == null && !isPending;

  const documentNo = previewDocumentNumber(docType, billing);
  const electronic = docType !== "nota_venta";

  function confirm() {
    if (!method) return;
    if (electronic) setEmission({ phase: "sending", documentNo });

    startTransition(async () => {
      const result = await payOrder({
        orderId: tab.orderId,
        method,
        amountReceived:
          needsTenderedAmount(method) || needsCashSplit(method) ? receivedNum : undefined,
        documentType: docType,
        customer: electronic
          ? {
              docType: docType === "factura" ? "ruc" : "dni",
              docId: customer.docId,
              name: customer.name,
              address: customer.address,
              email: customer.email,
            }
          : undefined,
      });

      if (!result.ok) {
        setEmission(null);
        pushToast(result.error, "error");
        return;
      }

      const paidChange = needsTenderedAmount(method) ? result.data.change : 0;
      const { emission: outcome, orderId } = result.data;

      if (outcome.status === "accepted") {
        setEmission({
          phase: "accepted",
          documentNo: outcome.documentNo,
          hash: outcome.hash,
          customerEmail: customer.email || null,
          orderId,
        });
        router.refresh();
        return;
      }

      if (outcome.status === "failed") {
        setEmission({
          phase: "failed",
          message: outcome.message,
          orderId,
          configurable: outcome.code === "not_configured" || outcome.code === "not_implemented",
          retrying: false,
        });
        router.refresh();
        return;
      }

      // Plain internal ticket: nothing was sent anywhere, so the flow keeps the
      // behaviour it has always had.
      if (autoPrint) {
        router.push(`/dashboard/boleta/${orderId}?auto=1`);
        return;
      }
      onPaid({
        orderId,
        tableName: tab.tableName,
        total: tab.total,
        methodLabel: PAYMENT_METHOD_LONG_LABELS[method],
        change: paidChange,
      });
    });
  }

  function retry() {
    if (emission?.phase !== "failed") return;
    const orderId = emission.orderId;
    setEmission({ ...emission, retrying: true });
    startRetry(async () => {
      const result = await retryEmission(orderId);
      if (!result.ok) {
        setEmission({ ...emission, retrying: false, message: result.error });
        return;
      }
      const outcome = result.data;
      if (outcome.status === "accepted") {
        setEmission({
          phase: "accepted",
          documentNo: outcome.documentNo,
          hash: outcome.hash,
          customerEmail: customer.email || null,
          orderId,
        });
      } else if (outcome.status === "failed") {
        setEmission({
          phase: "failed",
          message: outcome.message,
          orderId,
          configurable: outcome.code === "not_configured" || outcome.code === "not_implemented",
          retrying: false,
        });
      }
      router.refresh();
    });
  }

  function closeEmission() {
    setEmission(null);
    onPaid({
      orderId: tab.orderId,
      tableName: tab.tableName,
      total: tab.total,
      methodLabel: method ? PAYMENT_METHOD_LONG_LABELS[method] : "—",
      change: needsTenderedAmount(method) ? change : 0,
    });
  }

  return (
    <div style={{ position: "relative", display: "flex", flex: 1, flexDirection: "column" }}>
      <div className="lbd-cm-sticky">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: "#a39b90" }}>Cobrar</span>
            <h1 className="lbd-display lbd-cm-h1 lbd-trunc">{tab.tableName}</h1>
          </div>
          <button type="button" onClick={onBack} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ flexShrink: 0 }}>
            Atrás
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "8px 16px 190px" }}>
        <div className="lbd-cm-total-card">
          <p className="lbd-cm-eyebrow" style={{ margin: 0 }}>
            Total a cobrar
          </p>
          <p className="lbd-display" style={{ margin: "4px 0 0", fontSize: 52, letterSpacing: "-0.055em", lineHeight: 1 }}>
            {formatPrice(tab.total)}
          </p>
        </div>

        {/* ------------------------------------------------------ componente 8 */}
        {!billing.ready && (
          <div className="lbd-cm-warn">
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#ffb37a" }}>Aún no puedes emitir boletas ni facturas</p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "#b9b1a5" }}>
              Falta {billing.missing.join(", ")}. Este cobro se imprime como nota de venta interna, sin valor tributario.
            </p>
            <Link href="/dashboard/app/configuracion/facturacion" className="lbd-link" style={{ display: "inline-block", marginTop: 6, fontSize: 12.5 }}>
              Configurar facturación electrónica ›
            </Link>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <DocumentPicker type={docType} customer={customer} onType={setDocType} onCustomer={setCustomer} electronicEnabled={billing.ready} />
        </div>

        {/* ----------------------------------------------------- forma de pago */}
        <p className="lbd-cm-eyebrow" style={{ margin: "24px 0 8px" }}>
          Forma de pago
        </p>
        <div className="lbd-cm-methods">
          {PAYMENT_METHODS.map((m) => {
            const active = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMethod(m);
                  if (!needsTenderedAmount(m) && !needsCashSplit(m)) setReceived("");
                }}
                aria-pressed={active}
                className={`lbd-cm-method${active ? " is-on" : ""}`}
              >
                {PAYMENT_METHOD_LONG_LABELS[m]}
              </button>
            );
          })}
        </div>

        {(needsTenderedAmount(method) || needsCashSplit(method)) && (
          <div className="lbd-pop" style={{ marginTop: 20 }}>
            <label htmlFor="pay-received" className="lbd-cm-eyebrow" style={{ display: "block", marginBottom: 8 }}>
              {needsCashSplit(method) ? "Parte pagada en efectivo" : "Monto recibido"}
            </label>
            <div className="lbd-input lbd-cm-money">
              <span>S/</span>
              <input id="pay-received" type="number" inputMode="decimal" min="0" step="0.10" autoFocus value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0.00" />
            </div>

            {needsTenderedAmount(method) && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {quick.map((q) => (
                  <button key={q} type="button" onClick={() => setReceived(String(q))} className="lbd-cm-pill">
                    {formatPrice(q)}
                  </button>
                ))}
              </div>
            )}

            <div className={`lbd-cm-change${short || overSplit ? " is-bad" : hasReceived ? " is-ok" : ""}`}>
              <span>{overSplit ? "Excede el total" : short ? "Falta" : needsCashSplit(method) ? "Resto con otro medio" : "Vuelto"}</span>
              <span className="lbd-mono">
                {hasReceived
                  ? formatPrice(needsCashSplit(method) ? Math.max(0, Math.round((tab.total - receivedNum) * 100) / 100) : Math.abs(change))
                  : formatPrice(0)}
              </span>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setPreview(true)} className="lbd-btn lbd-btn--ghost" style={{ width: "100%", marginTop: 20 }}>
          Ver cómo saldrá el ticket
        </button>
      </div>

      <div className="lbd-cm-cart">
        <button type="button" disabled={!canConfirm} onClick={confirm} className="lbd-cm-send">
          {isPending ? "Cobrando…" : electronic ? `Cobrar y enviar a SUNAT · ${formatPrice(tab.total)}` : `Cobrar e imprimir nota de venta · ${formatPrice(tab.total)}`}
        </button>
        {customerProblem && method != null && (
          <p role="alert" style={{ margin: 0, textAlign: "center", fontSize: 12.5, color: "#ffb39e" }}>
            {customerProblem}
          </p>
        )}
      </div>

      {preview && (
        <TillTicketPreview
          tab={tab}
          venueName={venueName}
          settings={receiptSettings}
          documentType={docType}
          customer={customer}
          method={method}
          amountReceived={hasReceived ? receivedNum : null}
          documentNo={documentNo}
          onClose={() => setPreview(false)}
        />
      )}

      {emission && (
        <EmissionOverlay
          view={emission.phase === "failed" ? { ...emission, retrying: isRetrying } : emission}
          total={tab.total}
          tableName={tab.tableName}
          change={needsTenderedAmount(method) ? change : 0}
          onRetry={retry}
          onClose={closeEmission}
        />
      )}
    </div>
  );
}
