import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PageHeader from "@/components/dashboard/PageHeader";
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
      include: { table: { select: { name: true } } },
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
    tableName: o.table?.name ?? null,
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

  const SOURCES = [
    ["all", "Todos"],
    ["mesa", "Mesa"],
    ["web", "Web"],
    ["delivery", "Delivery"],
    ["pickup", "Recojo"],
  ] as const;

  return (
    <div className="lbd-pg">
      <AutoRefresh intervalMs={8000} />
      <PageHeader eyebrow="SERVICIO · PEDIDOS" title="Pedidos" description="Salón, QR, web y delivery en una sola lista. Se actualiza sola.">
        <span className="lbd-live">
          <i className="lbd-pulse" aria-hidden />
          En vivo
        </span>
        <NewOrderForm menuItems={menuItems} />
      </PageHeader>

      <div className="lbd-filters lbd-rise" style={{ animationDelay: ".04s" }}>
        <nav className="lbd-seg" aria-label="Rango de fechas">
          {RANGES.map((r) => (
            <Link key={r.key} href={`/dashboard/app/orders?range=${r.key}&source=${source}`} aria-current={range === r.key ? "page" : undefined} className={range === r.key ? "is-on" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
        <nav className="lbd-seg" aria-label="Origen de pedidos">
          {SOURCES.map(([key, label]) => (
            <Link key={key} href={`/dashboard/app/orders?range=${range}&source=${key}`} aria-current={source === key ? "page" : undefined} className={source === key ? "is-on" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard/app/configuracion/facturacion" className="lbd-link" style={{ marginLeft: "auto" }}>
          Configurar facturación ›
        </Link>
      </div>

      <OrdersTable orders={rows} venueName={restaurant.name} receiptSettings={receiptSettings} billing={billing} />
    </div>
  );
}
