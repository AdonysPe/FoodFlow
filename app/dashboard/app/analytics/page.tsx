import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import PageHeader from "@/components/dashboard/PageHeader";
import SalesTrendChart, { type TrendPoint } from "@/components/dashboard/SalesTrendChart";
import WeeklyEarnings, { type WeekBucket } from "@/components/dashboard/WeeklyEarnings";
import { limaHour } from "@/lib/serviceOverview";
import { CHANNEL_LABELS } from "@/lib/orderMeta";
import { formatCurrency } from "@/lib/format";

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

  // The 30-day window the dish ranking is drawn from. Computed here so the
  // SQL below filters on exactly the boundary the rest of the page uses.
  const dishWindowStart = startOfDay(TREND_DAYS - 1);

  const [orders, topProducts, customerCount, orderStatsByCustomer, tables] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: windowStart }, voidedAt: null },
      select: { total: true, createdAt: true },
    }),
    prisma.$queryRaw<{ name: string; quantity: bigint; revenue: string }[]>`
      SELECT it->>'name' AS name,
             SUM((it->>'quantity')::int) AS quantity,
             SUM((it->>'price')::numeric * (it->>'quantity')::int) AS revenue
      FROM "Order" o, jsonb_array_elements(o."items") AS it
      WHERE o."restaurantId" = ${restaurant.id}
        AND o."voidedAt" IS NULL
        AND o."createdAt" >= ${dishWindowStart}
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 5
    `,
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
  // COUNT/SUM come back as bigint and numeric, which are a BigInt and a
  // string over the wire.
  const dishes = topProducts.map((row) => ({
    name: row.name,
    quantity: Number(row.quantity),
    revenue: Number(row.revenue),
  }));
  const topRevenue = Math.max(1, ...dishes.map((d) => d.revenue));
  const dishPhotos = dishes.length
    ? await prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id, name: { in: dishes.map((d) => d.name) } },
        select: { name: true, photoUrl: true },
      })
    : [];

  // Weekday (Monday first) by hour, in Lima time: the server may run in UTC,
  // and a lunch rush that lands at 7 AM is not a rush anyone can act on.
  const heatCounts = Array.from({ length: 7 }, () => new Map<number, number>());
  let firstHour = 12;
  let lastHour = 23;
  for (const order of inPeriod) {
    const hour = limaHour(order.createdAt);
    const day = (new Date(order.createdAt.getTime() - 5 * 3_600_000).getUTCDay() + 6) % 7;
    heatCounts[day].set(hour, (heatCounts[day].get(hour) ?? 0) + 1);
    firstHour = Math.min(firstHour, hour);
    lastHour = Math.max(lastHour, hour);
  }
  const heatHours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
  const heatMax = Math.max(1, ...heatCounts.flatMap((row) => [...row.values()]));
  const hasHeat = inPeriod.length > 0;

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

  const stats: { label: string; value: string; delta: number | null; hint?: string }[] = [
    { label: "Ventas · 30 días", value: formatCurrency(sales), delta: pctChange(sales, priorSales), hint: "vs. 30 días previos" },
    { label: "Pedidos · 30 días", value: orderCount.toLocaleString("es-PE"), delta: pctChange(orderCount, inPrior.length), hint: orderCount > 0 ? `${Math.round(orderCount / TREND_DAYS)} por día` : undefined },
    { label: "Ticket promedio", value: formatCurrency(avgTicket), delta: pctChange(avgTicket, priorAvgTicket), hint: "por pedido" },
    { label: "Mejor día", value: formatCurrency(bestDay.value), delta: null, hint: bestDay.value > 0 ? bestDay.label : "sin ventas aún" },
  ];

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="NEGOCIO · ANÁLISIS" title="Análisis" description="Ventas, platos y horas pico de los últimos 30 días." />

      {/* the four numbers an owner opens this page for */}
      <div className="lbd-an-stats lbd-rise" style={{ animationDelay: ".05s" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="lbd-card lbd-an-stat">
            <span>{stat.label}</span>
            <strong className="lbd-display">{stat.value}</strong>
            <small style={{ color: stat.delta == null ? "#a39b90" : stat.delta >= 0 ? "#3ddc97" : "#ff7a57", fontWeight: stat.delta == null ? 400 : 550 }}>
              {stat.delta != null && `${stat.delta >= 0 ? "↑" : "↓"} ${Math.abs(stat.delta).toFixed(0)}% `}
              {stat.hint}
            </small>
          </div>
        ))}
      </div>

      <div className="lbd-an-row lbd-rise" style={{ animationDelay: ".1s" }}>
        <section className="lbd-card lbd-an-panel" style={{ flex: "2 1 460px" }} aria-label="Tendencia de ventas">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="lbd-an-h">Tendencia de ventas</span>
            <span className="lbd-display" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>
              {formatCurrency(sales)}
            </span>
          </div>
          <SalesTrendChart points={trend} />
        </section>

        <section className="lbd-card lbd-an-panel" style={{ flex: "1 1 280px" }} aria-label="Ganancia por semana">
          <span className="lbd-an-h">Ganancia por semana</span>
          <span style={{ marginTop: -6, fontSize: 12, color: "#8a8278" }}>Últimas {WEEKS} semanas, de lunes a domingo</span>
          <WeeklyEarnings weeks={weeks} daysElapsed={daysElapsed} previousToDate={previousToDate} />
        </section>
      </div>

      <div className="lbd-an-row lbd-rise" style={{ animationDelay: ".14s" }}>
        <section className="lbd-card lbd-an-panel" style={{ flex: "1 1 320px" }} aria-label="Platos más vendidos">
          <span className="lbd-an-h">Platos más vendidos</span>
          {dishes.length === 0 ? (
            <p className="lbd-an-empty">Aún no hay datos de ventas.</p>
          ) : (
            dishes.map((dish, i) => {
              const photo = dishPhotos.find((item) => item.name === dish.name)?.photoUrl;
              return (
                <div key={dish.name} className="lbd-an-dish">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" width={36} height={36} loading="lazy" />
                  ) : (
                    <span className="lbd-an-dish-n lbd-mono" aria-hidden>
                      {i + 1}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                      <span className="lbd-trunc">{dish.name}</span>
                      <span style={{ color: "#a39b90", flexShrink: 0 }}>
                        {formatCurrency(dish.revenue)} · {dish.quantity} vend.
                      </span>
                    </div>
                    <div className="lbd-track">
                      <div className="lbd-bar" style={{ width: `${(dish.revenue / topRevenue) * 100}%`, background: i === 0 ? "#ff5a33" : "#f3efe6", animationDelay: `${0.5 + i * 0.1}s` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="lbd-card lbd-an-panel" style={{ flex: "1 1 320px" }} aria-label="Horas pico">
          <span className="lbd-an-h">Horas pico</span>
          <span style={{ marginTop: -6, fontSize: 12, color: "#8a8278" }}>Pedidos por día y hora, últimos 30 días</span>
          {!hasHeat ? (
            <p className="lbd-an-empty">Aún no hay pedidos en este periodo.</p>
          ) : (
            <>
              <div className="lbd-an-heat" style={{ gridTemplateColumns: `34px repeat(${heatHours.length}, minmax(0, 1fr))` }}>
                {DAYS.map((day, row) => (
                  <HeatRow key={day} day={day} hours={heatHours} counts={heatCounts[row]} max={heatMax} />
                ))}
              </div>
              <div className="lbd-an-heat-ticks lbd-mono">
                <span>{firstHour}h</span>
                <span>{Math.round((firstHour + lastHour) / 2)}h</span>
                <span>{lastHour}h</span>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="lbd-an-stats lbd-an-stats--3 lbd-rise" style={{ animationDelay: ".18s" }}>
        <div className="lbd-card lbd-an-stat">
          <span>Clientes registrados</span>
          <strong className="lbd-display">{customerCount}</strong>
        </div>
        <div className="lbd-card lbd-an-stat">
          <span>Comensales que repiten</span>
          <strong className="lbd-display">{repeatCustomers}</strong>
        </div>
        <div className="lbd-card lbd-an-stat">
          <span>Tasa de recurrencia</span>
          <strong className="lbd-display">{repeatRate.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** One weekday of the heat grid: a cell per hour, vermilion where it is busiest. */
function HeatRow({ day, hours, counts, max }: { day: string; hours: number[]; counts: Map<number, number>; max: number }) {
  return (
    <>
      <span>{day}</span>
      {hours.map((hour) => {
        const count = counts.get(hour) ?? 0;
        const x = count / max;
        return <span key={hour} title={`${day} ${hour}h · ${count} pedidos`} style={{ aspectRatio: "1", borderRadius: 4, background: count === 0 ? "rgba(243,239,230,0.05)" : x > 0.75 ? "#ff5a33" : `rgba(255,90,51,${(0.14 + x * 0.6).toFixed(2)})` }} />;
      })}
    </>
  );
}
