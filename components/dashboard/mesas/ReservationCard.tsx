"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import {
  updateReservation,
  updateReservationStatus,
  deleteReservation,
} from "@/lib/actions/reservations";
import { RESERVATION_SOURCE_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";
import type { TableDTO, ReservationDTO } from "./types";
import ReservationForm, { initialFromReservation } from "./ReservationForm";
import ReservationStatusPill from "./ReservationStatusPill";
import { ghostButtonClass, formatClock, endTimeLabel } from "./ui";

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

  return (
    <li className="border-b border-white/[0.05] px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {showDate && (
              <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] capitalize text-white/50">
                {dateLabel}
              </span>
            )}
            <span className="font-mono text-[13px] text-accent-300">
              {formatClock(reservation.startTime)}
            </span>
            <span className="text-[12px] text-white/30">
              – {endTimeLabel(reservation.startTime, reservation.durationMin)}
            </span>
          </div>
          <p className="mt-1 truncate text-[14px] font-medium text-white/85">
            {reservation.customerName}
          </p>
          <p className="mt-0.5 text-[12.5px] text-white/45">
            {reservation.partySize} personas
            {tableName ? ` · ${tableName}` : " · sin mesa"}
            {reservation.customerPhone ? ` · ${reservation.customerPhone}` : ""}
          </p>
          {reservation.notes && (
            <p className="mt-1 text-[12.5px] italic text-white/40">“{reservation.notes}”</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            {reservation.source === "web" && (
              <span className="rounded-full border border-chat-400/25 bg-chat-400/10 px-2 py-0.5 text-[11px] font-medium text-chat-300">
                {RESERVATION_SOURCE_LABELS.web}
              </span>
            )}
            <ReservationStatusPill status={reservation.status} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                disabled={isPending}
                onClick={() => changeStatus(a.to)}
                className={ghostButtonClass}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={ghostButtonClass}
            >
              {editing ? "Cerrar" : "Editar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              className={
                confirmingDelete
                  ? "rounded-lg bg-accent-500 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-accent-600 disabled:opacity-40"
                  : ghostButtonClass
              }
            >
              {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
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
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
