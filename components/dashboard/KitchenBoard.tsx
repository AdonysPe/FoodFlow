"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { m, AnimatePresence } from "framer-motion";
import { getKitchenOrders, updateOrderStatus, type KitchenOrder } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { orderOriginLabel, type OrderStatusValue } from "@/lib/orderMeta";
import { ZONE_LABELS_ES } from "@/lib/comandaMeta";
import DeliveryDetails from "@/components/dashboard/DeliveryDetails";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency, formatDurationMs } from "@/lib/format";
import { EASE } from "@/lib/motion";

type BoardStatus = "pending" | "preparing" | "ready";
type BoardOrder = Omit<KitchenOrder, "status"> & { status: OrderStatusValue };

// The prototype's three lanes: what just arrived, what is on the fire, and
// what is waiting on the pass.
const COLUMNS: { status: BoardStatus; label: string; dot: string; action: string; next: OrderStatusValue; empty: string }[] = [
  { status: "pending", label: "Nuevos", dot: "#8a8278", action: "Empezar", next: "preparing", empty: "Sin pedidos nuevos" },
  { status: "preparing", label: "En el fuego", dot: "#f3efe6", action: "Marcar listo", next: "ready", empty: "Nada en el fuego" },
  { status: "ready", label: "Listos para salir", dot: "#ff5a33", action: "Marcar entregado", next: "delivered", empty: "Todo entregado" },
];

const POLL_MS = 4000;

// How long a ticket has been open, read as a colour from across the kitchen.
// A chef should not have to do arithmetic to know which board is burning.
const WARN_MS = 8 * 60 * 1000;
const LATE_MS = 15 * 60 * 1000;

const two = (n: number) => String(n).padStart(2, "0");

/** Short, sayable ticket number — the same one the server sees on the comanda. */
function ticketNumber(id: string) {
  return id.slice(-6).toUpperCase();
}

