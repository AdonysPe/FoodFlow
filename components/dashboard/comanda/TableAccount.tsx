"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { voidOrder } from "@/lib/actions/comanda";
import { formatPrice } from "@/components/dashboard/menu/ui";
import { ZONE_LABELS_ES, type OpenTabDTO, type OpenTabLine } from "@/lib/comandaMeta";

const KITCHEN_LABELS: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "En cola",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida",
};

// The kitchen state is the one thing a server checks at a glance, so it gets
// a colour rather than another grey chip.
const KITCHEN_TONE: Record<OpenTabDTO["kitchenStatus"], string> = {
  pending: "",
  preparing: "is-cooking",
  ready: "is-ready",
  delivered: "is-served",
};

/** Short, sayable ticket number — what a server reads out loud on the phone. */
function ticketNumber(orderId: string) {
  return orderId.slice(-6).toUpperCase();
}

function openedAtLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * The open account of a table, design B: a cream paper ticket on the night
 * ground, grouped by round, with the two things a server does next — add
 * dishes or charge — pinned to the foot. Printing the precuenta and voiding
 * the account are here and unchanged.
 */
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

  const dishCount = useMemo(() => tab.lines.reduce((sum, l) => sum + l.quantity, 0), [tab.lines]);

  const multi = rounds.length > 1;
  const zone = tab.tableZone ? ZONE_LABELS_ES[tab.tableZone] ?? tab.tableZone : null;
  // The comanda stores the table name as the customer for a dine-in order, so
  // this only prints when someone actually put the account under a name.
  const namedFor = tab.customerName && tab.customerName !== tab.tableName ? tab.customerName : null;

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
    <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
      <div className="lbd-cm-sticky">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#a39b90" }}>
              Cuenta abierta
              <span className={`lbd-cm-flag ${KITCHEN_TONE[tab.kitchenStatus]}`}>{KITCHEN_LABELS[tab.kitchenStatus]}</span>
            </span>
            <h1 className="lbd-display lbd-cm-h1 lbd-trunc">{tab.tableName}</h1>
          </div>
          <button type="button" onClick={onBack} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ flexShrink: 0 }}>
            Mesas
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "8px 16px 200px" }}>
        {/* ---------------------------------------------------- the ticket */}
        <article className="lbd-cm-ticket">
          <header>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p className="lbd-cm-ticket-eyebrow">Comanda</p>
                <h2 className="lbd-display lbd-trunc" style={{ margin: "2px 0 0", fontSize: 26, letterSpacing: "-0.04em" }}>
                  {tab.tableName}
                </h2>
                {zone && <p style={{ margin: 0, fontSize: 12, color: "#5f5a54" }}>{zone}</p>}
              </div>
              <span className="lbd-mono lbd-cm-ticket-no">#{ticketNumber(tab.orderId)}</span>
            </div>

            <dl className="lbd-cm-ticket-meta">
              <div>
                <dt>Abierta</dt>
                <dd className="lbd-mono">{openedAtLabel(tab.openedAt)}</dd>
              </div>
              <div>
                <dt>Mozo</dt>
                <dd className="lbd-trunc">{tab.serverName ?? "—"}</dd>
              </div>
              <div>
                <dt>A nombre de</dt>
                <dd className="lbd-trunc">{namedFor ?? "—"}</dd>
              </div>
              <div>
                <dt>Rondas</dt>
                <dd className="lbd-mono">{tab.roundNumber}</dd>
              </div>
            </dl>
          </header>

          <div className="lbd-cm-perf" aria-hidden />

          {/* lines, grouped by the round they were sent in */}
          <div style={{ padding: "4px 20px 4px" }}>
            {rounds.map(([round, lines], roundIndex) => (
              <section key={round} style={{ marginTop: roundIndex > 0 ? 16 : 0 }}>
                {multi && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className="lbd-cm-ticket-eyebrow" style={{ color: "#8a8278" }}>
                      Ronda {round}
                    </span>
                    <span style={{ flex: 1, height: 1, background: "#e1dbd4" }} />
                  </div>
                )}
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {lines.map((l, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span className="lbd-mono" style={{ minWidth: 26, fontSize: 13, fontWeight: 600, color: "#5f5a54", paddingTop: 1 }}>
                        {l.quantity}×
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{l.name}</span>
                        {/* unit price, so a corrected line can be checked */}
                        <span style={{ display: "block", fontSize: 12, color: "#5f5a54" }}>{formatPrice(l.price)} c/u</span>
                        {l.note && <span style={{ display: "block", marginTop: 2, fontSize: 13, fontWeight: 600, color: "#c9391a" }}>{l.note}</span>}
                      </span>
                      <span className="lbd-mono" style={{ flexShrink: 0, fontSize: 14 }}>
                        {formatPrice(l.price * l.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* totals */}
          <footer>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Total
              <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#5f5a54" }}>
                {dishCount} {dishCount === 1 ? "plato" : "platos"}
              </span>
            </span>
            <span className="lbd-display" style={{ fontSize: 30, letterSpacing: "-0.045em", color: "#c9391a" }}>
              {formatPrice(tab.total)}
            </span>
          </footer>
        </article>

        {/* Precuenta: the same paper, printed before anyone pays, for the
            table that asks to check the bill first. It has no number and no
            payment on it, and says so. */}
        <Link href={`/dashboard/boleta/${tab.orderId}`} className="lbd-btn lbd-btn--ghost" style={{ width: "100%", marginTop: 16 }}>
          Imprimir precuenta
        </Link>

        <button type="button" onClick={handleVoid} onBlur={() => setConfirmingVoid(false)} disabled={isPending} className={`lbd-btn ${confirmingVoid ? "lbd-btn--solid" : "lbd-btn--ghost"}`} style={{ width: "100%", marginTop: 8, minHeight: 44, color: confirmingVoid ? undefined : "#a39b90" }}>
          {confirmingVoid ? "¿Anular la cuenta y liberar la mesa?" : "Anular cuenta"}
        </button>
      </div>

      <div className="lbd-cm-cart" style={{ flexDirection: "row", gap: 8 }}>
        <button type="button" onClick={onAddItems} className="lbd-btn lbd-btn--ghost" style={{ flex: 1, minHeight: 54, borderRadius: 18 }}>
          + Añadir platos
        </button>
        <button type="button" onClick={onCharge} className="lbd-cm-send" style={{ flex: 1 }}>
          Cobrar {formatPrice(tab.total)}
        </button>
      </div>
    </div>
  );
}
