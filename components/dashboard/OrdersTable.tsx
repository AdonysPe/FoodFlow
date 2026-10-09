"use client";

import { useMemo, useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaymentSheet from "@/components/dashboard/comanda/PaymentSheet";
import DeliveryDetails from "@/components/dashboard/DeliveryDetails";
import type { ReceiptSettingsDTO } from "@/lib/receipt";
import type { TillBillingState } from "@/lib/db/billing";
import { updateOrderStatus } from "@/lib/actions/orders";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  orderOriginLabel,
  ORDER_STATUS_LABELS,
  STATUS_FLOW,
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
  tableName: string | null;
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

// The kitchen status as the prototype draws it: soft vermilion while it waits,
// an outline while it cooks, mint when it is ready, quiet once it is served.
const STATUS_TONE: Record<OrderStatusValue, string> = {
  pending: "is-pending",
  preparing: "is-preparing",
  ready: "is-ready",
  delivered: "is-delivered",
};

const STEP_LABELS = ["Recibido", "En cocina", "Lista", "Entregada"];

function codeOf(order: OrderRow) {
  return `#${order.publicCode ?? order.id.slice(-6).toUpperCase()}`;
}

function whereOf(order: OrderRow) {
  return order.channel === "dine_in" && order.source !== "online_store" && order.tableName
    ? order.tableName
    : orderOriginLabel(order.source, order.channel);
}

function payState(order: OrderRow): { label: string; tone: "ok" | "due" | "void"; method: string } {
  if (order.voided) return { label: "Anulado", tone: "void", method: "—" };
  const method = order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] : "Por definir";
  return order.paid ? { label: "Pagado", tone: "ok", method } : { label: "Por cobrar", tone: "due", method };
}

function StatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span className={`lbd-or-status ${STATUS_TONE[status]}`}>
      <i aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export default function OrdersTable({
  orders,
  venueName,
  receiptSettings,
  billing,
}: {
  orders: OrderRow[];
  venueName: string;
  receiptSettings: ReceiptSettingsDTO;
  billing: TillBillingState;
}) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | OrderStatusValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const counts = useMemo(() => {
    const byStatus: Record<OrderStatusValue, number> = { pending: 0, preparing: 0, ready: 0, delivered: 0 };
    for (const o of optimisticOrders) byStatus[o.status] += 1;
    return byStatus;
  }, [optimisticOrders]);

  const shown = optimisticOrders.filter((o) => filter === "all" || o.status === filter);
  const selected = shown.find((o) => o.id === selectedId) ?? shown[0] ?? null;

  const paying = orders.find((o) => o.id === payingId && !o.paid && !o.voided);
  if (paying)
    return (
      <PaymentSheet
        venueName={venueName}
        receiptSettings={receiptSettings}
        billing={billing}
        autoPrint={receiptSettings.autoPrint}
        onBack={() => setPayingId(null)}
        onPaid={() => {
          setPayingId(null);
          router.refresh();
        }}
        tab={{
          orderId: paying.id,
          tableId: "",
          tableName: orderOriginLabel(paying.source, paying.channel),
          customerName: paying.customerName,
          tableZone: null,
          lines: [...paying.items, ...(paying.deliveryFee ? [{ name: "Servicio de delivery", price: paying.deliveryFee, quantity: 1 }] : [])],
          total: paying.total,
          roundNumber: 1,
          kitchenStatus: paying.status,
          serverName: null,
          openedAt: paying.createdAt,
        }}
      />
    );

  if (orders.length === 0) {
    return <div className="lbd-empty">No hay pedidos en este rango.</div>;
  }

  const tabs: { key: "all" | OrderStatusValue; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: optimisticOrders.length },
    ...STATUS_FLOW.map((key) => ({ key, label: ORDER_STATUS_LABELS[key], count: counts[key] })),
  ];

  return (
    <>
      <div className="lbd-chips lbd-rise" style={{ animationDelay: ".06s" }} role="group" aria-label="Filtrar por estado">
        {tabs.map((t) => (
          <button key={t.key} type="button" aria-pressed={filter === t.key} className={`lbd-chip-btn${filter === t.key ? " is-on" : ""}`} onClick={() => setFilter(t.key)}>
            {t.label}
            <span className="lbd-mono">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="lbd-or">
        <section className="lbd-card lbd-rise lbd-or-list" style={{ animationDelay: ".1s" }} aria-label="Lista de pedidos">
          <div className="lbd-or-scroll">
            <div className="lbd-or-grid lbd-or-head lbd-mono" aria-hidden>
              <span>PEDIDO</span>
              <span>CLIENTE</span>
              <span>PLATOS</span>
              <span style={{ textAlign: "right" }}>TOTAL</span>
              <span>COCINA</span>
              <span>PAGO</span>
            </div>
            {shown.map((order) => {
              const pay = payState(order);
              return (
                <button key={order.id} type="button" aria-pressed={selected?.id === order.id} className={`lbd-or-grid lbd-or-row${selected?.id === order.id ? " is-on" : ""}`} onClick={() => setSelectedId(order.id)}>
                  <span className="lbd-or-cell">
                    <span className="lbd-mono lbd-or-code">{codeOf(order)}</span>
                    <span className="lbd-or-sub">{order.createdAtLabel}</span>
                  </span>
                  <span className="lbd-or-cell" style={{ minWidth: 0 }}>
                    <span className="lbd-or-main lbd-trunc">{whereOf(order)}</span>
                    <span className="lbd-or-sub lbd-trunc">{order.customerName}</span>
                  </span>
                  <span className="lbd-or-items lbd-trunc">{order.items.map((it) => `${it.quantity} ${it.name}`).join(", ")}</span>
                  <span className="lbd-or-total">{formatCurrency(order.total)}</span>
                  <span>
                    <StatusBadge status={order.status} />
                  </span>
                  <span className="lbd-or-cell">
                    <span style={{ fontSize: 13 }}>{pay.method}</span>
                    <span className={`lbd-or-pay is-${pay.tone}`}>{pay.label}</span>
                  </span>
                </button>
              );
            })}
            {shown.length === 0 && <div className="lbd-empty" style={{ border: 0 }}>No hay pedidos en este estado.</div>}
          </div>
        </section>

        {selected && <OrderDetail key={selected.id} order={selected} pending={isPending} onAdvance={handleAdvance} onCharge={() => setPayingId(selected.id)} />}
      </div>
    </>
  );
}

function OrderDetail({
  order,
  pending,
  onAdvance,
  onCharge,
}: {
  order: OrderRow;
  pending: boolean;
  onAdvance: (id: string, status: OrderStatusValue) => void;
  onCharge: () => void;
}) {
  const upcoming = nextStatus(order.status);
  const pay = payState(order);
  const step = STATUS_FLOW.indexOf(order.status);
  const online = order.source === "online_store";
  const canCharge = online && !order.paid && !order.voided;

  return (
    <aside className="lbd-card lbd-card--glass lbd-or-detail lbd-swap" aria-label="Detalle del pedido">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="lbd-mono" style={{ fontSize: 12, color: "#a39b90" }}>
            {codeOf(order)} · {order.createdAtLabel}
          </span>
          <span className="lbd-display" style={{ fontSize: 28, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {whereOf(order)}
          </span>
          <span style={{ fontSize: 13, color: "#a39b90" }}>{order.customerName}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="lbd-or-steps">
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="lbd-or-bar" style={{ background: i <= step ? "#ff5a33" : "rgba(243,239,230,0.1)" }} />
            <span style={{ fontSize: 10, color: i <= step ? "#f3efe6" : "#8a8278" }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="lbd-or-lines">
        {order.items.map((it, i) => (
          <div key={i} className="lbd-or-line">
            <span>
              <span className="lbd-mono" style={{ color: "#a39b90" }}>
                {it.quantity}×
              </span>{" "}
              {it.name}
            </span>
            <span style={{ color: "#cfc7bb" }}>{formatCurrency(it.price * it.quantity)}</span>
          </div>
        ))}
        {order.deliveryFee > 0 && (
          <div className="lbd-or-line" style={{ fontSize: 13, color: "#a39b90" }}>
            <span>Delivery{order.deliveryZone ? ` · ${order.deliveryZone}` : ""}</span>
            <span>{formatCurrency(order.deliveryFee)}</span>
          </div>
        )}
        <div className="lbd-or-total-row">
          <span style={{ fontSize: 14, color: "#a39b90" }}>Total</span>
          <span className="lbd-display" style={{ fontSize: 30, letterSpacing: "-0.04em" }}>
            {formatCurrency(order.total)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#a39b90" }}>Pago · {pay.method}</span>
          <span className={`lbd-or-pay is-${pay.tone}`}>{pay.label}</span>
        </div>
      </div>

      {online && <DeliveryDetails order={order} className="lbd-or-delivery" highlightNotes />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        {upcoming && !order.voided && (
          <button type="button" disabled={pending} onClick={() => onAdvance(order.id, upcoming)} className="lbd-btn lbd-btn--solid">
            Marcar {ORDER_STATUS_LABELS[upcoming].toLowerCase()}
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {canCharge && (
            <button type="button" onClick={onCharge} className="lbd-btn lbd-btn--ghost" style={{ flex: 1 }}>
              Cobrar
            </button>
          )}
          {order.paid && (
            <Link href={`/dashboard/boleta/${order.id}?from=orders`} className="lbd-btn lbd-btn--ghost" style={{ flex: 1 }}>
              Ver boleta
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
