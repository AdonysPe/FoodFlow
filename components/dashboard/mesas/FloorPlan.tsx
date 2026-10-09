"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  TABLE_ZONES,
  ZONE_LABELS,
  type TableStateValue,
  type TableZoneValue,
} from "@/lib/tableMeta";
import { createTable, updateTablePosition } from "@/lib/actions/tables";
import { computeTableState, minutesSinceMidnight } from "./state";
import SegmentedControl from "./SegmentedControl";
import TableFigure from "./TableFigure";
import TableDrawer from "./TableDrawer";
import TablePropertiesPanel from "./TablePropertiesPanel";
import ServicePanel from "./ServicePanel";
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "./types";

type ZoneFilter = "all" | TableZoneValue;
type Pos = { x: number; y: number };

const DRAG_THRESHOLD_PX = 10;
const BOUND_MIN = 2;
const BOUND_MAX = 98;
const clamp = (n: number) => Math.min(BOUND_MAX, Math.max(BOUND_MIN, n));

// Soft resistance past the plan's edge instead of a hard stop — the further
// you drag past the bound, the less the table follows, so it still tracks
// the pointer but real things slow down before they run out of room.
function rubberband(n: number): number {
  const range = BOUND_MAX - BOUND_MIN;
  const k = 0.55;
  if (n < BOUND_MIN) {
    const overshoot = BOUND_MIN - n;
    return BOUND_MIN - (overshoot * range * k) / (range + k * overshoot);
  }
  if (n > BOUND_MAX) {
    const overshoot = n - BOUND_MAX;
    return BOUND_MAX + (overshoot * range * k) / (range + k * overshoot);
  }
  return n;
}

