"use client";

import { useMemo, useState, useTransition } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { payOrder } from "@/lib/actions/comanda";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  cashQuickAmounts,
  type PaymentMethodValue,
} from "@/lib/paymentMeta";
import { formatPrice } from "@/components/dashboard/menu/ui";
import type { OpenTabDTO } from "@/lib/comandaMeta";

export default function PaymentSheet({
  tab,
  onBack,
  onPaid,
}: {
  tab: OpenTabDTO;
  onBack: () => void;
  onPaid: (methodLabel: string) => void;
}) {
  const [method, setMethod] = useState<PaymentMethodValue | null>(null);
  const [received, setReceived] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const receivedNum = Number(received);
  const hasReceived = received.trim() !== "" && Number.isFinite(receivedNum);
  const change = hasReceived ? Math.round((receivedNum - tab.total) * 100) / 100 : 0;
  const short = hasReceived && receivedNum + 1e-6 < tab.total;

  const quick = useMemo(() => cashQuickAmounts(tab.total), [tab.total]);

  const canConfirm =
    method != null &&
    !isPending &&
    (method !== "efectivo" || (hasReceived && !short));

  function confirm() {
    if (!method) return;
    startTransition(async () => {
      const result = await payOrder({
        orderId: tab.orderId,
        method,
        amountReceived: method === "efectivo" ? receivedNum : undefined,
      });
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      if (method === "efectivo" && result.data.change > 0) {
        pushToast(`Vuelto: ${formatPrice(result.data.change)}`, "success");
      }
      onPaid(PAYMENT_METHOD_LABELS[method]);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[53px] z-20 border-b border-fg/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-bold text-fg">Cobrar · {tab.tableName}</span>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-fg/45 hover:bg-fg/[0.06] hover:text-fg/80"
          >
            Atrás
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5 text-center">
          <p className="text-[12.5px] uppercase tracking-wide text-fg/40">Total a cobrar</p>
          <p className="mt-1 font-display text-[2rem] font-extrabold text-fg">
            {formatPrice(tab.total)}
          </p>
        </div>

        <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-fg/35">
          Método de pago
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const active = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`h-14 rounded-xl border text-[14px] font-semibold transition-colors active:scale-[0.97] ${
                  active
                    ? "border-accent-400/60 bg-accent-400/15 text-accent-label"
                    : "border-fg/[0.1] bg-fg/[0.03] text-fg/70"
                }`}
              >
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            );
          })}
        </div>

        {method === "efectivo" && (
          <div className="mt-5">
            <label htmlFor="pay-received" className="mb-1.5 block text-[12px] font-medium text-fg/45">
              Monto recibido
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-fg/40">
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

            <div
              className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-semibold ${
                short
                  ? "bg-accent-500/10 text-accent-label"
                  : hasReceived
                    ? "bg-ok/10 text-ok-ink"
                    : "bg-fg/[0.03] text-fg/40"
              }`}
            >
              <span>{short ? "Falta" : "Vuelto"}</span>
              <span className="tabular-nums">
                {hasReceived ? formatPrice(Math.abs(change)) : formatPrice(0)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-30 border-t border-fg/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={confirm}
          className="h-12 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent transition-opacity active:scale-[0.98] disabled:opacity-40"
        >
          {isPending ? "Cobrando…" : `Cobrar ${formatPrice(tab.total)}`}
        </button>
      </div>
    </div>
  );
}
