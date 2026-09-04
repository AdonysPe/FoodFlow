"use client";

import { useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/auth";
import type { ReservationInput } from "@/lib/actions/reservations";
import {
  BLOCKING_RESERVATION_STATUSES,
  MIN_RESERVATION_BLOCK_MIN,
  intervalsOverlap,
  timeToMinutes,
} from "@/lib/tableMeta";
import { fieldClass, labelClass, formatClock } from "./ui";
import type { TableDTO, ReservationDTO } from "./types";

const DURATIONS = [45, 60, 90, 120, 150, 180];

export type ReservationFormValue = {
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  durationMin: string;
  partySize: string;
  tableId: string;
  notes: string;
};

export function initialFromReservation(r: ReservationDTO): ReservationFormValue {
  return {
    customerName: r.customerName,
    customerPhone: r.customerPhone ?? "",
    date: r.date,
    startTime: r.startTime,
    durationMin: String(r.durationMin),
    partySize: String(r.partySize),
    tableId: r.tableId ?? "",
    notes: r.notes ?? "",
  };
}

export function blankReservation(today: string): ReservationFormValue {
  return {
    customerName: "",
    customerPhone: "",
    date: today,
    startTime: "20:00",
    durationMin: "90",
    partySize: "2",
    tableId: "",
    notes: "",
  };
}

const blockEnd = (start: number, dur: number) =>
  start + Math.max(dur, MIN_RESERVATION_BLOCK_MIN);

export default function ReservationForm({
  tables,
  reservations = [],
  excludeReservationId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  tables: TableDTO[];
  reservations?: ReservationDTO[];
  excludeReservationId?: string;
  initial: ReservationFormValue;
  submitLabel: string;
  onSubmit: (input: ReservationInput) => Promise<ActionResult<unknown>>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<ReservationFormValue>(initial);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof ReservationFormValue>(key: K, v: ReservationFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  // For the chosen date + time, which tables are free? A table is taken if a
  // confirmed/seated reservation's 3-hour block window overlaps this one.
  const availability = useMemo(() => {
    const start = timeToMinutes(value.startTime);
    const map = new Map<string, { busy: boolean; by?: string; at?: string }>();
    if (Number.isNaN(start)) {
      for (const t of tables) map.set(t.id, { busy: false });
      return map;
    }
    const [aStart, aEnd] = [start, blockEnd(start, Number(value.durationMin) || 90)];

    for (const t of tables) {
      const clash = reservations.find((r) => {
        if (r.tableId !== t.id || r.date !== value.date) return false;
        if (r.id === excludeReservationId) return false;
        if (!BLOCKING_RESERVATION_STATUSES.includes(r.status)) return false;
        const s = timeToMinutes(r.startTime);
        return intervalsOverlap(aStart, aEnd, s, blockEnd(s, r.durationMin));
      });
      map.set(t.id, clash ? { busy: true, by: clash.customerName, at: clash.startTime } : { busy: false });
    }
    return map;
  }, [tables, reservations, excludeReservationId, value.date, value.startTime, value.durationMin]);

  const freeCount = tables.filter((t) => !availability.get(t.id)?.busy).length;
  const selectedBusy = value.tableId ? availability.get(value.tableId)?.busy : false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await onSubmit({
        customerName: value.customerName,
        customerPhone: value.customerPhone,
        date: value.date,
        startTime: value.startTime,
        durationMin: Number(value.durationMin),
        partySize: Number(value.partySize),
        tableId: value.tableId,
        notes: value.notes,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rsv-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="rsv-name"
            required
            value={value.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            placeholder="Nombre del cliente"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="rsv-phone" className={labelClass}>
            Teléfono
          </label>
          <input
            id="rsv-phone"
            value={value.customerPhone}
            onChange={(e) => set("customerPhone", e.target.value)}
            placeholder="Opcional"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="rsv-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="rsv-date"
            type="date"
            required
            value={value.date}
            onChange={(e) => set("date", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="rsv-time" className={labelClass}>
            Hora
          </label>
          <input
            id="rsv-time"
            type="time"
            required
            value={value.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="rsv-duration" className={labelClass}>
            Duración
          </label>
          <select
            id="rsv-duration"
            value={value.durationMin}
            onChange={(e) => set("durationMin", e.target.value)}
            className={fieldClass}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d} className="bg-ink-800">
                {d} min
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rsv-party" className={labelClass}>
            Personas
          </label>
          <input
            id="rsv-party"
            type="number"
            min="1"
            max="60"
            required
            value={value.partySize}
            onChange={(e) => set("partySize", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rsv-table" className={labelClass}>
            Mesa asignada
          </label>
          <select
            id="rsv-table"
            value={value.tableId}
            onChange={(e) => set("tableId", e.target.value)}
            className={fieldClass}
          >
            <option value="" className="bg-ink-800">
              Sin asignar
            </option>
            {tables.map((t) => {
              const a = availability.get(t.id);
              const busy = a?.busy && t.id !== value.tableId;
              return (
                <option
                  key={t.id}
                  value={t.id}
                  disabled={busy}
                  className="bg-ink-800"
                >
                  {t.name} · {t.capacity} pers.
                  {a?.busy ? ` — ocupada (${a.by ?? "reserva"} ${a.at ? formatClock(a.at) : ""})` : ""}
                </option>
              );
            })}
          </select>
          <p className="mt-1.5 text-[12px] text-fg/40">
            {freeCount === 0
              ? "Ninguna mesa libre para esa fecha y hora."
              : `${freeCount} ${freeCount === 1 ? "mesa disponible" : "mesas disponibles"} a esa hora · cada reserva bloquea la mesa 3 h.`}
          </p>
          {selectedBusy && (
            <p className="mt-1 text-[12px] text-amber-200">
              La mesa elegida ya tiene una reserva cerca de esa hora. Cámbiala o ajusta el horario.
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rsv-notes" className={labelClass}>
            Notas
          </label>
          <textarea
            id="rsv-notes"
            rows={2}
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Alergias, celebración, silla de bebé…"
            className={`${fieldClass} h-auto py-3`}
          />
        </div>
      </div>

      {error && <p className="text-[13px] text-accent-icon">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="md" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
