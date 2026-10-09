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
  preparing: { label: "En cocina", dot: "is-cooking" },
  ready: { label: "Lista", dot: "is-ready" },
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
    <aside aria-label="Servicio en curso" className="lbd-card lbd-sv">
      {/* ------------------------------------------------------ en servicio */}
      <section>
        <header className="lbd-sv-head">
          <h3>En servicio</h3>
          <span>{running.length > 0 ? formatPrice(totalOpen) : "—"}</span>
        </header>

        {running.length === 0 ? (
          <p className="lbd-sv-empty">Ninguna mesa con cuenta abierta.</p>
        ) : (
          <ul className="lbd-sv-list">
            {running.map((order) => {
              const table = tableById.get(order.tableId!)!;
              const tone = KITCHEN_TONE[order.status];
              // The comanda stores the table name when nobody gave one, so a
              // second line only appears when it actually says something else.
              const named = order.customerName && order.customerName !== table.name ? order.customerName : null;

              return (
                <li key={order.id}>
                  <button type="button" onClick={() => onSelect(table.id)} className={`lbd-sv-row${selectedId === table.id ? " is-on" : ""}`}>
                    <span className="lbd-sv-line">
                      <span className="lbd-sv-name lbd-trunc">{table.name}</span>
                      {tone && (
                        <span className="lbd-sv-kitchen">
                          <i className={tone.dot} aria-hidden />
                          {tone.label}
                        </span>
                      )}
                      <span className="lbd-sv-amount">{formatPrice(order.total)}</span>
                    </span>
                    <span className="lbd-sv-sub">
                      {named && <span className="lbd-trunc">{named}</span>}
                      {named && <span aria-hidden>·</span>}
                      <span>{nowMs === null ? "—" : elapsedLabel(order.createdAt, nowMs)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- disponibles */}
      <section className="lbd-sv-free">
        <header className="lbd-sv-head">
          <h3>Libres</h3>
          <span>{freeTables.length}</span>
        </header>

        {freeTables.length === 0 ? (
          <p className="lbd-sv-empty">Salón lleno. No hay mesas libres.</p>
        ) : (
          <ul className="lbd-sv-list">
            {freeTables.map((table) => {
              const booking = nextBookingByTable.get(table.id);
              return (
                <li key={table.id}>
                  <button type="button" onClick={() => onSelect(table.id)} className={`lbd-sv-row lbd-sv-row--free${selectedId === table.id ? " is-on" : ""}`}>
                    <span className="lbd-sv-name lbd-trunc">{table.name}</span>
                    <span className="lbd-sv-seats">{table.capacity}p</span>
                    {booking && <span className="lbd-sv-booking">reserva {formatClock(booking)}</span>}
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
