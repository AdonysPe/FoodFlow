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
export default function PaymentDone({ settled, onDone }: { settled: SettledTab; onDone: () => void }) {
  return (
    <div className="lbd-pop lbd-cm-done" role="status">
      <span className="lbd-lg-done-mark" style={{ background: "#ff5a33", color: "#0c0908", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h1 className="lbd-display" style={{ margin: 0, fontSize: 32, letterSpacing: "-0.045em" }}>
        Cobrado · {formatPrice(settled.total)}
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: "#b9b1a5" }}>
        {settled.tableName} · {settled.methodLabel}
      </p>
      {settled.change > 0 && (
        <p style={{ margin: 0, fontSize: 15 }}>
          Vuelto <span className="lbd-mono" style={{ fontWeight: 600 }}>{formatPrice(settled.change)}</span>
        </p>
      )}

      <div style={{ marginTop: 18, display: "flex", width: "100%", maxWidth: 320, flexDirection: "column", gap: 8 }}>
        <Link href={`/dashboard/boleta/${settled.orderId}?auto=1`} className="lbd-cm-send" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          Imprimir boleta
        </Link>
        <button type="button" onClick={onDone} className="lbd-btn lbd-btn--ghost" style={{ minHeight: 48 }}>
          Listo, sin boleta
        </button>
      </div>
    </div>
  );
}
