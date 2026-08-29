"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { getKitchenOrders, updateOrderStatus, type KitchenOrder } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { CHANNEL_LABELS, type OrderStatusValue } from "@/lib/orderMeta";
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
    <div className="mt-3 flex flex-col gap-2">
      {rounds.map(([round, lines]) => (
        <div key={round}>
          {multi && (
            <p
              className={`mb-1 text-[10.5px] font-semibold uppercase tracking-wide ${
                round === lastRound ? "text-accent-300" : "text-white/30"
              }`}
            >
              Ronda {round}
              {round === lastRound ? " · nueva" : ""}
            </p>
          )}
          <ul className="flex flex-col gap-1 text-[12.5px] text-white/60">
            {lines.map((item, i) => (
              <li key={i}>
                <span className="text-white/80">
                  {item.quantity}× {item.name}
                </span>
                {item.note && (
                  <span className="mt-0.5 block pl-3 text-[11.5px] italic text-accent-200/80">
                    ↳ {item.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
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
                : "border-white/[0.06] bg-white/[0.015]"
            }`}
          >
            <div className="flex items-center justify-between px-1.5 py-1">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-white/60">
                {col.label}
              </h3>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11.5px] font-medium text-white/50">
                {columnOrders.length}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {columnOrders.map((order) => (
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
                  <GlassCard
                    className={`cursor-grab p-4 active:cursor-grabbing ${
                      draggingId === order.id ? "opacity-40" : ""
                    }`}
                    hoverLift={false}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-white/90">
                          {order.tableName ?? order.customerName}
                        </p>
                        <p className="text-[11.5px] text-white/40">
                          {CHANNEL_LABELS[order.channel]} · #{order.id.slice(-6).toUpperCase()}
                          {order.serverName ? ` · Mozo ${order.serverName}` : ""}
                          {order.paid ? " · Pagado" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 font-mono text-[12px] text-accent-300">
                        {now === null
                          ? "—"
                          : formatDurationMs(now - new Date(order.createdAt).getTime())}
                      </span>
                    </div>

                    <OrderLines items={order.items} />

                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                      <span className="text-[13px] font-medium text-white/75">
                        {formatCurrency(order.total)}
                      </span>
                      {col.status !== "ready" ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            moveOrder(order.id, col.status === "pending" ? "preparing" : "ready")
                          }
                          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                        >
                          {col.status === "pending" ? "Empezar" : "Marcar lista"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => moveOrder(order.id, "delivered")}
                          className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-2.5 py-1 text-[11.5px] font-semibold text-ink-950 disabled:opacity-40"
                        >
                          Entregar
                        </button>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>

            {columnOrders.length === 0 && (
              <p className="px-1.5 py-6 text-center text-[13px] text-white/25">Sin pedidos</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
