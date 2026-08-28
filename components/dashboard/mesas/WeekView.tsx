"use client";

import { useMemo } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { addDays, RESERVATION_STATUS_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";
import type { ReservationDTO } from "./types";
import { formatClock } from "./ui";

const DOT: Record<ReservationStatusValue, string> = {
  pendiente: "bg-amber-300",
  confirmada: "bg-mint",
  sentada: "bg-accent-400",
  cancelada: "bg-white/25",
  no_show: "bg-white/25",
};

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
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7">
          {days.map((day) => {
            const list = byDay.get(day) ?? [];
            const d = new Date(`${day}T00:00:00`);
            const isToday = day === today;
            return (
              <div key={day} className="min-h-[220px] border-r border-white/[0.05] last:border-r-0">
                <div
                  className={`border-b border-white/[0.06] px-3 py-2 ${
                    isToday ? "bg-accent-400/[0.06]" : ""
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                    {d.toLocaleDateString("es-PE", { weekday: "short" })}
                  </p>
                  <p
                    className={`text-[15px] font-semibold ${
                      isToday ? "text-accent-300" : "text-white/80"
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  {list.length === 0 ? (
                    <p className="px-1 py-3 text-center text-[11.5px] text-white/20">—</p>
                  ) : (
                    list.map((r) => {
                      const muted = r.status === "cancelada" || r.status === "no_show";
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onSelect(r.id)}
                          title={`${formatClock(r.startTime)} · ${r.customerName} · ${
                            RESERVATION_STATUS_LABELS[r.status]
                          }`}
                          className={`flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors ${
                            selectedId === r.id
                              ? "border-white/30 bg-white/[0.08]"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                          } ${muted ? "opacity-45" : ""}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[r.status]}`} />
                          <span className="shrink-0 font-mono text-[10.5px] text-white/60">
                            {r.startTime}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/80">
                            {r.customerName}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
