"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { createReservation } from "@/lib/actions/reservations";
import { addDays, startOfWeek } from "@/lib/tableMeta";
import type { TableDTO, ReservationDTO } from "./types";
import ReservationForm, { blankReservation } from "./ReservationForm";
import ReservationCard from "./ReservationCard";
import SegmentedControl from "./SegmentedControl";
import WeekView from "./WeekView";
import { formatDayLabel } from "./ui";

type View = "hoy" | "semana";

export default function ReservationsPanel({
  tables,
  reservations,
  today,
}: {
  tables: TableDTO[];
  reservations: ReservationDTO[];
  today: string;
}) {
  const [view, setView] = useState<View>("hoy");
  const [adding, setAdding] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pushToast = useDashboardStore((s) => s.pushToast);

  const todays = useMemo(
    () =>
      reservations
        .filter((r) => r.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations, today]
  );

  // Anything still awaiting a decision, today or later — the queue the admin
  // works through. Web bookings land here automatically.
  const pending = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "pendiente" && r.date >= today)
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [reservations, today]
  );

  const weekReservations = useMemo(() => {
    const end = addDays(weekStart, 7);
    return reservations.filter((r) => r.date >= weekStart && r.date < end);
  }, [reservations, weekStart]);

  // Only surface the detail card for a reservation actually shown in the
  // current week grid — changing weeks drops a stale selection.
  const selected = selectedId
    ? weekReservations.find((r) => r.id === selectedId) ?? null
    : null;

  const weekLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  })} – ${new Date(`${addDays(weekStart, 6)}T00:00:00`).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          idBase="reservas-view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { id: "hoy", label: "Hoy" },
            { id: "semana", label: "Semana" },
          ]}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              createReservation({
                customerName: "Reserva web de ejemplo",
                customerPhone: "",
                date: addDays(today, 1),
                startTime: "21:00",
                durationMin: 90,
                partySize: 2,
                tableId: "",
                notes: "Entró desde el sitio público.",
                source: "web",
              }).then((r) =>
                pushToast(r.ok ? "Llegó una reserva web (pendiente)." : r.error, r.ok ? "success" : "error")
              );
            }}
            className="rounded-xl border border-chat-400/25 bg-chat-400/10 px-3 py-2.5 text-[13px] font-medium text-chat-ink hover:bg-chat-400/20"
            title="Crea una reserva de prueba como si llegara desde FoodFlow Sites"
          >
            Simular web
          </button>
          <Button
            type="button"
            size="md"
            variant={adding ? "secondary" : "primary"}
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Cerrar" : "+ Nueva reserva"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <GlassCard className="p-5 sm:p-6" hoverLift={false}>
              <ReservationForm
                tables={tables}
                reservations={reservations}
                initial={blankReservation(view === "semana" ? weekStart : today)}
                submitLabel="Crear reserva"
                onSubmit={async (input) => {
                  const result = await createReservation(input);
                  if (result.ok) {
                    setAdding(false);
                    pushToast("Reserva creada.", "success");
                  }
                  return result;
                }}
                onCancel={() => setAdding(false)}
              />
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {pending.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-amber-200/80">
            Por confirmar
            <span className="rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-200">
              {pending.length}
            </span>
          </h2>
          <GlassCard
            className="overflow-hidden p-0 ring-1 ring-inset ring-amber-300/15"
            hoverLift={false}
          >
            <ul className="flex flex-col">
              {pending.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  tables={tables}
                  reservations={reservations}
                  showDate
                />
              ))}
            </ul>
          </GlassCard>
        </div>
      )}

      {view === "hoy" ? (
        <div>
          <h2 className="text-[15px] font-semibold text-fg/90">Agenda de hoy</h2>
          <p className="mt-0.5 mb-2 text-[12.5px] capitalize text-fg/40">{formatDayLabel(today)}</p>
          {todays.length === 0 ? (
            <GlassCard className="p-10 text-center" hoverLift={false}>
              <p className="text-[14px] text-fg/45">
                Aún no hay reservas para hoy. Crea una con “+ Nueva reserva”.
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="overflow-hidden p-0" hoverLift={false}>
              <ul className="flex flex-col">
                {todays.map((r) => (
                  <ReservationCard
                  key={r.id}
                  reservation={r}
                  tables={tables}
                  reservations={reservations}
                />
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-fg/90">Semana</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2.5 py-1.5 text-[13px] text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
                aria-label="Semana anterior"
              >
                ‹
              </button>
              <span className="min-w-[120px] text-center text-[12.5px] text-fg/55">
                {weekLabel}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2.5 py-1.5 text-[13px] text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
                aria-label="Semana siguiente"
              >
                ›
              </button>
              {weekStart !== startOfWeek(today) && (
                <button
                  type="button"
                  onClick={() => setWeekStart(startOfWeek(today))}
                  className="rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-accent-icon hover:text-accent-ink"
                >
                  Hoy
                </button>
              )}
            </div>
          </div>

          <WeekView
            reservations={weekReservations}
            weekStart={weekStart}
            today={today}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
          />

          <AnimatePresence initial={false}>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <GlassCard className="overflow-hidden p-0" hoverLift={false}>
                  <ul>
                    <ReservationCard
                      reservation={selected}
                      tables={tables}
                      reservations={reservations}
                      showDate
                    />
                  </ul>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
