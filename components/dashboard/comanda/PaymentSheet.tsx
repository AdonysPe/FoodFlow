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
    <div className="relative flex flex-1 flex-col">
      <div className="sticky top-[53px] z-20 border-b border-fg/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-bold text-fg">Cobrar · {tab.tableName}</span>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-faint hover:bg-fg/[0.06] hover:text-fg/80"
          >
            Atrás
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5 text-center">
          <p className="text-[12.5px] uppercase tracking-wide text-faint">Total a cobrar</p>
          <p className="mt-1 font-display text-[2rem] font-extrabold text-fg">
            {formatPrice(tab.total)}
          </p>
        </div>

        {/* ------------------------------------------------------ componente 8 */}
        {!billing.ready && (
          <div className="mt-4 rounded-xl border border-warn/25 bg-warn/[0.07] px-4 py-3">
            <p className="text-[12.5px] font-semibold text-warn-ink">
              Aún no puedes emitir boletas ni facturas
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Falta {billing.missing.join(", ")}. Este cobro se imprime como nota de venta
              interna, sin valor tributario.
            </p>
            <Link
              href="/dashboard/app/configuracion/facturacion"
              className="mt-2 inline-block text-[12px] font-medium text-warn-ink underline underline-offset-2"
            >
              Configurar facturación electrónica
            </Link>
          </div>
        )}

        <div className="mt-5">
          <DocumentPicker
            type={docType}
            customer={customer}
            onType={setDocType}
            onCustomer={setCustomer}
            electronicEnabled={billing.ready}
          />
        </div>

        {/* ----------------------------------------------------- forma de pago */}
        <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-faint">
          Forma de pago
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                className={`h-14 rounded-xl border px-2 text-[13.5px] font-semibold leading-tight transition-colors active:scale-[0.97] ${
                  active
                    ? "border-accent-400/60 bg-accent-400/15 text-accent-label"
                    : "border-fg/[0.1] bg-fg/[0.03] text-fg/70"
                }`}
              >
                {PAYMENT_METHOD_LONG_LABELS[m]}
              </button>
            );
          })}
        </div>

        {(needsTenderedAmount(method) || needsCashSplit(method)) && (
          <div className="mt-5">
            <label
              htmlFor="pay-received"
              className="mb-1.5 block text-[12px] font-medium text-faint"
            >
              {needsCashSplit(method) ? "Parte pagada en efectivo" : "Monto recibido"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-faint">
                S/
              </span>
              <input
                id="pay-received"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.10"
                autoFocus
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="0.00"
                className="h-14 w-full rounded-xl border border-fg/[0.12] bg-fg/[0.05] pl-11 pr-4 text-[18px] font-semibold text-fg outline-none focus:border-accent-400/50"
              />
            </div>

            {needsTenderedAmount(method) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setReceived(String(q))}
                    className="rounded-full border border-fg/[0.12] bg-fg/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-fg/75 active:scale-95"
                  >
                    {formatPrice(q)}
                  </button>
                ))}
              </div>
            )}

            <div
              className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-semibold ${
                short || overSplit
                  ? "bg-accent-500/10 text-accent-label"
                  : hasReceived
                    ? "bg-ok/10 text-ok-ink"
                    : "bg-fg/[0.03] text-faint"
              }`}
            >
              <span>
                {overSplit
                  ? "Excede el total"
                  : short
                    ? "Falta"
                    : needsCashSplit(method)
                      ? "Resto con otro medio"
                      : "Vuelto"}
              </span>
              <span className="tabular-nums">
                {hasReceived
                  ? formatPrice(
                      needsCashSplit(method)
                        ? Math.max(0, Math.round((tab.total - receivedNum) * 100) / 100)
                        : Math.abs(change)
                    )
                  : formatPrice(0)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPreview(true)}
          className="mt-5 w-full rounded-xl border border-fg/[0.12] bg-fg/[0.04] py-3 text-[13.5px] font-medium text-fg/70 active:scale-[0.99]"
        >
          Ver cómo saldrá el ticket
        </button>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-fg/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={confirm}
          className="h-12 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          {isPending
            ? "Cobrando…"
            : electronic
              ? `Cobrar y enviar a SUNAT · ${formatPrice(tab.total)}`
              : `Cobrar e imprimir nota de venta · ${formatPrice(tab.total)}`}
        </button>
        {customerProblem && method != null && (
          <p role="alert" className="mt-2 text-center text-[12px] text-accent-label">
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
