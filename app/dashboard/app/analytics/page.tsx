import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/dashboard/StatTile";
import SalesTrendChart, { type TrendPoint } from "@/components/dashboard/SalesTrendChart";
import WeeklyEarnings, { type WeekBucket } from "@/components/dashboard/WeeklyEarnings";
import ChannelBars from "@/components/dashboard/ChannelBars";
import { IconBolt, IconOrders, IconTarget, IconTrendUp } from "@/components/ui/Icons";
import { CHANNEL_LABELS } from "@/lib/orderMeta";
import { formatCurrency } from "@/lib/format";
import type { OrderItemInput } from "@/lib/actions/orders";

export const metadata = {
  title: "Análisis",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const TREND_DAYS = 30;
const WEEKS = 8;

function startOfDay(daysAgo = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday-based, which is how a venue talks about "this week". */
function startOfWeek(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function dayLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function weekLabel(start: Date, end: Date): string {
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}`
    : `${dayLabel(start)}–${dayLabel(end)}`;
}

function hourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function AnalyticsPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("analytics");
  if (!allowed) return <PlanGate feature="analytics" plan={plan} />;
  if (!restaurant) return null;

  // 70 days covers both the 30-vs-30 comparison and eight Monday-aligned
  // weeks, whose first bucket can start a few days earlier than 8 × 7.
  const windowStart = startOfDay(69);

  const [orders, customerCount, orderStatsByCustomer, tables] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: windowStart }, voidedAt: null },
      select: { total: true, createdAt: true, items: true },
    }),
    prisma.customer.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.groupBy({
      by: ["customerName"],
      where: { restaurantId: restaurant.id, voidedAt: null },
      _count: { id: true },
    }),
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id },
      select: { name: true },
    }),
  ]);

  const tableNames = tables.map((t) => t.name);

  // ------------------------------------------------------- daily trend
  const trend: TrendPoint[] = [];
  let bestDay = { label: "", value: 0 };
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const day = startOfDay(i);
    const next = startOfDay(i - 1);
    const value = orders
      .filter((o) => o.createdAt >= day && o.createdAt < next)
      .reduce((sum, o) => sum + o.total, 0);
    const label = dayLabel(day);
    trend.push({ label, value });
    if (value > bestDay.value) bestDay = { label, value };
  }

  // --------------------------------------------------- period headline
  const periodStart = startOfDay(TREND_DAYS - 1);
  const priorStart = startOfDay(TREND_DAYS * 2 - 1);
  const inPeriod = orders.filter((o) => o.createdAt >= periodStart);
  const inPrior = orders.filter(
    (o) => o.createdAt >= priorStart && o.createdAt < periodStart
  );

  const sales = inPeriod.reduce((sum, o) => sum + o.total, 0);
  const priorSales = inPrior.reduce((sum, o) => sum + o.total, 0);
  const orderCount = inPeriod.length;
  const avgTicket = orderCount > 0 ? sales / orderCount : 0;
  const priorAvgTicket = inPrior.length > 0 ? priorSales / inPrior.length : 0;

  // ---------------------------------------------------- weekly buckets
  const thisWeekStart = startOfWeek(new Date());
  const weeks: WeekBucket[] = [];
  for (let i = WEEKS - 1; i >= 0; i -= 1) {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const next = new Date(start);
    next.setDate(next.getDate() + 7);

    const inWeek = orders.filter((o) => o.createdAt >= start && o.createdAt < next);
    weeks.push({
      label: weekLabel(start, end),
      value: inWeek.reduce((sum, o) => sum + o.total, 0),
      orders: inWeek.length,
      isCurrent: i === 0,
    });
  }

  // The current week is almost always partial; the honest comparison is the
  // same stretch of the week before, not its full seven days.
  const daysElapsed = Math.min(
    7,
    Math.floor((startOfDay(0).getTime() - thisWeekStart.getTime()) / 86_400_000) + 1
  );
  const prevWeekStart = new Date(thisWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekCutoff = new Date(prevWeekStart);
  prevWeekCutoff.setDate(prevWeekCutoff.getDate() + daysElapsed);
  const previousToDate = orders
    .filter((o) => o.createdAt >= prevWeekStart && o.createdAt < prevWeekCutoff)
    .reduce((sum, o) => sum + o.total, 0);

  // ------------------------------------------------------- dishes, hours
  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const order of inPeriod) {
    for (const item of order.items as OrderItemInput[]) {
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
  const topRevenue = Math.max(1, ...topProducts.map((p) => p.revenue));

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const order of inPeriod) hourCounts[order.createdAt.getHours()] += 1;
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // An order without a diner's name carries the table it was taken at, or the
  // channel it came through. Those are not people, and counting them made the
  // recurrence rate exceed 100% — the numerator was drawn from a wider set
  // than the denominator.
  const notPeople = new Set([
    ...tableNames,
    ...Object.values(CHANNEL_LABELS),
    "Delivery",
    "Para llevar",
  ]);
  const peopleWhoOrdered = orderStatsByCustomer.filter(
    (c) => !notPeople.has(c.customerName)
  );
  const repeatCustomers = peopleWhoOrdered.filter((c) => c._count.id > 1).length;
  const repeatRate =
    peopleWhoOrdered.length > 0 ? (repeatCustomers / peopleWhoOrdered.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* the four numbers an owner opens this page for */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ventas · 30 días"
          value={sales}
          prefix="S/ "
          icon={<IconTrendUp className="h-[18px] w-[18px]" />}
          delta={pctChange(sales, priorSales)}
          hint="vs. 30 días previos"
        />
        <StatTile
          label="Pedidos · 30 días"
          value={orderCount}
          icon={<IconOrders className="h-[18px] w-[18px]" />}
          delta={pctChange(orderCount, inPrior.length)}
          hint="vs. 30 días previos"
        />
        <StatTile
          label="Ticket promedio"
          value={avgTicket}
          prefix="S/ "
          decimals={2}
          icon={<IconTarget className="h-[18px] w-[18px]" />}
          delta={pctChange(avgTicket, priorAvgTicket)}
        />
        <StatTile
          label="Mejor día"
          value={bestDay.value}
          prefix="S/ "
          icon={<IconBolt className="h-[18px] w-[18px]" />}
          hint={bestDay.value > 0 ? bestDay.label : "sin ventas aún"}
        />
      </div>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="text-[15px] font-semibold text-fg/90">Tendencia de ventas</h2>
            <p className="text-[12.5px] text-fg/40">
              Últimos 30 días · toca la línea para ver el monto del día
            </p>
          </div>
          <p className="font-display text-[22px] font-extrabold tabular-nums text-fg">
            {formatCurrency(sales)}
          </p>
        </div>
        <SalesTrendChart points={trend} />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <h2 className="text-[15px] font-semibold text-fg/90">Ganancia por semana</h2>
        <p className="mb-5 text-[12.5px] text-fg/40">
          Últimas {WEEKS} semanas, de lunes a domingo
        </p>
        <WeeklyEarnings
          weeks={weeks}
          daysElapsed={daysElapsed}
          previousToDate={previousToDate}
        />
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="mb-4 text-[15px] font-semibold text-fg/90">Platos más vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-fg/40">
              Aún no hay datos de ventas.
            </p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {topProducts.map((p, i) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-fg/[0.06] text-[11px] font-semibold tabular-nums text-fg/50">
                        {i + 1}
                      </span>
                      <span className="truncate text-[14px] text-fg/85">{p.name}</span>
                    </div>
                    <span className="shrink-0 text-[13.5px] font-medium tabular-nums text-fg/85">
                      {formatCurrency(p.revenue)}
                    </span>
                  </div>
                  {/* the bar turns a list into a comparison */}
                  <div className="mt-1.5 flex items-center gap-2.5 pl-[30px]">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.05]">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent-300"
                        style={{ width: `${(p.revenue / topRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-fg/35">
                      {p.quantity} vend.
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="mb-1 text-[15px] font-semibold text-fg/90">Horas pico</h2>
          <p className="mb-4 text-[12.5px] text-fg/40">Pedidos por hora, últimos 30 días</p>
          {peakHours.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-fg/40">
              Aún no hay pedidos en este periodo.
            </p>
          ) : (
            <ChannelBars
              data={peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }))}
            />
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-fg/50">Clientes registrados</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold tabular-nums text-fg">
            {customerCount}
          </p>
        </GlassCard>
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-fg/50">Comensales que repiten</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold tabular-nums text-fg">
            {repeatCustomers}
          </p>
        </GlassCard>
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <p className="text-[13px] text-fg/50">Tasa de recurrencia</p>
          <p className="mt-2 font-display text-[1.6rem] font-extrabold tabular-nums text-fg">
            {repeatRate.toFixed(1)}%
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
