"use client";

import { useMemo } from "react";
import { addDays, RESERVATION_STATUS_LABELS } from "@/lib/tableMeta";
import type { ReservationDTO } from "./types";
import { RESERVATION_TONE } from "./ReservationStatusPill";
import { formatClock } from "./ui";

export default function WeekView({
  reservations,
  weekStart,
  today,
  selectedId,
  onSelect,
}: {
  reservations: ReservationDTO[];
  weekStart: string; // Monday, yyyy-mm-dd
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, ReservationDTO[]>();
    for (const r of reservations) {
      const arr = map.get(r.date);
      if (arr) arr.push(r);
      else map.set(r.date, [r]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [reservations]);

  return (
    <div className="lbd-rv-week-scroll">
      <div className="lbd-rv-week">
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          const d = new Date(`${day}T00:00:00`);
          const isToday = day === today;
          return (
            <div key={day} className="lbd-rv-day" data-today={isToday || undefined}>
              <div className="lbd-rv-day-head">
                <span>{d.toLocaleDateString("es-PE", { weekday: "short" })}</span>
                <strong className="lbd-display">{d.getDate()}</strong>
              </div>
              {list.length === 0 ? (
                <span className="lbd-rv-day-empty">Sin reservas</span>
              ) : (
                list.map((r) => {
                  const muted = r.status === "cancelada" || r.status === "no_show";
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelect(r.id)}
                      aria-pressed={selectedId === r.id}
                      title={`${formatClock(r.startTime)} · ${r.customerName} · ${RESERVATION_STATUS_LABELS[r.status]}`}
                      className="lbd-rv-chip"
                      data-muted={muted || undefined}
                    >
                      <span className="lbd-mono">
                        <i style={{ background: RESERVATION_TONE[r.status].color }} aria-hidden="true" />
                        {r.startTime}
                      </span>
                      <span>{r.customerName}</span>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
