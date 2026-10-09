"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { voidOrder } from "@/lib/actions/comanda";
import { formatPrice } from "@/components/dashboard/menu/ui";
import type { OpenTabDTO } from "@/lib/comandaMeta";

export type SummaryLine = { id: string; name: string; price: number; qty: number; note: string };

const KITCHEN_LABELS: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "En cola",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida",
};
const KITCHEN_TONE: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "",
  preparing: "is-cooking",
  ready: "is-ready",
  delivered: "is-served",
};

/**
 * The right-hand column of the desktop comanda: the whole account in one
 * place. What the table already ordered (by round), what is being added now,
 * the total, and the two buttons that matter — send the round to the kitchen
 * or charge. On a phone the same things live on separate steps (TableAccount
 * and CartBar); this is the same information for a screen wide enough to hold
 * it at once.
 */
export default function ComandaSummary({
  targetLabel,
  tab,
  nextRound,
  lines,
  sending,
  askName,
  customerName,
  onCustomerNameChange,
  onQty,
  onSend,
  onCharge,
  onVoided,
}: {
  targetLabel: string;
  tab: OpenTabDTO | null;
  nextRound: number;
  lines: SummaryLine[];
  sending: boolean;
  askName: boolean;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  onQty: (id: string, qty: number) => void;
  onSend: () => void;
  onCharge: () => void;
  onVoided: () => void;
}) {
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const draftCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const draftTotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const sentTotal = tab?.total ?? 0;
  const rounds = new Map<number, NonNullable<typeof tab>["lines"]>();
  for (const l of tab?.lines ?? []) {
    const r = l.round ?? 1;
    if (!rounds.has(r)) rounds.set(r, []);
    rounds.get(r)!.push(l);
  }

  function handleVoid() {
    if (!tab) return;
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
    <div className="lbd-cm-sum">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#a39b90" }}>
            {tab ? "Cuenta abierta" : "Nuevo pedido"}
            {tab && <span className={`lbd-cm-flag ${KITCHEN_TONE[tab.kitchenStatus]}`}>{KITCHEN_LABELS[tab.kitchenStatus]}</span>}
          </span>
          <h2 className="lbd-display lbd-trunc" style={{ margin: 0, fontSize: 32, letterSpacing: "-0.05em", lineHeight: 1 }}>
            {targetLabel}
          </h2>
        </div>
        {draftCount > 0 && tab && <span className="lbd-cm-roundtag">Ronda {nextRound}</span>}
      </div>

      <div className="lbd-cm-sum-body">
        {tab && (
          <div className="lbd-cm-sum-sent">
            <span className="lbd-cm-eyebrow">Ya en la cuenta</span>
            {[...rounds.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([round, list]) =>
                list.map((l, i) => (
                  <div key={`${round}-${i}`} className="lbd-cm-sum-line">
                    <span>
                      <span className="lbd-mono" style={{ color: "#a39b90" }}>
                        {l.quantity}×
                      </span>{" "}
                      {l.name}
                      {rounds.size > 1 && <small> · R{round}</small>}
                    </span>
                    <span style={{ color: "#cfc7bb" }}>{formatPrice(l.price * l.quantity)}</span>
                  </div>
                ))
              )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="lbd-cm-eyebrow">{tab ? "Nueva ronda" : "Pedido"}</span>
          {lines.length === 0 ? (
            <p style={{ margin: "8px 0", fontSize: 14, color: "#8a8278" }}>Agrega platos desde la carta.</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} className="lbd-cm-sum-draft">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{l.name}</span>
                  {l.note && <span style={{ display: "block", fontSize: 12.5, color: "#ff9a7d" }}>{l.note}</span>}
                </div>
                <div className="lbd-cm-step is-on" style={{ transform: "scale(.9)", transformOrigin: "right center" }}>
                  <button type="button" onClick={() => onQty(l.id, l.qty - 1)} aria-label={`Quitar uno de ${l.name}`}>
                    −
                  </button>
                  <span className="lbd-mono">{l.qty}</span>
                  <button type="button" onClick={() => onQty(l.id, l.qty + 1)} aria-label={`Agregar otro ${l.name}`} className="is-plus">
                    +
                  </button>
                </div>
                <span style={{ minWidth: 70, textAlign: "right", fontSize: 14 }}>{formatPrice(l.price * l.qty)}</span>
              </div>
            ))
          )}
        </div>

        {askName && (
          <input type="text" value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} maxLength={60} autoComplete="off" placeholder="¿A nombre de quién? (opcional)" aria-label="¿A nombre de quién?" className="lbd-input" style={{ height: 42, fontSize: 14 }} />
        )}
      </div>

      <div className="lbd-cm-sum-foot">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 14, color: "#a39b90" }}>Total de la cuenta</span>
          <span className="lbd-display" style={{ fontSize: 32, letterSpacing: "-0.045em" }}>
            {formatPrice(sentTotal + draftTotal)}
          </span>
        </div>
        <button type="button" disabled={draftCount === 0 || sending} onClick={onSend} className="lbd-cm-send">
          {sending ? "Enviando…" : draftCount === 0 ? "Enviar a cocina" : `Enviar a cocina · ${draftCount} ${draftCount === 1 ? "plato" : "platos"}`}
        </button>
        {tab && (
          <>
            <button type="button" disabled={draftCount > 0} onClick={onCharge} className="lbd-btn lbd-btn--ghost" style={{ minHeight: 50, borderRadius: 18, fontSize: 15 }}>
              Cobrar {formatPrice(sentTotal)}
            </button>
            {draftCount > 0 && <span style={{ fontSize: 12, color: "#8a8278", textAlign: "center" }}>Envía la ronda a cocina antes de cobrar.</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/dashboard/boleta/${tab.orderId}`} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ flex: 1 }}>
                Precuenta
              </Link>
              <button type="button" onClick={handleVoid} onBlur={() => setConfirmingVoid(false)} disabled={isPending} className={`lbd-btn lbd-btn--sm ${confirmingVoid ? "lbd-btn--solid" : "lbd-btn--ghost"}`} style={{ flex: 1, color: confirmingVoid ? undefined : "#a39b90" }}>
                {confirmingVoid ? "¿Anular y liberar?" : "Anular cuenta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
