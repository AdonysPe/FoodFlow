"use client";

import { useMemo, useState, useTransition } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { voidOrder } from "@/lib/actions/comanda";
import { formatPrice } from "@/components/dashboard/menu/ui";
import type { OpenTabDTO, OpenTabLine } from "@/lib/comandaMeta";

const KITCHEN_LABELS: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "En cola",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida",
};

export default function TableAccount({
  tab,
  onBack,
  onAddItems,
  onCharge,
  onVoided,
}: {
  tab: OpenTabDTO;
  onBack: () => void;
  onAddItems: () => void;
  onCharge: () => void;
  onVoided: () => void;
}) {
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const rounds = useMemo(() => {
    const map = new Map<number, OpenTabLine[]>();
    for (const l of tab.lines) {
      const r = l.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(l);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [tab.lines]);

  const multi = rounds.length > 1;

  function handleVoid() {
    if (!confirmingVoid) {
      setConfirmingVoid(true);
      return;
    }
    startTransition(async () => {
      const result = await voidOrder(tab.orderId);
      if (result.ok) onVoided();
      else pushToast(result.error, "error");
      setConfirmingVoid(false);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-[53px] z-20 border-b border-white/[0.07] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-white">{tab.tableName}</span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/55">
              {KITCHEN_LABELS[tab.kitchenStatus]}
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-white/45 hover:bg-white/[0.06] hover:text-white/80"
          >
            Mesas
          </button>
        </div>
        {tab.serverName && (
          <p className="mt-1 text-[11.5px] text-white/35">Mozo {tab.serverName}</p>
        )}
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          {rounds.map(([round, lines]) => (
            <div key={round} className="mb-3 last:mb-0">
              {multi && (
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-white/30">
                  Ronda {round}
                </p>
              )}
              <ul className="flex flex-col gap-1.5">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-[13.5px]">
                    <span className="text-white/80">
                      {l.quantity}× {l.name}
                      {l.note && (
                        <span className="mt-0.5 block text-[11.5px] italic text-white/40">
                          ↳ {l.note}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-white/60">
                      {formatPrice(l.price * l.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
            <span className="text-[14px] font-semibold text-white/85">Total</span>
            <span className="text-[16px] font-bold text-white">{formatPrice(tab.total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVoid}
          onBlur={() => setConfirmingVoid(false)}
          disabled={isPending}
          className={`mt-4 w-full rounded-xl px-4 py-2.5 text-[12.5px] font-medium transition-colors disabled:opacity-40 ${
            confirmingVoid
              ? "bg-accent-500 text-white hover:bg-accent-600"
              : "border border-white/[0.1] bg-white/[0.03] text-white/45 hover:text-white/70"
          }`}
        >
          {confirmingVoid ? "¿Anular la cuenta y liberar la mesa?" : "Anular cuenta"}
        </button>
      </div>

      <div className="sticky bottom-0 z-30 flex gap-2 border-t border-white/[0.08] bg-ink-950/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onAddItems}
          className="h-12 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.05] text-[14px] font-semibold text-white/80 active:scale-[0.98]"
        >
          + Añadir platos
        </button>
        <button
          type="button"
          onClick={onCharge}
          className="h-12 flex-1 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[14px] font-bold text-ink-950 active:scale-[0.98]"
        >
          Cobrar {formatPrice(tab.total)}
        </button>
      </div>
    </div>
  );
}
