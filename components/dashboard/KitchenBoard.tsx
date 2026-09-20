"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getKitchenOrders, updateOrderStatus, type KitchenOrder } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { orderOriginLabel, type OrderStatusValue } from "@/lib/orderMeta";
import { ZONE_LABELS_ES } from "@/lib/comandaMeta";
import { formatCurrency, formatDurationMs } from "@/lib/format";
import { EASE } from "@/lib/motion";

type BoardStatus = "pending" | "preparing" | "ready";
type BoardOrder = Omit<KitchenOrder, "status"> & { status: OrderStatusValue };

const COLUMNS: { status: BoardStatus; label: string }[] = [
  { status: "pending", label: "Pendiente" },
  { status: "preparing", label: "En preparación" },
  { status: "ready", label: "Lista" },
];

const POLL_MS = 4000;

// How long a ticket has been open, read as a colour from across the kitchen.
// A chef should not have to do arithmetic to know which board is burning.
const WARN_MS = 8 * 60 * 1000;
const LATE_MS = 15 * 60 * 1000;

function ageTone(ms: number) {
  if (ms >= LATE_MS) return "border-accent-400/50 bg-accent-400/15 text-accent-label";
  if (ms >= WARN_MS) return "border-warn/40 bg-warn/12 text-warn-ink";
  return "border-fg/[0.1] bg-fg/[0.05] text-fg/70";
}

/** Short, sayable ticket number — the same one the server sees on the comanda. */
function ticketNumber(id: string) {
  return id.slice(-6).toUpperCase();
}

