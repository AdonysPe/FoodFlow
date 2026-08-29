import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import GlassCard from "@/components/ui/GlassCard";
import AreaChart from "@/components/dashboard/AreaChart";
import ChannelBars from "@/components/dashboard/ChannelBars";
import { formatCurrency } from "@/lib/format";
import type { OrderItemInput } from "@/lib/actions/orders";

export const metadata = {
  title: "Análisis",
};

function startOfDay(daysAgo = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export default async function AnalyticsPage() {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const thirtyDaysAgo = startOfDay(29);

  const [orders, customerCount, orderStatsByCustomer] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: thirtyDaysAgo }, voidedAt: null },
    }),
    prisma.customer.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.groupBy({
      by: ["customerName"],
      where: { restaurantId: restaurant.id, voidedAt: null },
      _count: { id: true },
    }),
  ]);

  const dayBuckets: number[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = startOfDay(i);
    const nextDay = startOfDay(i - 1);
    const total = orders
      .filter((o) => o.createdAt >= day && o.createdAt < nextDay)
      .reduce((sum, o) => sum + o.total, 0);
    dayBuckets.push(total);
  }

  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const order of orders) {
    const items = order.items as OrderItemInput[];
    for (const item of items) {
      const current = productTotals.get(item.name) ?? { quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      productTotals.set(item.name, current);
    }
  }
  const topProducts = [...productTotals.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const order of orders) hourCounts[order.createdAt.getHours()] += 1;
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const repeatCustomers = orderStatsByCustomer.filter((c) => c._count.id > 1).length;
  const repeatRate = customerCount > 0 ? (repeatCustomers / customerCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <h2 className="mb-1 text-[15px] font-semibold text-white/90">Tendencia de ventas</h2>
        <p className="mb-4 text-[12.5px] text-white/40">Últimos 30 días</p>
        <AreaChart data={dayBuckets} />
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="mb-4 text-[15px] font-semibold text-white/90">Platos más vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-white/40">Aún no hay datos de ventas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.05]">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11.5px] font-semibold text-white/50">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[14px] text-white/85">{p.name}</p>
                      <p className="text-[12px] text-white/40">{p.quantity} vendidos</p>
                    </div>
                  </div>
                  <span className="text-[13.5px] font-medium text-white/80">
                    {formatCurrency(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="mb-4 text-[15px] font-semibold text-white/90">Horas pico</h2>
          <ChannelBars data={peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }))} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard className="p-5 text-center sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-white/50">Clientes totales</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold text-white">{customerCount}</p>
        </GlassCard>
        <GlassCard className="p-5 text-center sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-white/50">Clientes recurrentes</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold text-white">{repeatCustomers}</p>
        </GlassCard>
        <GlassCard className="p-5 text-center sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-white/50">Tasa de recurrencia</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold text-white">
            {repeatRate.toFixed(1)}%
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
