"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import StatusPill from "@/components/dashboard/StatusPill";
import { IconPrinter } from "@/components/ui/Icons";
import { updateOrderStatus } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  CHANNEL_LABELS,
  ORDER_STATUS_LABELS,
  nextStatus,
  type OrderStatusValue,
} from "@/lib/orderMeta";
import { PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/paymentMeta";
import { formatCurrency } from "@/lib/format";
import type { OrderItemInput, OrderChannel } from "@/lib/actions/orders";

export type OrderRow = {
  id: string;
  customerName: string;
  items: OrderItemInput[];
  total: number;
  channel: OrderChannel;
  status: OrderStatusValue;
  paymentMethod: PaymentMethodValue | null;
  paid: boolean;
  voided: boolean;
  createdAtLabel: string;
};

function PaymentCell({ row }: { row: OrderRow }) {
  if (row.voided) {
    return (
      <span className="inline-flex items-center rounded-full bg-fg/[0.06] px-2.5 py-1 text-[12px] font-medium text-faint ring-1 ring-inset ring-fg/15">
        Anulado
      </span>
    );
  }
  if (row.paid) {
    return (
      <span className="inline-flex items-center rounded-full bg-mint/10 px-2.5 py-1 text-[12px] font-medium text-mint-ink ring-1 ring-inset ring-mint/25">
        {row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : "Cobrado"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-accent-400/10 px-2.5 py-1 text-[12px] font-medium text-accent-ink ring-1 ring-inset ring-accent-400/25">
      Por cobrar
    </span>
  );
}

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
        result.ok ? `Pedido marcado como ${ORDER_STATUS_LABELS[status].toLowerCase()}.` : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  if (orders.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-faint" hoverLift={false}>
        No hay pedidos en este rango.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-fg/[0.07] text-[12px] uppercase tracking-wide text-faint">
              <th className="px-5 py-3.5 font-medium">Pedido</th>
              <th className="px-5 py-3.5 font-medium">Cliente</th>
              <th className="px-5 py-3.5 font-medium">Platos</th>
              <th className="px-5 py-3.5 font-medium">Total</th>
              <th className="px-5 py-3.5 font-medium">Cocina</th>
              <th className="px-5 py-3.5 font-medium">Pago</th>
              <th className="px-5 py-3.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {optimisticOrders.map((order) => {
              const upcoming = nextStatus(order.status);
              return (
                <tr key={order.id} className="border-b border-fg/[0.04] align-top last:border-0">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-faint">
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-5 py-3.5 text-fg/85">
                    <p>{order.customerName}</p>
                    <p className="text-[12px] text-faint">
                      {CHANNEL_LABELS[order.channel]} · {order.createdAtLabel}
                    </p>
                  </td>
                  <td className="max-w-[220px] px-5 py-3.5 text-muted">
                    {order.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-fg/85">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <PaymentCell row={order} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {upcoming ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleAdvance(order.id, upcoming)}
                          className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          Marcar {ORDER_STATUS_LABELS[upcoming].toLowerCase()}
                        </button>
                      ) : null}
                      {/* Reprint: the copy a diner asks for after leaving the table. */}
                      {order.paid ? (
                        <Link
                          href={`/dashboard/boleta/${order.id}?from=orders`}
                          title="Ver boleta"
                          aria-label={`Ver boleta de ${order.customerName}`}
                          className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] p-1.5 text-faint transition-colors hover:bg-fg/[0.08] hover:text-fg"
                        >
                          <IconPrinter className="h-[15px] w-[15px]" />
                        </Link>
                      ) : null}
                      {!upcoming && !order.paid ? (
                        <span className="text-[12px] text-faint">—</span>
                      ) : null}
                    </div>
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