function OrderLines({ items }: { items: KitchenOrder["items"] }) {
  // Group by the round each line was sent in. Rounds only matter once a table
  // has had more than one send, so a single-round order renders as a plain list.
  const rounds = useMemo(() => {
    const map = new Map<number, KitchenOrder["items"]>();
    for (const it of items) {
      const r = it.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  const multi = rounds.length > 1;
  const lastRound = rounds[rounds.length - 1]?.[0];

  return (
    <div className="mt-3 flex flex-col gap-3">
      {rounds.map(([round, lines]) => {
        const isNew = multi && round === lastRound;
        return (
          <div key={round}>
            {multi && (
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                    isNew ? "text-accent-ink" : "text-faint"
                  }`}
                >
                  Ronda {round}
                </span>
                {isNew && (
                  <span className="rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-accent-label ring-1 ring-inset ring-accent-400/30">
                    Nueva
                  </span>
                )}
                <span className="h-px flex-1 bg-fg/[0.07]" />
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {lines.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {/* the quantity is the number a chef counts pans by */}
                  <span className="mt-px shrink-0 rounded-md border border-fg/[0.12] bg-fg/[0.07] px-1.5 py-0.5 font-mono text-[13px] font-bold tabular-nums text-fg">
                    {item.quantity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium leading-snug text-fg">
                      {item.name}
                    </span>
                    {/* A missed note is a remade plate, so it gets a filled
                        chip instead of small italics under the line. */}
                    {item.note && (
                      <span className="mt-1 inline-block rounded-md bg-accent-400/15 px-2 py-0.5 text-[12px] font-semibold text-accent-label ring-1 ring-inset ring-accent-400/25">
                        {item.note}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  const [orders, setOrders] = useState<BoardOrder[]>(initialOrders);
  // Null until mounted so the server and the first client render agree — the
  // elapsed timer only has a meaningful value on the client anyway.
  const [now, setNow] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<BoardStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const suppressPollUntil = useRef(0);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      if (Date.now() < suppressPollUntil.current) return;
      const fresh = await getKitchenOrders();
      setOrders(fresh);
    }, POLL_MS);
    return () => clearInterval(poll);
  }, []);

  function moveOrder(id: string, status: OrderStatusValue) {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status === status) return;

    suppressPollUntil.current = Date.now() + POLL_MS * 2;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    startTransition(async () => {
      const result = await updateOrderStatus(id, status);
      if (!result.ok) {
        pushToast(result.error, "error");
        setOrders(await getKitchenOrders());
      }
    });
  }

  function handleDrop(status: BoardStatus) {
    setDragOverStatus(null);
    if (draggingId) moveOrder(draggingId, status);
    setDraggingId(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnOrders = orders.filter((o) => o.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(col.status);
            }}
            onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
            onDrop={() => handleDrop(col.status)}
            className={`flex min-h-[240px] flex-col gap-3 rounded-2xl border p-3 transition-colors ${
              dragOverStatus === col.status
                ? "border-accent-400/40 bg-accent-400/[0.04]"
                : "border-fg/[0.06] bg-fg/[0.015]"
            }`}
          >
            <div className="flex items-center justify-between px-1.5 py-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                {col.label}
              </h3>
              <span className="rounded-full bg-fg/[0.06] px-2 py-0.5 text-[11.5px] font-medium text-muted">
                {columnOrders.length}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {columnOrders.map((order) => {
                const ageMs = now === null ? 0 : now - new Date(order.createdAt).getTime();
                const zone = order.tableZone
                  ? ZONE_LABELS_ES[order.tableZone] ?? order.tableZone
                  : null;
                const late = now !== null && ageMs >= LATE_MS;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    draggable
                    onDragStart={() => setDraggingId(order.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    {/* A kitchen ticket, not a dashboard card: opaque paper,
                        a hard top rule that turns red when the ticket is old,
                        and the dish names as the biggest thing on it. */}
                    <article
                      className={`cursor-grab overflow-hidden rounded-2xl border bg-ink-900 shadow-card transition-colors active:cursor-grabbing ${
                        draggingId === order.id ? "opacity-40" : ""
                      } ${late ? "border-accent-400/40" : "border-fg/[0.09]"}`}
                    >
                      <span
                        aria-hidden
                        className={`block h-1 w-full ${
                          late
                            ? "bg-accent-400"
                            : ageMs >= WARN_MS
                              ? "bg-warn/70"
                              : "bg-fg/[0.08]"
                        }`}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-display text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
                              {order.tableName ?? order.customerName}
                            </p>
                            {/* A table already says "dine-in", so the channel
                                label only earns its place when there is no
                                table: delivery and pickup. */}
                            <p className="mt-0.5 truncate text-[11.5px] text-faint">
                              {order.tableName
                                ? (zone ?? "Salón")
                                : orderOriginLabel(order.source, order.channel)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg border px-2 py-1 font-mono text-[13px] font-semibold tabular-nums ${ageTone(ageMs)}`}
                          >
                            {now === null ? "—" : formatDurationMs(ageMs)}
                          </span>
                        </div>

                        {order.source === "online_store" && <div className="mt-3 text-xs leading-relaxed text-muted"><p>{order.customerPhone}</p><p>{order.fulfillmentAddress}{order.deliveryZone ? ` · ${order.deliveryZone}` : ""}</p>{order.deliveryReference && <p>Referencia: {order.deliveryReference}</p>}{order.customerNotes && <p className="font-semibold text-accent-ink">{order.customerNotes}</p>}</div>}
                        <OrderLines items={order.items} />

                        {/* the small print a chef never needs mid-service */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-fg/[0.07] pt-2.5 text-[11px] text-faint">
                          <span className="truncate font-mono tracking-wide">
                            #{order.publicCode ?? ticketNumber(order.id)}
                            {order.serverName ? ` · ${order.serverName}` : ""}
                            {order.paid ? " · Pagado" : ""}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatCurrency(order.total)}
                          </span>
                        </div>

                        {col.status !== "ready" ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              moveOrder(order.id, col.status === "pending" ? "preparing" : "ready")
                            }
                            className="mt-3 h-10 w-full rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[13px] font-semibold text-fg/85 transition-colors hover:bg-fg/[0.09] hover:text-fg disabled:opacity-40"
                          >
                            {col.status === "pending" ? "Empezar" : "Marcar lista"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => moveOrder(order.id, "delivered")}
                            className="mt-3 h-10 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[13px] font-bold text-on-accent disabled:opacity-40"
                          >
                            Entregar
                          </button>
                        )}
                      </div>
                    </article>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {columnOrders.length === 0 && (
              <p className="px-1.5 py-6 text-center text-[13px] text-faint">Sin pedidos</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
