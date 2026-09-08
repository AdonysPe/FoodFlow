"use client";

import Link from "next/link";
import { formatPrice } from "@/components/dashboard/menu/ui";

export type SettledTab = {
  orderId: string;
  tableName: string;
  total: number;
  methodLabel: string;
  change: number;
};

/**
 * What the waiter sees after charging, when the venue has auto-print off.
 *
 * Lives outside PaymentSheet and holds its own copy of the amounts because
 * the moment an order is paid it stops being an open tab: the server action
 * revalidates, the tab disappears from the list, and anything still reading
 * from it would render an empty screen with the ticket link on it.
 */
export default function PaymentDone({
  settled,
  onDone,
}: {
  settled: SettledTab;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-[30px] font-bold text-ok-ink">
        ✓
      </span>
      <h2 className="mt-4 font-display text-[22px] font-extrabold tracking-[-0.02em] text-fg">
        Cobrado
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        {settled.tableName} · {settled.methodLabel} · {formatPrice(settled.total)}
      </p>
      {settled.change > 0 && (
        <p className="mt-4 rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 py-2.5 text-[15px] font-semibold text-fg">
          Vuelto {formatPrice(settled.change)}
        </p>
      )}

      <div className="mt-8 flex w-full max-w-[320px] flex-col gap-2">
        <Link
          href={`/dashboard/boleta/${settled.orderId}?auto=1`}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent active:scale-[0.98]"
        >
          Imprimir boleta
        </Link>
        <button
          type="button"
          onClick={onDone}
          className="h-11 w-full rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[14px] font-medium text-fg/70 active:scale-[0.98]"
        >
          Listo, sin boleta
        </button>
      </div>
    </div>
  );
}
