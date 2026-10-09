"use client";

import { useMemo } from "react";
import { TABLE_STATE_LABELS } from "@/lib/tableMeta";
import { ZONE_LABELS_ES, type ComandaTableDTO, type OpenTabDTO } from "@/lib/comandaMeta";
import { formatPrice } from "@/components/dashboard/menu/ui";

/**
 * "Lista" is the one kitchen state a server must act on from this screen —
 * food is sitting on the pass. The rest stay quiet so it does not.
 */
const KITCHEN_FLAG: Partial<Record<OpenTabDTO["kitchenStatus"], { label: string; tone: string }>> = {
  preparing: { label: "En cocina", tone: "is-cooking" },
  ready: { label: "Lista", tone: "is-ready" },
};

/**
 * Step one of the comanda, design B: where is this order for? Takeaway and
 * delivery on top, then the floor by zone. A table reads at a glance — an
 * outline when free, solid when taken, vermilion when its account is waiting
 * to be charged, dashed when a reservation holds it.
 */
export default function TargetPicker({
  tables,
  openTabs,
  onPickTable,
  onPickOther,
  selected = null,
}: {
  tables: ComandaTableDTO[];
  openTabs: OpenTabDTO[];
  onPickTable: (t: ComandaTableDTO) => void;
  onPickOther: (kind: "pickup" | "delivery") => void;
  /** Desktop keeps this list on screen, so it marks what is being worked on. */
  selected?: { kind: "table"; id: string } | { kind: "pickup" } | { kind: "delivery" } | null;
}) {
  const tabByTable = useMemo(() => new Map(openTabs.map((t) => [t.tableId, t])), [openTabs]);

  const zones = useMemo(() => {
    const groups = new Map<string, ComandaTableDTO[]>();
    for (const t of tables) {
      if (!groups.has(t.zone)) groups.set(t.zone, []);
      groups.get(t.zone)!.push(t);
    }
    return [...groups.entries()];
  }, [tables]);

  const openCount = openTabs.length;
  const openTotal = openTabs.reduce((sum, t) => sum + t.total, 0);
  const readyCount = openTabs.filter((t) => t.kitchenStatus === "ready").length;

  return (
    <div className="lbd-cm-col">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 className="lbd-display lbd-cm-h1">
          ¿Para dónde es<span style={{ color: "#ff5a33" }}>?</span>
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#a39b90" }}>Toca una mesa para abrir, añadir o cobrar.</p>
      </div>

      {/* the floor in one line: what is open, what it adds up to, and whether
          anything is waiting on the pass right now */}
      {openCount > 0 && (
        <div className="lbd-cm-strip">
          <div>
            <p className="lbd-cm-eyebrow">Cuentas abiertas</p>
            <p className="lbd-display" style={{ margin: "2px 0 0", fontSize: 22, letterSpacing: "-0.04em" }}>
              {openCount}
              <span style={{ marginLeft: 10, fontSize: 15, color: "#a39b90", letterSpacing: 0, fontFamily: "var(--font-sans)", fontWeight: 400 }}>{formatPrice(openTotal)}</span>
            </p>
          </div>
          {readyCount > 0 && (
            <span className="lbd-cm-ready">
              {readyCount} {readyCount === 1 ? "lista" : "listas"} en cocina
            </span>
          )}
        </div>
      )}

      <div className="lbd-cm-channels">
        <button type="button" className={`lbd-cm-channel${selected?.kind === "pickup" ? " is-selected" : ""}`} onClick={() => onPickOther("pickup")}>
          <span>Para llevar</span>
          <small>Sin mesa</small>
        </button>
        <button type="button" className={`lbd-cm-channel${selected?.kind === "delivery" ? " is-selected" : ""}`} onClick={() => onPickOther("delivery")}>
          <span>Delivery</span>
          <small>A domicilio</small>
        </button>
      </div>

      {tables.length === 0 ? (
        <p className="lbd-empty">Aún no hay mesas. Créalas en el módulo Mesas para tomar comandas de salón.</p>
      ) : (
        zones.map(([zone, zoneTables]) => {
          const busy = zoneTables.filter((t) => tabByTable.has(t.id)).length;
          return (
            <div key={zone} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 className="lbd-cm-eyebrow" style={{ margin: 0 }}>
                  {ZONE_LABELS_ES[zone] ?? zone}
                </h2>
                <span className="lbd-cm-count">
                  {busy}/{zoneTables.length}
                </span>
                <span style={{ flex: 1, height: 1, background: "rgba(243,239,230,0.07)" }} />
              </div>

              <div className="lbd-cm-tables">
                {zoneTables.map((t) => {
                  const tab = tabByTable.get(t.id);
                  const flag = tab ? KITCHEN_FLAG[tab.kitchenStatus] : undefined;
                  const look = tab?.kitchenStatus === "delivered" ? "cuenta" : t.state;
                  return (
                    <button key={t.id} type="button" onClick={() => onPickTable(t)} data-look={look} className={`lbd-cm-table${selected?.kind === "table" && selected.id === t.id ? " is-selected" : ""}`}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <span className="lbd-display" style={{ fontSize: 20, letterSpacing: "-0.04em", lineHeight: 1 }}>
                          {t.name}
                        </span>
                        <span className="lbd-cm-seats">{t.capacity}p</span>
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          {look === "cuenta" ? "Por cobrar" : TABLE_STATE_LABELS[t.state]}
                          {tab && tab.roundNumber > 1 && <span style={{ opacity: 0.7, fontWeight: 400 }}> · R{tab.roundNumber}</span>}
                        </span>
                        {tab && (
                          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                            <span className="lbd-cm-total">{formatPrice(tab.total)}</span>
                            {flag && <span className={`lbd-cm-flag ${flag.tone}`}>{flag.label}</span>}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
