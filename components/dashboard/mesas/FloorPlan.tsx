"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  TABLE_STATES,
  TABLE_STATE_LABELS,
  TABLE_STATE_TONE,
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
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "./types";

type ZoneFilter = "all" | TableZoneValue;
type Pos = { x: number; y: number };

const DRAG_THRESHOLD_PX = 4;
const clamp = (n: number) => Math.min(98, Math.max(2, n));

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

  const counts = useMemo(() => {
    const c: Record<TableStateValue, number> = { libre: 0, ocupada: 0, reservada: 0 };
    for (const t of visibleTables) c[stateById.get(t.id) ?? "libre"] += 1;
    return c;
  }, [visibleTables, stateById]);

  const posOf = useCallback(
    (t: TableDTO): Pos => drafts[t.id] ?? { x: t.x, y: t.y },
    [drafts]
  );

  function pointFromEvent(e: React.PointerEvent): Pos | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handlePointerDown(e: React.PointerEvent, table: TableDTO) {
    if (!editing) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(table.id);
    dragMoved.current = false;
    dragStart.current = { px: e.clientX, py: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent, table: TableDTO) {
    if (dragId !== table.id || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    if (!dragMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragMoved.current = true;
    const p = pointFromEvent(e);
    if (p) setDrafts((prev) => ({ ...prev, [table.id]: p }));
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
    const rounded = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
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
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-2 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
          >
            Editar plano
          </button>
        </div>
        <GlassCard className="p-10 text-center" hoverLift={false}>
          <p className="text-[14px] text-fg/45">Aún no hay mesas. Crea tu plano para empezar.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABLE_STATES.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full border border-fg/[0.07] bg-fg/[0.03] px-2.5 py-1 text-[12px] text-fg/60"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: TABLE_STATE_TONE[s].solid,
                  boxShadow: `0 0 7px -1px ${TABLE_STATE_TONE[s].solid}`,
                }}
              />
              {TABLE_STATE_LABELS[s]}
              <span className="tabular-nums font-semibold text-fg/35">{counts[s]}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {zones.length > 1 && !editing && (
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
          )}
          {editing && (
            <button
              type="button"
              onClick={handleAddTable}
              className="rounded-lg border border-accent-400/30 bg-accent-400/[0.12] px-3.5 py-2 text-[13px] font-semibold text-accent-label transition-colors hover:bg-accent-400/20"
            >
              + Añadir mesa
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setSelectedId(null);
            }}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
              editing
                ? "bg-fg text-ink-950 hover:bg-fg/90"
                : "border border-fg/[0.1] bg-fg/[0.04] text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
            }`}
          >
            {editing ? "Listo" : "Editar plano"}
          </button>
        </div>
      </div>

      {editing && (
        <p className="text-[12.5px] text-fg/40">
          Arrastra las mesas para colocarlas. Toca una mesa para editar sus datos o eliminarla.
        </p>
      )}

      <div className="@container">
        <div
          ref={canvasRef}
          className={`relative w-full touch-none overflow-hidden rounded-[20px] border transition-colors duration-300 aspect-[4/3] sm:aspect-[16/10] ${
            editing
              ? "border-accent-400/30 shadow-[inset_0_0_0_1px_rgba(255,90,51,0.12),inset_0_1px_0_0_var(--spec)]"
              : "border-fg/[0.08] shadow-[inset_0_1px_0_0_var(--spec)]"
          }`}
          style={{
            backgroundColor: "var(--plan-ground)",
            backgroundImage:
              "radial-gradient(130% 100% at 50% -10%, var(--plan-sheen), transparent 55%), radial-gradient(var(--plan-dot) 0.8px, transparent 0.8px)",
            backgroundSize: "auto, 22px 22px",
          }}
        >
          {visibleTables.map((t) => {
            const p = posOf(t);
            return (
              <TableFigure
                key={t.id}
                table={{ ...t, x: p.x, y: p.y }}
                state={stateById.get(t.id) ?? "libre"}
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

      {editing ? (
        <TablePropertiesPanel
          table={selected}
          onClose={() => setSelectedId(null)}
          onDeleted={() => setSelectedId(null)}
        />
      ) : (
        <TableDrawer
          table={selected}
          state={selected ? stateById.get(selected.id) ?? "libre" : "libre"}
          tables={tables}
          linkedOrders={selected ? ordersByTable.get(selected.id) ?? [] : []}
          reservations={reservations}
          today={today}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
