"use client";

import { useOptimistic, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusPill from "@/components/dashboard/StatusPill";
import { updateOrderStatus } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { CHANNEL_LABELS, nextStatus, type OrderStatusValue } from "@/lib/orderMeta";
import { formatCurrency } from "@/lib/format";
import type { OrderItemInput, OrderChannel } from "@/lib/actions/orders";

export type OrderRow = {
  id: string;
  customerName: string;
  items: OrderItemInput[];
  total: number;
  channel: OrderChannel;
  status: OrderStatusValue;
  createdAtLabel: string;
};

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [optimisticOrders, applyOptimistic] = useOptimistic(
    orders,
    (state, update: { id: string; status: OrderStatusValue }) =>
      state.map((o) => (o.id === update.id ? { ...o, status: update.status } : o))
  );

  function handleAdvance(id: string, status: OrderStatusValue) {
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await updateOrderStatus(id, status);
      pushToast(
        result.ok ? `Order marked ${status}.` : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  if (orders.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No orders in this range.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Order</th>
              <th className="px-5 py-3.5 font-medium">Customer</th>
              <th className="px-5 py-3.5 font-medium">Items</th>
              <th className="px-5 py-3.5 font-medium">Total</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticOrders.map((order) => {
              const upcoming = nextStatus(order.status);
              return (
                <tr key={order.id} className="border-b border-white/[0.04] align-top last:border-0">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-white/45">
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-5 py-3.5 text-white/85">
                    <p>{order.customerName}</p>
                    <p className="text-[12px] text-white/40">
                      {CHANNEL_LABELS[order.channel]} · {order.createdAtLabel}
                    </p>
                  </td>
                  <td className="max-w-[220px] px-5 py-3.5 text-white/55">
                    {order.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white/85">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {upcoming ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAdvance(order.id, upcoming)}
                        className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Mark {upcoming}
                      </button>
                    ) : (
                      <span className="text-[12px] text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
