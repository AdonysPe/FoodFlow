"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconX } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { formatCurrency } from "@/lib/format";
import {
  SHAPE_LABELS,
  ZONE_LABELS,
  TABLE_STATE_LABELS,
  TABLE_STATE_TONE,
  type TableStateValue,
} from "@/lib/tableMeta";
import { setTableOccupancy } from "@/lib/actions/tables";
import { createReservation } from "@/lib/actions/reservations";
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "./types";
import ReservationStatusPill from "./ReservationStatusPill";
import ReservationForm, { blankReservation } from "./ReservationForm";
import { formatClock, endTimeLabel, ghostButtonClass, accentButtonClass } from "./ui";

const ORDER_STATUS_LABELS: Record<OrderMiniDTO["status"], string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Servida · por cobrar",
};

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

  const open = Boolean(table);
  const occupied = Boolean(table?.occupiedAt) || linkedOrders.length > 0;
  const tone = table ? TABLE_STATE_TONE[state] : null;

  const dayReservations = table
    ? reservations
        .filter((r) => r.tableId === table.id && r.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  function toggleOccupancy(next: boolean) {
    if (!table) return;
    startTransition(async () => {
      const result = await setTableOccupancy(table.id, next);
      pushToast(
        result.ok
          ? next
            ? "Mesa marcada como ocupada."
            : "Mesa marcada como libre."
          : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  return (
    <AnimatePresence>
      {open && table && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[var(--scrim)] backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-fg/[0.08] bg-ink-950"
            role="dialog"
            aria-label={`Detalle de ${table.name}`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-fg/[0.07] px-5 py-4">
              <div>
                <h2 className="font-display text-[18px] font-bold tracking-[-0.01em] text-fg">
                  {table.name} · {table.capacity}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-fg/45">
                  {SHAPE_LABELS[table.shape]} · {ZONE_LABELS[table.zone]}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-fg/40 hover:bg-fg/[0.06] hover:text-fg/80"
              >
                <IconX className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <section>
                <p className="text-[12px] font-medium uppercase tracking-wide text-fg/35">
                  Estado actual
                </p>
                <span
                  className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-inset"
                  style={{
                    backgroundColor: tone!.fill,
                    color: tone!.text,
                    boxShadow: `inset 0 0 0 1px ${tone!.stroke}`,
                  }}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {TABLE_STATE_LABELS[state]}
                </span>
              </section>

              <section className="mt-6">
                <p className="text-[12px] font-medium uppercase tracking-wide text-fg/35">
                  Comanda activa
                </p>
                {linkedOrders.length === 0 ? (
                  <p className="mt-2 text-[13.5px] text-fg/40">
                    {occupied
                      ? "Ocupada manualmente, sin comanda vinculada."
                      : "Sin comanda abierta."}
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-3">
                    {linkedOrders.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-xl border border-fg/[0.07] bg-fg/[0.02] p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-medium text-fg/85">
                            {o.customerName}
                          </span>
                          <span className="rounded-md bg-fg/[0.06] px-2 py-0.5 text-[11.5px] text-fg/55">
                            {ORDER_STATUS_LABELS[o.status]}
                          </span>
                        </div>
                        <ul className="mt-2 flex flex-col gap-0.5 text-[12.5px] text-fg/55">
                          {o.items.map((it, i) => (
                            <li key={i}>
                              {it.quantity}× {it.name}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 border-t border-fg/[0.06] pt-2 text-[13px] font-medium text-fg/80">
                          {formatCurrency(o.total)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-6">
                <p className="text-[12px] font-medium uppercase tracking-wide text-fg/35">
                  Reservas de hoy
                </p>
                {dayReservations.length === 0 ? (
                  <p className="mt-2 text-[13.5px] text-fg/40">Sin reservas para esta mesa hoy.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {dayReservations.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-fg/[0.07] bg-fg/[0.02] px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-fg/85">
                            <span className="font-mono text-accent-ink">
                              {formatClock(r.startTime)}
                            </span>{" "}
                            <span className="text-fg/30">
                              – {endTimeLabel(r.startTime, r.durationMin)}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-fg/50">
                            {r.customerName} · {r.partySize} pers.
                          </p>
                        </div>
                        <ReservationStatusPill status={r.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <footer className="border-t border-fg/[0.07] px-5 py-4">
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
                <div className="flex flex-wrap gap-2">
                  {occupied ? (
                    <button
                      type="button"
                      disabled={isPending || linkedOrders.length > 0}
                      onClick={() => toggleOccupancy(false)}
                      className={ghostButtonClass}
                      title={
                        linkedOrders.length > 0
                          ? "Cierra la comanda para liberar la mesa"
                          : undefined
                      }
                    >
                      Marcar libre
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => toggleOccupancy(true)}
                      className={accentButtonClass}
                    >
                      Marcar ocupada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className={ghostButtonClass}
                  >
                    Nueva reserva
                  </button>
                </div>
              )}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
