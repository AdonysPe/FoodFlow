"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/components/dashboard/menu/ui";
import {
  BLOCKING_RESERVATION_STATUSES,
  timeToMinutes,
  type TableStateValue,
} from "@/lib/tableMeta";
import { formatClock } from "./ui";
import type { OrderMiniDTO, ReservationDTO, TableDTO } from "./types";

/**
 * The rail beside the floor plan: what is running right now, and where a new
 * party can be sat.
 *
 * It is deliberately quiet. A server glances at it between trips, so it says
 * only the four things that change a decision — which tables are free and how
 * big, which are running and for how long, whether the kitchen has anything on
 * the pass, and whether a free table is spoken for later tonight.
 */

/** Only the two states a server has to act on get a colour. */
const KITCHEN_TONE: Partial<Record<OrderMiniDTO["status"], { label: string; dot: string }>> = {
  preparing: { label: "En cocina", dot: "bg-amber-400" },
  ready: { label: "Lista", dot: "bg-mint" },
};

function elapsedLabel(fromIso: string, nowMs: number): string {
  const min = Math.max(0, Math.round((nowMs - new Date(fromIso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export default function ServicePanel({
  tables,
  orders,
  reservations,
  today,
  stateById,
  selectedId,
  onSelect,
}: {
  tables: TableDTO[];
  orders: OrderMiniDTO[];
  reservations: ReservationDTO[];
  today: string;
  stateById: Map<string, TableStateValue>;
  selectedId: string | null;
  onSelect: (tableId: string) => void;
}) {
  // Null until mounted so the server and the first client render agree; the
  // elapsed clock only means anything on the client anyway.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);

  // Longest-running first: the table that has been sitting the longest is the
  // one closest to needing something.
  const running = useMemo(
    () =>
      orders
        .filter((o) => o.tableId && tableById.has(o.tableId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders, tableById]
  );

  const freeTables = useMemo(
    () =>
      tables
        .filter((t) => t.active && stateById.get(t.id) === "libre")
        .sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name)),
    [tables, stateById]
  );

  /**
   * A table is "free" right up until the party that booked it walks in, so the
   * next booking of the day is shown next to it. Seating a walk-in at 20:40 on
   * a table held from 21:00 is the mistake this line prevents.
   */
  const nextBookingByTable = useMemo(() => {
    const map = new Map<string, string>();
    const todays = reservations
      .filter(
        (r) =>
          r.tableId &&
          r.date === today &&
          BLOCKING_RESERVATION_STATUSES.includes(r.status)
      )
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (const r of todays) {
      if (r.tableId && !map.has(r.tableId)) map.set(r.tableId, r.startTime);
    }
    return map;
  }, [reservations, today]);

  const totalOpen = running.reduce((sum, o) => sum + o.total, 0);

  return (
    <aside
      aria-label="Servicio en curso"
      className="flex flex-col gap-4 rounded-[20px] border border-fg/[0.08] bg-fg/[0.02] p-4"
    >
      {/* ------------------------------------------------------ en servicio */}
      <section>
        <header className="flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg/40">
            En servicio
          </h3>
          <span className="text-[11.5px] tabular-nums text-fg/35">
            {running.length > 0 ? formatPrice(totalOpen) : "—"}
          </span>
        </header>

        {running.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-fg/[0.1] px-3 py-4 text-center text-[12.5px] text-fg/35">
            Ninguna mesa con cuenta abierta.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1">
            {running.map((order) => {
              const table = tableById.get(order.tableId!)!;
              const tone = KITCHEN_TONE[order.status];
              // The comanda stores the table name when nobody gave one, so a
              // second line only appears when it actually says something else.
              const named =
                order.customerName && order.customerName !== table.name
                  ? order.customerName
                  : null;

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(table.id)}
                    className={`w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
                      selectedId === table.id
                        ? "bg-accent-400/[0.1] ring-1 ring-inset ring-accent-400/30"
                        : "hover:bg-fg/[0.04]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-fg/90">
                        {table.name}
                      </span>
                      {tone && (
                        <span className="flex items-center gap-1 text-[11px] text-fg/45">
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {tone.label}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[12.5px] font-medium tabular-nums text-fg/70">
                        {formatPrice(order.total)}
                      </span>
                    </span>

                    <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-fg/35">
                      {named && <span className="truncate">{named}</span>}
                      {named && <span aria-hidden>·</span>}
                      <span className="tabular-nums">
                        {nowMs === null ? "—" : elapsedLabel(order.createdAt, nowMs)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- disponibles */}
      <section className="border-t border-fg/[0.07] pt-4">
        <header className="flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg/40">
            Libres
          </h3>
          <span className="text-[11.5px] tabular-nums text-fg/35">{freeTables.length}</span>
        </header>

        {freeTables.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-fg/[0.1] px-3 py-4 text-center text-[12.5px] text-fg/35">
            Salón lleno. No hay mesas libres.
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1">
            {freeTables.map((table) => {
              const booking = nextBookingByTable.get(table.id);
              return (
                <li key={table.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(table.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      selectedId === table.id
                        ? "bg-accent-400/[0.1] ring-1 ring-inset ring-accent-400/30"
                        : "hover:bg-fg/[0.04]"
                    }`}
                  >
                    <span className="truncate text-[13.5px] font-medium text-fg/80">
                      {table.name}
                    </span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-fg/35">
                      {table.capacity}p
                    </span>
                    {booking && (
                      <span className="ml-auto shrink-0 rounded-md bg-fg/[0.05] px-1.5 py-0.5 text-[10.5px] tabular-nums text-fg/45">
                        reserva {formatClock(booking)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
