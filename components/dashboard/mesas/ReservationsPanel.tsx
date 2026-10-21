"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { createReservation } from "@/lib/actions/reservations";
import { addDays, startOfWeek, RESERVATION_STATUS_LABELS, type ReservationStatusValue } from "@/lib/tableMeta";
import type { TableDTO, ReservationDTO } from "./types";
import ReservationForm, { blankReservation } from "./ReservationForm";
import ReservationCard from "./ReservationCard";
import { RESERVATION_TONE } from "./ReservationStatusPill";
import WeekView from "./WeekView";
import { formatDayLabel } from "./ui";

type View = "hoy" | "semana";

const LEGEND: ReservationStatusValue[] = ["confirmada", "sentada", "no_show", "cancelada"];

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
  const [host, setHost] = useState<Element | null>(null);
  const pushToast = useDashboardStore((s) => s.pushToast);

  // The drawer mounts in the panel root so no animated ancestor traps it.
  useEffect(() => {
    setHost(document.querySelector(".lbd") ?? document.body);
  }, []);
  useEffect(() => {
    if (!adding) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAdding(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [adding]);

  // Today's agenda leaves out what still needs a decision: that sits above it.
  const todays = useMemo(
    () =>
      reservations
        .filter((r) => r.date === today && r.status !== "pendiente")
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations, today]
  );

  // Anything still awaiting a decision, today or later — the queue the owner
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
    <div className="lbd-pg">
      <div className="lbd-rv-toolbar lbd-rise" style={{ animationDelay: ".05s" }}>
        <div className="lbd-seg" role="group" aria-label="Vista">
          {(["hoy", "semana"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} className={view === v ? "is-on" : undefined} onClick={() => setView(v)}>
              {v === "hoy" ? "Hoy" : "Semana"}
            </button>
          ))}
        </div>
        <div className="lbd-rv-toolbar-actions">
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
            className="lbd-btn lbd-btn--ghost lbd-btn--sm"
            title="Crea una reserva de prueba como si llegara desde FoodFlow Sites"
          >
            Simular web
          </button>
          <button type="button" onClick={() => setAdding(true)} className="lbd-btn lbd-btn--solid lbd-btn--sm">
            + Nueva reserva
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="lbd-rv-pending lbd-rise" style={{ animationDelay: ".08s" }} aria-label="Por confirmar">
          <div className="lbd-rv-pending-head">
            <i className="lbd-rv-pulse" aria-hidden="true" />
            <strong>Por confirmar</strong>
            <span>{pending.length} {pending.length === 1 ? "reserva espera" : "reservas esperan"} tu respuesta</span>
          </div>
          <ul className="lbd-rv-list">
            {pending.map((r) => (
              <ReservationCard key={r.id} reservation={r} tables={tables} reservations={reservations} showDate />
            ))}
          </ul>
        </section>
      )}

      {view === "hoy" ? (
        <section className="lbd-card lbd-rv-card lbd-rise" style={{ animationDelay: ".12s" }} aria-label="Agenda de hoy">
          <div className="lbd-rv-card-head">
            <div>
              <strong>Agenda de hoy</strong>
              <small>{formatDayLabel(today)}</small>
            </div>
            <div className="lbd-rv-legend" aria-hidden="true">
              {LEGEND.map((s) => (
                <span key={s}>
                  <i style={{ background: RESERVATION_TONE[s].color }} />
                  {RESERVATION_STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
          {todays.length === 0 ? (
            <p className="lbd-rv-empty">Aún no hay reservas para hoy. Crea una con “+ Nueva reserva”.</p>
          ) : (
            <ul className="lbd-rv-list">
              {todays.map((r) => (
                <ReservationCard key={r.id} reservation={r} tables={tables} reservations={reservations} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="lbd-card lbd-rv-card lbd-rv-card--week lbd-rise" style={{ animationDelay: ".12s" }} aria-label="Semana">
          <div className="lbd-rv-card-head">
            <strong>Semana</strong>
            <div className="lbd-rv-weeknav">
              <button type="button" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Semana anterior">
                ‹
              </button>
              <span>{weekLabel}</span>
              <button type="button" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Semana siguiente">
                ›
              </button>
              {weekStart !== startOfWeek(today) && (
                <button type="button" className="lbd-rv-today" onClick={() => setWeekStart(startOfWeek(today))}>
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

          {selected && (
            <ul className="lbd-rv-list lbd-rv-selected">
              <ReservationCard key={selected.id} reservation={selected} tables={tables} reservations={reservations} showDate />
            </ul>
          )}
        </section>
      )}

      {adding &&
        host &&
        createPortal(
          <>
            <div className="lbd-ad-scrim" onMouseDown={() => setAdding(false)} aria-hidden="true" />
            <div className="lbd-ad-drawer lbd-ad-drawer--form lbd-rv-drawer" role="dialog" aria-modal="true" aria-labelledby="rv-new-title">
              <div className="lbd-ad-drawer-head">
                <h2 id="rv-new-title" className="lbd-display">
                  Nueva reserva
                </h2>
                <button type="button" className="lbd-ad-ico" onClick={() => setAdding(false)} aria-label="Cerrar">
                  ×
                </button>
              </div>
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
            </div>
          </>,
          host
        )}
    </div>
  );
}
