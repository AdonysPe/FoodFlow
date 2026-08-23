"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  { status: "pending", label: "Pending" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
];

const POLL_MS = 4000;

export default function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  const [orders, setOrders] = useState<BoardOrder[]>(initialOrders);
  const [now, setNow] = useState(() => Date.now());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<BoardStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  // Muted after a local move so the next poll tick doesn't briefly snap the
  // card back before the server action has actually landed.
  const suppressPollUntil = useRef(0);

  useEffect(() => {
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
                          {order.customerName}
                        </p>
                        <p className="text-[11.5px] text-white/40">
                          {CHANNEL_LABELS[order.channel]} · #{order.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 font-mono text-[12px] text-accent-300">
                        {formatDurationMs(now - new Date(order.createdAt).getTime())}
                      </span>
                    </div>
                    <ul className="mt-3 flex flex-col gap-1 text-[12.5px] text-white/60">
                      {order.items.map((item, i) => (
                        <li key={i}>
                          {item.quantity}× {item.name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                      <span className="text-[13px] font-medium text-white/75">
                        {formatCurrency(order.total)}
                      </span>
                      {col.status !== "ready" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            moveOrder(order.id, col.status === "pending" ? "preparing" : "ready")
                          }
                          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                        >
                          {col.status === "pending" ? "Start" : "Mark ready"}
                        </button>
                      )}
                      {col.status === "ready" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => moveOrder(order.id, "delivered")}
                          className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-2.5 py-1 text-[11.5px] font-semibold text-ink-950 disabled:opacity-40"
                        >
                          Deliver
                        </button>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>

            {columnOrders.length === 0 && (
              <p className="px-1.5 py-6 text-center text-[13px] text-white/25">No orders</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
