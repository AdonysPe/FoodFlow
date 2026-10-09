import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import CustomersTable, { type CustomerRow } from "@/components/dashboard/CustomersTable";
import PlanGate from "@/components/dashboard/PlanGate";
import PageHeader from "@/components/dashboard/PageHeader";

export const metadata = {
  title: "Clientes",
};

type Line = { name?: string; quantity?: number };

const CHANNEL_LABELS: Record<string, string> = {
  dine_in: "Salón",
  delivery: "Delivery",
  pickup: "Para llevar",
};

export default async function CustomersPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("customers");
  if (!allowed) return <PlanGate feature="customers" plan={plan} />;
  if (!restaurant) return null;

  const [customers, orderStats, recentOrders] = await Promise.all([
    prisma.customer.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["customerName"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
      _sum: { total: true },
    }),
    // What each customer orders and when: read from their latest orders, so
    // the detail panel can show favourites, last visit and usual channel.
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, voidedAt: null },
      orderBy: { createdAt: "desc" },
      take: 4000,
      select: { customerName: true, items: true, createdAt: true, channel: true, source: true },
    }),
  ]);

  const statsByName = new Map(orderStats.map((s) => [s.customerName.toLowerCase(), s]));

  const detailByName = new Map<string, { last: Date; dishes: Map<string, number>; channels: Map<string, number> }>();
  for (const order of recentOrders) {
    const key = order.customerName.toLowerCase();
    let detail = detailByName.get(key);
    if (!detail) {
      detail = { last: order.createdAt, dishes: new Map(), channels: new Map() };
      detailByName.set(key, detail);
    }
    const channel = order.source === "online_store" ? `Web · ${order.channel === "delivery" ? "delivery" : "recojo"}` : (CHANNEL_LABELS[order.channel] ?? order.channel);
    detail.channels.set(channel, (detail.channels.get(channel) ?? 0) + 1);
    if (Array.isArray(order.items)) {
      for (const line of order.items as Line[]) {
        if (!line?.name) continue;
        detail.dishes.set(line.name, (detail.dishes.get(line.name) ?? 0) + (line.quantity ?? 1));
      }
    }
  }

  const rows: CustomerRow[] = customers
    .map((c) => {
      const stats = statsByName.get(c.name.toLowerCase());
      const detail = detailByName.get(c.name.toLowerCase());
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        ordersCount: stats?._count.id ?? 0,
        totalSpent: stats?._sum.total ?? 0,
        since: c.createdAt.toISOString(),
        lastOrderAt: detail?.last.toISOString() ?? null,
        favourites: detail ? [...detail.dishes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })) : [],
        channel: detail ? [...detail.channels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="NEGOCIO · CLIENTES" title="Clientes" description="Quién te pide, cuánto y qué. Se llena solo con cada pedido web, delivery y reserva." />
      <CustomersTable customers={rows} />
    </div>
  );
}
