"use client";

import { useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import PaymentSheet from "@/components/dashboard/comanda/PaymentSheet";
import type { ReceiptSettingsDTO } from "@/lib/receipt";
import type { TillBillingState } from "@/lib/db/billing";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import StatusPill from "@/components/dashboard/StatusPill";
import DeliveryDetails from "@/components/dashboard/DeliveryDetails";
import { IconPrinter } from "@/components/ui/Icons";
import { updateOrderStatus } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  orderOriginLabel,
  ORDER_STATUS_LABELS,
  nextStatus,
  type OrderStatusValue,
} from "@/lib/orderMeta";
import { PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/paymentMeta";
import { formatCurrency } from "@/lib/format";
import type { OrderItemInput, OrderChannel } from "@/lib/actions/orders";

export type OrderRow = {
  id: string;
  source: string | null;
  publicCode: string | null;
  customerPhone: string | null;
  fulfillmentAddress: string | null;
  deliveryZone: string | null;
  deliveryReference: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerNotes: string | null;
  deliveryFee: number;
  createdAt: string;
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

export default function OrdersTable({ orders, venueName, receiptSettings, billing }: { orders: OrderRow[]; venueName: string; receiptSettings: ReceiptSettingsDTO; billing: TillBillingState }) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const router = useRouter();
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

  const paying = orders.find(o => o.id === payingId && !o.paid && !o.voided);
  if (paying) return <PaymentSheet venueName={venueName} receiptSettings={receiptSettings} billing={billing} autoPrint={receiptSettings.autoPrint} onBack={() => setPayingId(null)} onPaid={() => { setPayingId(null); router.refresh(); }} tab={{ orderId: paying.id, tableId: "", tableName: orderOriginLabel(paying.source, paying.channel), customerName: paying.customerName, tableZone: null, lines: [...paying.items, ...(paying.deliveryFee ? [{ name: "Servicio de delivery", price: paying.deliveryFee, quantity: 1 }] : [])], total: paying.total, roundNumber: 1, kitchenStatus: paying.status, serverName: null, openedAt: paying.createdAt }} />;

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
                    #{order.publicCode ?? order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-5 py-3.5 text-fg/85">
                    <p>{order.customerName}</p>
                    <p className="text-[12px] text-faint">
                      {orderOriginLabel(order.source, order.channel)} · {order.createdAtLabel}
                    </p>
                    {order.source === "online_store" && <DeliveryDetails order={order} className="mt-2 max-w-xs" />}
                  </td>
                  <td className="max-w-[220px] px-5 py-3.5 text-muted">
                    {order.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-fg/85">
                    {formatCurrency(order.total)}
                    {order.deliveryFee > 0 && <small className="block text-faint">Delivery: {formatCurrency(order.deliveryFee)}</small>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <PaymentCell row={order} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {order.source === "online_store" && !order.paid && !order.voided && <button type="button" className="rounded-lg border border-fg/10 px-3 py-2 text-xs" onClick={() => setPayingId(order.id)}>Cobrar</button>}
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
