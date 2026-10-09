"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { formatCurrency } from "@/lib/format";
import { SHAPE_LABELS, ZONE_LABELS, TABLE_STATE_LABELS, type TableStateValue } from "@/lib/tableMeta";
import { setTableOccupancy } from "@/lib/actions/tables";
import { createReservation } from "@/lib/actions/reservations";
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "./types";
import ReservationStatusPill from "./ReservationStatusPill";
import ReservationForm, { blankReservation } from "./ReservationForm";
import { formatClock, endTimeLabel } from "./ui";

const ORDER_STATUS_LABELS: Record<OrderMiniDTO["status"], string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida · por cobrar",
};

/**
 * The selected table's card, design B: it used to slide in over the page; now
 * it sits beside the plan, as the prototype draws it, so the room stays in
 * view while a table is being read. Same content and same actions as before:
 * the open tab, the table's QR, today's reservations, mark taken or free, and
 * a new reservation.
 */
export default function TableDrawer({
  table,
  state,
  tables,
  linkedOrders,
  reservations,
  today,
  onClose,
}: {
  table: TableDTO | null;
  state: TableStateValue;
  tables: TableDTO[];
  linkedOrders: OrderMiniDTO[];
  reservations: ReservationDTO[];
  today: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const pushToast = useDashboardStore((s) => s.pushToast);

  useEffect(() => {
    setCreating(false);
  }, [table?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!table) return null;

  const occupied = Boolean(table.occupiedAt) || linkedOrders.length > 0;
  const bill = state === "ocupada" && linkedOrders.some((o) => o.status === "delivered");
  const look = bill ? "cuenta" : state;
  const stateLabel = bill ? "Por cobrar" : TABLE_STATE_LABELS[state];
  const total = linkedOrders.reduce((sum, o) => sum + o.total, 0);

  const dayReservations = reservations
    .filter((r) => r.tableId === table.id && r.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  function toggleOccupancy(next: boolean) {
    startTransition(async () => {
      const result = await setTableOccupancy(table!.id, next);
      pushToast(
        result.ok ? (next ? "Mesa marcada como ocupada." : "Mesa marcada como libre.") : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  return (
    <aside key={table.id} className="lbd-card lbd-card--glass lbd-td lbd-swap" role="region" aria-label={`Detalle de ${table.name}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="lbd-mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "#a39b90", textTransform: "uppercase" }}>
            {ZONE_LABELS[table.zone]}
          </span>
          <span className="lbd-display lbd-trunc" style={{ fontSize: 34, letterSpacing: "-0.045em", lineHeight: 1 }}>
            {table.name}
          </span>
          <span style={{ fontSize: 13, color: "#a39b90" }}>
            {table.capacity} personas · {SHAPE_LABELS[table.shape].toLowerCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span className={`lbd-td-state is-${look}`}>{stateLabel}</span>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="lbd-td-x">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {linkedOrders.length > 0 ? (
        <div className="lbd-td-box">
          {linkedOrders.map((o) => (
            <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a39b90", gap: 8 }}>
                <span className="lbd-trunc">{o.customerName}</span>
                <span style={{ flexShrink: 0 }}>{ORDER_STATUS_LABELS[o.status]}</span>
              </div>
              {o.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, gap: 8 }}>
                  <span>
                    {it.quantity} × {it.name}
                  </span>
                  <span style={{ color: "#cfc7bb", flexShrink: 0 }}>{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 8, borderTop: "1px solid rgba(243,239,230,0.08)" }}>
            <span style={{ fontSize: 13, color: "#a39b90" }}>Consumo</span>
            <span className="lbd-display" style={{ fontSize: 26, letterSpacing: "-0.04em" }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      ) : occupied ? (
        <div className="lbd-td-empty">Ocupada manualmente, sin comanda vinculada.</div>
      ) : (
        <div className="lbd-td-empty">Mesa libre y lista para sentar.</div>
      )}

      {dayReservations.length > 0 && (
        <div className="lbd-td-res">
          <span className="lbd-mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "#ff7a57", textTransform: "uppercase" }}>
            Reservas de hoy
          </span>
          {dayReservations.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  <span className="lbd-mono" style={{ color: "#ff7a57" }}>
                    {formatClock(r.startTime)}
                  </span>{" "}
                  <span style={{ color: "#a39b90", fontWeight: 400 }}>– {endTimeLabel(r.startTime, r.durationMin)}</span>
                </p>
                <p className="lbd-trunc" style={{ margin: 0, fontSize: 12, color: "#a39b90" }}>
                  {r.customerName} · {r.partySize} pers.
                </p>
              </div>
              <ReservationStatusPill status={r.status} />
            </div>
          ))}
        </div>
      )}

      {/* The sticker on the table: what a diner scans to order their own next
          round. White ground on purpose: a scanner needs the quiet zone light. */}
      {table.publicCode && (
        <div className="lbd-td-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/${table.publicCode}`} alt={`Código QR de ${table.name}`} width={84} height={84} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>QR de {table.name}</span>
            <span className="lbd-mono" style={{ fontSize: 11, color: "#5f5a54", wordBreak: "break-all" }}>
              {table.publicCode}
            </span>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: "#5f5a54" }}>El comensal lo escanea y pide su ronda desde la mesa.</span>
            <Link href="/dashboard/app/mesas/qr" style={{ fontSize: 12, fontWeight: 600, color: "#c9391a" }}>
              Imprimir los QR
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        {creating ? (
          <ReservationForm
            tables={tables}
            reservations={reservations}
            initial={{ ...blankReservation(today), tableId: table.id }}
            submitLabel="Crear reserva"
            onSubmit={async (input) => {
              const result = await createReservation(input);
              if (result.ok) {
                setCreating(false);
                pushToast("Reserva creada.", "success");
              }
              return result;
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <>
            {occupied ? (
              <button
                type="button"
                disabled={isPending || linkedOrders.length > 0}
                onClick={() => toggleOccupancy(false)}
                className="lbd-btn lbd-btn--solid"
                title={linkedOrders.length > 0 ? "Cierra la comanda para liberar la mesa" : undefined}
              >
                Marcar libre
              </button>
            ) : (
              <button type="button" disabled={isPending} onClick={() => toggleOccupancy(true)} className="lbd-btn lbd-btn--solid">
                Marcar ocupada
              </button>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/dashboard/comanda" className="lbd-btn lbd-btn--ghost" style={{ flex: 1 }}>
                Agregar pedido
              </Link>
              <button type="button" onClick={() => setCreating(true)} className="lbd-btn lbd-btn--ghost" style={{ flex: 1 }}>
                Nueva reserva
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