function OrderLines({ items, ready }: { items: KitchenOrder["items"]; ready: boolean }) {
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
    <div className="lbd-kt-lines">
      {rounds.map(([round, lines]) => {
        const isNew = multi && round === lastRound;
        return (
          <div key={round}>
            {multi && (
              <div className="lbd-kt-round">
                <span className={isNew ? "is-new" : undefined}>Ronda {round}</span>
                {isNew && <em>Nueva</em>}
                <i aria-hidden />
              </div>
            )}
            <ul>
              {lines.map((item, i) => (
                <li key={i}>
                  <div className="lbd-kt-line">
                    <span className="lbd-mono lbd-kt-qty">{item.quantity}×</span>
                    <span className="lbd-kt-name">{item.name}</span>
                  </div>
                  {/* A missed note is a remade plate: it is the second loudest
                      thing on the ticket, after the dish. */}
                  {item.note && <span className={`lbd-kt-note${ready ? " is-ready" : ""}`}>{item.note}</span>}
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

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };
  const oldestMs =
    now === null
      ? null
      : orders
          .filter((o) => o.status === "pending" || o.status === "preparing")
          .reduce<number | null>((max, o) => {
            const age = now - new Date(o.createdAt).getTime();
            return max === null || age > max ? age : max;
          }, null);
  const clock = now === null ? "--:--" : `${two(new Date(now).getHours())}:${two(new Date(now).getMinutes())}`;

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="SERVICIO · COCINA" title="Cocina" description="Los pedidos llegan solos, en orden. Arrastra un ticket o toca su botón para avanzarlo.">
        <span className="lbd-live">
          <i className="lbd-pulse" aria-hidden />
          En vivo
        </span>
        <span className="lbd-mono lbd-kb-clock" aria-label="Hora">
          {clock}
        </span>
      </PageHeader>

      <div className="lbd-kb-kpis lbd-rise" style={{ animationDelay: ".06s" }}>
        <div className="lbd-kb-kpi">
          <span>En cola</span>
          <strong className="lbd-display">{counts.pending}</strong>
        </div>
        <div className="lbd-kb-kpi">
          <span>En el fuego</span>
          <strong className="lbd-display">{counts.preparing}</strong>
        </div>
        <div className="lbd-kb-kpi">
          <span>Listos para salir</span>
          <strong className="lbd-display" style={{ color: "#ff7a57" }}>
            {counts.ready}
          </strong>
        </div>
        <div className="lbd-kb-kpi">
          <span>Más antiguo</span>
          <strong className="lbd-mono" style={{ fontSize: 22, fontWeight: 500, color: oldestMs !== null && oldestMs >= LATE_MS ? "#ff5a33" : "#f3efe6" }}>
            {oldestMs === null ? "—" : formatDurationMs(oldestMs)}
          </strong>
        </div>
      </div>

      <div className="lbd-kb-board">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status);
          const ready = col.status === "ready";
          return (
            <section
              key={col.status}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={() => handleDrop(col.status)}
              className={`lbd-kb-col${dragOverStatus === col.status ? " is-over" : ""}`}
            >
              <div className="lbd-kb-col-head">
                <span>
                  <i style={{ background: col.dot }} aria-hidden />
                  {col.label}
                </span>
                <span className="lbd-mono">{columnOrders.length}</span>
              </div>

              <AnimatePresence initial={false}>
                {columnOrders.map((order) => {
                  const ageMs = now === null ? 0 : now - new Date(order.createdAt).getTime();
                  const zone = order.tableZone ? ZONE_LABELS_ES[order.tableZone] ?? order.tableZone : null;
                  const late = !ready && now !== null && ageMs >= LATE_MS;
                  const warn = !ready && now !== null && ageMs >= WARN_MS && !late;
                  const pct = Math.min(100, Math.round((ageMs / LATE_MS) * 100));

                  return (
                    <m.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: -14, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      draggable
                      onDragStart={() => setDraggingId(order.id)}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <article className={`lbd-kt${ready ? " is-ready" : ""}${late ? " is-late" : ""}${draggingId === order.id ? " is-drag" : ""}`}>
                        <div className="lbd-kt-head">
                          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
                            <span className="lbd-display lbd-kt-label lbd-trunc">{order.tableName ?? order.customerName}</span>
                            {/* A table already says "dine-in", so the channel
                                label only earns its place when there is no
                                table: delivery and pickup. */}
                            <span className="lbd-kt-source lbd-trunc">{order.tableName ? (zone ?? "Salón") : orderOriginLabel(order.source, order.channel)}</span>
                          </span>
                          <span className="lbd-mono lbd-kt-time" style={{ color: late ? "#ff5a33" : warn ? "#ffb37a" : undefined }}>
                            {now === null ? "—" : formatDurationMs(ageMs)}
                          </span>
                        </div>

                        <div className="lbd-kt-track">
                          <div style={{ width: `${ready ? 100 : pct}%`, background: ready ? "#1c1a18" : late ? "#ff5a33" : "#f3efe6" }} />
                        </div>

                        {order.source === "online_store" && <DeliveryDetails order={order} className="lbd-kt-delivery" highlightNotes />}
                        <OrderLines items={order.items} ready={ready} />

                        {/* the small print a chef never needs mid-service */}
                        <div className="lbd-kt-foot">
                          <span className="lbd-mono lbd-trunc">
                            #{order.publicCode ?? ticketNumber(order.id)}
                            {order.serverName ? ` · ${order.serverName}` : ""}
                            {order.paid ? " · Pagado" : ""}
                          </span>
                          <span style={{ flexShrink: 0 }}>{formatCurrency(order.total)}</span>
                        </div>

                        <button type="button" disabled={isPending} onClick={() => moveOrder(order.id, col.next)} className={`lbd-kt-btn is-${col.status}`}>
                          {col.action}
                        </button>
                      </article>
                    </m.div>
                  );
                })}
              </AnimatePresence>

              {columnOrders.length === 0 && <div className="lbd-kb-empty">{col.empty}</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
