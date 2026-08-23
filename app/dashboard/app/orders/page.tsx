import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import OrdersTable, { type OrderRow } from "@/components/dashboard/OrdersTable";
import NewOrderForm from "@/components/dashboard/NewOrderForm";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import type { OrderItemInput } from "@/lib/actions/orders";

export const metadata = {
  title: "Pedidos",
};

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
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
  searchParams: Promise<{ range?: string }>;
}) {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const { range: rawRange } = await searchParams;
  const range = RANGES.some((r) => r.key === rawRange) ? (rawRange as string) : "today";

  const [orders, menuItems] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: rangeStart(range) } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    items: o.items as OrderItemInput[],
    total: o.total,
    channel: o.channel,
    status: o.status,
    createdAtLabel: o.createdAt.toLocaleString("en-US", {
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

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/dashboard/app/orders?range=${r.key}`}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              range === r.key
                ? "bg-white/[0.09] text-white"
                : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <OrdersTable orders={rows} />
    </div>
  );
}
