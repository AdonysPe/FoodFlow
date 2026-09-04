import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import StatTile from "@/components/dashboard/StatTile";
import StatusPill from "@/components/dashboard/StatusPill";
import ChannelBars from "@/components/dashboard/ChannelBars";
import AreaChart from "@/components/dashboard/AreaChart";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import GlassCard from "@/components/ui/GlassCard";
import { IconBolt, IconOrders, IconTarget, IconClock } from "@/components/ui/Icons";
import CartaOverview from "@/components/dashboard/CartaOverview";
import { CHANNEL_LABELS } from "@/lib/orderMeta";
import { formatCurrency, formatTimeLabel } from "@/lib/format";
import { planAllows, type PlanValue } from "@/lib/plans";

export const metadata = {
  title: "Resumen",
};

function startOfDay(daysAgo = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function OverviewPage() {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const plan = restaurant.plan as PlanValue;

  // Without the orders module there is nothing to total up, so the Carta plan
  // gets a menu-shaped overview instead of four zeroed sales tiles.
  if (!planAllows(plan, "orders")) {
    const [items, categoryCount] = await Promise.all([
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id },
        select: { id: true, name: true, available: true },
        orderBy: { name: "asc" },
      }),
      prisma.menuCategory.count({ where: { restaurantId: restaurant.id } }),
    ]);

    return (
      <CartaOverview
        restaurantName={restaurant.name}
        plan={plan}
        itemCount={items.length}
        availableCount={items.filter((i) => i.available).length}
        categoryCount={categoryCount}
        soldOut={items.filter((i) => !i.available).map((i) => ({ id: i.id, name: i.name }))}
      />
    );
  }

  const todayStart = startOfDay(0);
  const sevenDaysAgoStart = startOfDay(6);

  const [ordersToday, ordersLast7Days, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: todayStart }, voidedAt: null },
    }),
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: { gte: sevenDaysAgoStart },
        voidedAt: null,
      },
      select: { total: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, voidedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const totalSalesToday = ordersToday.reduce((sum, o) => sum + o.total, 0);
  const orderCountToday = ordersToday.length;
  const avgTicket = orderCountToday > 0 ? totalSalesToday / orderCountToday : 0;

  const readyToday = ordersToday.filter((o) => o.readyAt);
  const avgPrepMs =
    readyToday.length > 0
      ? readyToday.reduce((sum, o) => sum + (o.readyAt!.getTime() - o.createdAt.getTime()), 0) /
        readyToday.length
      : 0;

  const dayBuckets: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = startOfDay(i);
    const nextDay = startOfDay(i - 1);
    const total = ordersLast7Days
      .filter((o) => o.createdAt >= day && o.createdAt < nextDay)
      .reduce((sum, o) => sum + o.total, 0);
    dayBuckets.push({ label: day.toLocaleDateString("es-PE", { weekday: "short" }), total });
  }

  const channelData = (["dine_in", "delivery", "pickup"] as const).map((channel) => ({
    label: CHANNEL_LABELS[channel],
    count: ordersToday.filter((o) => o.channel === channel).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={10000} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Ventas de hoy"
          value={totalSalesToday}
          prefix="S/ "
          decimals={2}
          icon={<IconBolt className="h-4 w-4" />}
        />
        <StatTile label="Pedidos de hoy" value={orderCountToday} icon={<IconOrders className="h-4 w-4" />} />
        <StatTile
          label="Ticket promedio"
          value={avgTicket}
          prefix="S/ "
          decimals={2}
          icon={<IconTarget className="h-4 w-4" />}
        />
        <StatTile
          label="Tiempo prep. (min)"
          value={avgPrepMs / 60000}
          decimals={1}
          icon={<IconClock className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 sm:p-6 lg:col-span-2" hoverLift={false}>
          <h2 className="mb-1 text-[15px] font-semibold text-fg/90">Ventas en el tiempo</h2>
          <p className="mb-4 text-[12.5px] text-fg/40">Últimos 7 días</p>
          <AreaChart data={dayBuckets.map((d) => d.total)} labels={dayBuckets.map((d) => d.label)} />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="mb-4 text-[15px] font-semibold text-fg/90">Pedidos por canal</h2>
          <ChannelBars data={channelData} />
        </GlassCard>
      </div>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-fg/90">Pedidos recientes</h2>
          <Link
            href="/dashboard/app/orders"
            className="text-[13px] font-medium text-accent-icon hover:text-accent-ink"
          >
            Ver todos
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-fg/40">
            Aún no hay pedidos. Los nuevos pedidos aparecerán aquí.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-fg/[0.05]">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-fg/80">{order.customerName}</p>
                  <p className="text-[12px] text-fg/40">
                    {CHANNEL_LABELS[order.channel]} · {formatTimeLabel(order.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[13.5px] font-medium text-fg/85">
                    {formatCurrency(order.total)}
                  </span>
                  <StatusPill status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
