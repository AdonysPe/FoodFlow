import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import OrdersTable, { type OrderRow } from "@/components/dashboard/OrdersTable";
import NewOrderForm from "@/components/dashboard/NewOrderForm";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import type { OrderItemInput } from "@/lib/actions/orders";
import { readReceiptSettings } from "@/lib/db/receiptSettings";
import { readTillBillingState } from "@/lib/db/billing";

export const metadata = {
  title: "Pedidos",
};

const RANGES = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
] as const;

function rangeStart(range: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - d.getDay());
  if (range === "month") d.setDate(1);
  return d;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; source?: string }>;
}) {
  const { restaurant, plan, allowed } = await requirePlanFeature("orders");
  if (!allowed) return <PlanGate feature="orders" plan={plan} />;
  if (!restaurant) return null;

  const { range: rawRange, source = "all" } = await searchParams;
  const range = RANGES.some((r) => r.key === rawRange) ? (rawRange as string) : "today";

  const sourceFilter: Prisma.OrderWhereInput = source === "web" ? { source: "online_store" } : source === "mesa" ? { channel: "dine_in" } : source === "delivery" || source === "pickup" ? { channel: source } : {};
  const [orders, menuItems, receiptSettings, billing] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: rangeStart(range) }, ...sourceFilter },
      orderBy: { createdAt: "desc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, available: true },
      orderBy: { name: "asc" },
    }),
    readReceiptSettings(restaurant.id),
    readTillBillingState(restaurant.id),
  ]);

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    source: o.source,
    publicCode: o.publicToken?.slice(0, 10).toUpperCase() ?? null,
    customerPhone: o.customerPhone,
    fulfillmentAddress: o.fulfillmentAddress,
    deliveryZone: o.deliveryZone,
    deliveryReference: o.deliveryReference,
    deliveryLatitude: o.deliveryLatitude,
    deliveryLongitude: o.deliveryLongitude,
    customerNotes: o.customerNotes,
    deliveryFee: o.deliveryFee,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName,
    items: o.items as OrderItemInput[],
    total: o.total,
    channel: o.channel,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paid: o.paidAt != null,
    voided: o.voidedAt != null,
    createdAtLabel: o.createdAt.toLocaleString("es-PE", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={8000} />
      <NewOrderForm menuItems={menuItems} />

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/dashboard/app/orders?range=${r.key}&source=${source}`}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              range === r.key
                ? "bg-fg/[0.09] text-fg"
                : "text-muted hover:bg-fg/[0.05] hover:text-fg/80"
            }`}
          >
            {r.label}
          </Link>
        ))}
        <Link
          href="/dashboard/app/configuracion/facturacion"
          className="ml-auto rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-fg/[0.08] hover:text-fg"
        >
          Configurar facturación
        </Link>
      </div>

      <nav aria-label="Origen de pedidos" className="flex flex-wrap gap-2">{[["all", "Todos"], ["mesa", "Mesa"], ["web", "Web"], ["delivery", "Delivery"], ["pickup", "Recojo"]].map(([key, label]) => <Link key={key} href={`/dashboard/app/orders?range=${range}&source=${key}`} aria-current={source === key ? "page" : undefined} className={`rounded-lg px-4 py-2 text-sm ${source === key ? "bg-fg/10 text-fg" : "text-muted"}`}>{label}</Link>)}</nav>
      <OrdersTable orders={rows} venueName={restaurant.name} receiptSettings={receiptSettings} billing={billing} />
    </div>
  );
}