export default function FloorPlan({
  tables,
  reservations,
  orders,
  today,
  onEditingChange,
}: {
  tables: TableDTO[];
  reservations: ReservationDTO[];
  orders: OrderMiniDTO[];
  today: string;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [zone, setZone] = useState<ZoneFilter>("all");
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => minutesSinceMidnight(new Date()));

  // Local position overrides while dragging (and until the server round-trips).
  const [drafts, setDrafts] = useState<Record<string, Pos>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const dragMoved = useRef(false);
  const dragStart = useRef<{ px: number; py: number } | null>(null);
  // Offset between where the pointer grabbed the table and the table's own
  // position, so the table tracks the finger 1:1 instead of re-centering
  // under it on the first move.
  const dragGrabOffset = useRef<Pos>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pushToast = useDashboardStore((s) => s.pushToast);

  useEffect(() => {
    const id = setInterval(() => setNowMin(minutesSinceMidnight(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  // Keep the parent in sync so it can pause the auto-refresh while editing;
  // leaving the plan view (unmount) always ends edit mode.
  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  // Drop stale drafts once the server position matches (within rounding).
  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of tables) {
        const d = next[t.id];
        if (d && Math.abs(d.x - t.x) < 0.5 && Math.abs(d.y - t.y) < 0.5) {
          delete next[t.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tables]);

  const ordersByTable = useMemo(() => {
    const map = new Map<string, OrderMiniDTO[]>();
    for (const o of orders) {
      if (!o.tableId) continue;
      const arr = map.get(o.tableId);
      if (arr) arr.push(o);
      else map.set(o.tableId, [o]);
    }
    return map;
  }, [orders]);

  const stateById = useMemo(() => {
    const map = new Map<string, TableStateValue>();
    for (const t of tables) {
      map.set(
        t.id,
        computeTableState(t, ordersByTable.get(t.id) ?? [], reservations, today, nowMin)
      );
    }
    return map;
  }, [tables, ordersByTable, reservations, today, nowMin]);

  const zones = useMemo(
    () => TABLE_ZONES.filter((z) => tables.some((t) => t.zone === z)),
    [tables]
  );
  const visibleTables = zone === "all" ? tables : tables.filter((t) => t.zone === zone);

  // A taken table whose order was served and not yet paid: the account is
  // waiting to be charged.
  const billIds = useMemo(() => {
    const set = new Set<string>();
    for (const [tableId, list] of ordersByTable) {
      if (list.some((o) => o.status === "delivered")) set.add(tableId);
    }
    return set;
  }, [ordersByTable]);

  const counts = useMemo(() => {
    const c = { libre: 0, ocupada: 0, cuenta: 0, reservada: 0 };
    for (const t of visibleTables) {
      const st = stateById.get(t.id) ?? "libre";
      if (st === "ocupada" && billIds.has(t.id)) c.cuenta += 1;
      else c[st] += 1;
    }
    return c;
  }, [visibleTables, stateById, billIds]);

  const posOf = useCallback(
    (t: TableDTO): Pos => drafts[t.id] ?? { x: t.x, y: t.y },
    [drafts]
  );

  // Unclamped percentage position of the pointer over the canvas — bounds
  // are applied later (with rubber-banding while dragging, hard clamp on
  // commit), not here, so the grab offset below stays accurate at the edges.
  function pointFromEvent(e: React.PointerEvent): Pos | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handlePointerDown(e: React.PointerEvent, table: TableDTO) {
    if (!editing) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(table.id);
    dragMoved.current = false;
    dragStart.current = { px: e.clientX, py: e.clientY };
    const p = pointFromEvent(e);
    dragGrabOffset.current = p ? { x: p.x - table.x, y: p.y - table.y } : { x: 0, y: 0 };
  }

  function handlePointerMove(e: React.PointerEvent, table: TableDTO) {
    if (dragId !== table.id || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    if (!dragMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragMoved.current = true;
    const p = pointFromEvent(e);
    if (!p) return;
    setDrafts((prev) => ({
      ...prev,
      [table.id]: {
        x: rubberband(p.x - dragGrabOffset.current.x),
        y: rubberband(p.y - dragGrabOffset.current.y),
      },
    }));
  }

  function handlePointerUp(e: React.PointerEvent, table: TableDTO) {
    if (dragId !== table.id) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragId(null);

    if (!dragMoved.current) {
      setSelectedId(table.id); // treated as a tap → open properties
      return;
    }

    const p = drafts[table.id];
    if (!p) return;
    const rounded = { x: Math.round(clamp(p.x) * 10) / 10, y: Math.round(clamp(p.y) * 10) / 10 };
    setDrafts((prev) => ({ ...prev, [table.id]: rounded }));
    updateTablePosition(table.id, rounded).then((result) => {
      if (result.ok) {
        pushToast(`${table.name} movida.`, "success");
      } else {
        pushToast(result.error, "error");
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[table.id];
          return next;
        });
      }
    });
  }

  function handleAddTable() {
    createTable({ name: `Mesa ${tables.length + 1}`, capacity: 4, shape: "round", zone: "salon" }).then(
      (result) => {
        if (result.ok) {
          pushToast("Mesa añadida.", "success");
          setSelectedId(result.data.id);
        } else {
          pushToast(result.error, "error");
        }
      }
    );
  }

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  if (tables.length === 0 && !editing) {
    return (
      <div className="lbd-pg">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => setEditing(true)} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
            Editar plano
          </button>
        </div>
        <div className="lbd-empty">Aún no hay mesas. Crea tu plano para empezar.</div>
      </div>
    );
  }

  const stats: { key: keyof typeof counts; label: string }[] = [
    { key: "libre", label: "Libres" },
    { key: "ocupada", label: "Ocupadas" },
    { key: "cuenta", label: "Piden la cuenta" },
    { key: "reservada", label: "Reservadas" },
  ];

  return (
    <div className="lbd-pg">
      <div className="lbd-ms-stats lbd-rise" style={{ animationDelay: ".05s" }}>
        {stats.map((st) => (
          <div key={st.key} className="lbd-ms-stat">
            <span className={`lbd-ms-dot is-${st.key}`} aria-hidden />
            <span style={{ flex: 1, fontSize: 13, color: "#a39b90" }}>{st.label}</span>
            <span className="lbd-display" style={{ fontSize: 26, letterSpacing: "-0.04em" }}>
              {counts[st.key]}
            </span>
          </div>
        ))}
      </div>

      <div className="lbd-ms-bar">
        {zones.length > 1 && !editing ? (
          <SegmentedControl
            idBase="mesas-zone"
            size="sm"
            value={zone}
            onChange={setZone}
            options={(["all", ...zones] as ZoneFilter[]).map((z) => ({
              id: z,
              label: z === "all" ? "Todas" : ZONE_LABELS[z],
            }))}
          />
        ) : (
          <span />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#8a8278" }}>
            {editing ? "Modo edición: arrastra las mesas para colocarlas." : "Toca una mesa para ver el detalle."}
          </span>
          {editing && (
            <button type="button" onClick={handleAddTable} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
              + Añadir mesa
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setSelectedId(null);
            }}
            className={`lbd-btn lbd-btn--sm ${editing ? "lbd-btn--cream" : "lbd-btn--ghost"}`}
          >
            {editing ? "Listo" : "Editar plano"}
          </button>
        </div>
      </div>

      <div className="lbd-ms-grid">
        <section className="lbd-card lbd-rise lbd-ms-plan" style={{ animationDelay: ".1s" }} aria-label="Plano del salón">
          <div className="@container">
            <div ref={canvasRef} className={`lbd-ms-canvas${editing ? " is-editing" : ""}`}>
              {visibleTables.map((t) => {
                const p = posOf(t);
                return (
                  <TableFigure
                    key={t.id}
                    table={{ ...t, x: p.x, y: p.y }}
                    state={stateById.get(t.id) ?? "libre"}
                    bill={billIds.has(t.id)}
                    selected={selectedId === t.id}
                    editing={editing}
                    dragging={dragId === t.id}
                    onPointerDown={(e) => handlePointerDown(e, t)}
                    onPointerMove={(e) => handlePointerMove(e, t)}
                    onPointerUp={(e) => handlePointerUp(e, t)}
                    onClick={editing ? undefined : () => setSelectedId(t.id)}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <div className="lbd-ms-side">
          {editing ? (
            <TablePropertiesPanel table={selected} onClose={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)} />
          ) : (
            <>
              <TableDrawer
                table={selected}
                state={selected ? stateById.get(selected.id) ?? "libre" : "libre"}
                tables={tables}
                linkedOrders={selected ? ordersByTable.get(selected.id) ?? [] : []}
                reservations={reservations}
                today={today}
                onClose={() => setSelectedId(null)}
              />
              {/* Service information, not furniture: while the plan is being
                  rearranged it would only be noise, so it steps out. */}
              <ServicePanel tables={tables} orders={orders} reservations={reservations} today={today} stateById={stateById} selectedId={selectedId} onSelect={setSelectedId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
