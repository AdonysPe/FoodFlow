"use client";

import { useState, useTransition } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  updateReservation,
  updateReservationStatus,
  deleteReservation,
} from "@/lib/actions/reservations";
import { type ReservationStatusValue } from "@/lib/tableMeta";
import type { TableDTO, ReservationDTO } from "./types";
import ReservationForm, { initialFromReservation } from "./ReservationForm";
import ReservationStatusPill, { RESERVATION_TONE } from "./ReservationStatusPill";
import { formatClock, endTimeLabel } from "./ui";

const QUICK_ACTIONS: Record<ReservationStatusValue, { to: ReservationStatusValue; label: string }[]> =
  {
    pendiente: [
      { to: "confirmada", label: "Confirmar" },
      { to: "cancelada", label: "Cancelar" },
    ],
    confirmada: [
      { to: "sentada", label: "Sentar" },
      { to: "no_show", label: "No-show" },
      { to: "cancelada", label: "Cancelar" },
    ],
    sentada: [{ to: "cancelada", label: "Cancelar" }],
    cancelada: [{ to: "confirmada", label: "Reactivar" }],
    no_show: [{ to: "confirmada", label: "Reactivar" }],
  };

export default function ReservationCard({
  reservation,
  tables,
  reservations = [],
  showDate = false,
}: {
  reservation: ReservationDTO;
  tables: TableDTO[];
  reservations?: ReservationDTO[];
  showDate?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const pushToast = useDashboardStore((s) => s.pushToast);
  const tableName =
    reservation.tableName ?? tables.find((t) => t.id === reservation.tableId)?.name ?? null;

  function changeStatus(to: ReservationStatusValue) {
    startTransition(async () => {
      const result = await updateReservationStatus(reservation.id, to);
      pushToast(result.ok ? "Reserva actualizada." : result.error, result.ok ? "success" : "error");
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteReservation(reservation.id);
      pushToast(result.ok ? "Reserva eliminada." : result.error, result.ok ? "success" : "error");
      setConfirmingDelete(false);
    });
  }

  const actions = QUICK_ACTIONS[reservation.status];
  const dateLabel = new Date(`${reservation.date}T00:00:00`).toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const faded = reservation.status === "cancelada" || reservation.status === "no_show";

  return (
    <li className="lbd-rv-row" data-faded={faded || undefined}>
      <div className="lbd-rv-time">
        <strong className="lbd-mono">{reservation.startTime}</strong>
        <small>{showDate ? dateLabel : `hasta ${endTimeLabel(reservation.startTime, reservation.durationMin)}`}</small>
      </div>
      <span className="lbd-rv-bar" style={{ background: RESERVATION_TONE[reservation.status].color }} aria-hidden="true" />
      <div className="lbd-rv-main">
        <span className="lbd-rv-name">
          <strong>{reservation.customerName}</strong>
          {reservation.source === "web" && <span className="lbd-rv-web">WEB</span>}
        </span>
        <small>
          {reservation.partySize} {reservation.partySize === 1 ? "persona" : "personas"}
          {tableName ? ` · ${tableName}` : " · sin mesa asignada"}
          {reservation.customerPhone ? ` · ${reservation.customerPhone}` : ""}
          {showDate ? ` · ${formatClock(reservation.startTime)}` : ""}
        </small>
        {reservation.notes && <em>“{reservation.notes}”</em>}
      </div>
      <ReservationStatusPill status={reservation.status} />
      <div className="lbd-rv-actions">
        {actions.map((a, index) => (
          <button
            key={a.to}
            type="button"
            disabled={isPending}
            onClick={() => changeStatus(a.to)}
            className={`lbd-btn lbd-btn--sm ${index === 0 && !faded ? "lbd-btn--cream" : "lbd-btn--ghost"}`}
          >
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => setEditing((v) => !v)} className="lbd-btn lbd-btn--ghost lbd-btn--sm" aria-expanded={editing}>
          {editing ? "Cerrar" : "Editar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          onBlur={() => setConfirmingDelete(false)}
          className={`lbd-btn lbd-btn--sm ${confirmingDelete ? "lbd-btn--solid" : "lbd-btn--ghost"}`}
        >
          {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
        </button>
      </div>

      {editing && (
        <div className="lbd-rv-edit">
          <ReservationForm
            tables={tables}
            reservations={reservations}
            excludeReservationId={reservation.id}
            initial={initialFromReservation(reservation)}
            submitLabel="Guardar cambios"
            onSubmit={async (input) => {
              const result = await updateReservation(reservation.id, input);
              if (result.ok) {
                setEditing(false);
                pushToast("Reserva actualizada.", "success");
              }
              return result;
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  );
}
