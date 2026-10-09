import { prisma } from "@/lib/db/prisma";
import { BLOCKING_RESERVATION_STATUSES, reservationStillHolds } from "@/lib/tableMeta";
import {
  CHANNEL_ROWS,
  dayLabels,
  hourLabel,
  limaHour,
  limaMidnight,
  percentChange,
  spreadLabels,
  type ChannelKey,
  type LiveOrder,
  type OverviewRange,
  type ServiceOverviewData,
  type TableTile,
  type TopItem,
} from "@/lib/serviceOverview";

type Line = { name?: string; quantity?: number };

const DAY_MS = 24 * 60 * 60 * 1000;
// The demo's service window. Buckets widen past it when orders fall outside,
// so an early breakfast or a late bar tab still lands on the chart.
const SERVICE_START_HOUR = 9;
const SERVICE_END_HOUR = 22;

function itemsSummary(items: unknown): string {
  if (!Array.isArray(items)) return "";
  // Merge repeat lines (a second round of the same dish) into one count.
  const counts = new Map<string, number>();
  for (const line of items as Line[]) {
    if (!line?.name) continue;
    counts.set(line.name, (counts.get(line.name) ?? 0) + (line.quantity ?? 1));
  }
  return [...counts.entries()].map(([name, qty]) => `${name} x${qty}`).join(", ");
}

function channelOf(order: { source: string | null; channel: string }): ChannelKey {
  return order.source === "online_store" ? "web" : (order.channel as ChannelKey);
}

// Median, not mean: one ticket someone forgot to mark ready until the next
// morning would otherwise drag the whole period's kitchen time into hours.
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Everything the owner's Resumen shows for one range. The deltas compare the
 * range so far against the same stretch of the previous period — today until
 * now against yesterday until the same hour — so a slow morning is never
 * measured against a whole finished day.
 */
export async function loadServiceOverview(
  restaurantId: string,
  range: OverviewRange,
  now = new Date()
): Promise<ServiceOverviewData> {
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  const start = limaMidnight(days - 1, now);
  const span = days * DAY_MS;
  const prevStart = new Date(start.getTime() - span);
  const prevNow = new Date(now.getTime() - span);

  // Lima's calendar day as the @db.Date the reservations are stored with, and
  // the minutes since Lima midnight the "still holds" check works in.
  const limaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const limaToday = new Date(Date.UTC(limaNow.getUTCFullYear(), limaNow.getUTCMonth(), limaNow.getUTCDate()));
  const limaMinutes = limaNow.getUTCHours() * 60 + limaNow.getUTCMinutes();

  const [periodOrders, liveOrders, floorTables, openTabs, todaysReservations] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, voidedAt: null, createdAt: { gte: prevStart, lte: now } },
      select: { total: true, createdAt: true, readyAt: true, channel: true, source: true, items: true },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        voidedAt: null,
        // Still in the kitchen, or served at a table whose account is open.
        OR: [
          { status: { in: ["pending", "preparing", "ready"] } },
          { status: "delivered", channel: "dine_in", paidAt: null },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: {
        id: true,
        status: true,
        channel: true,
        source: true,
        customerName: true,
        items: true,
        createdAt: true,
        table: { select: { name: true } },
      },
    }),
    prisma.restaurantTable.findMany({
      where: { restaurantId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, occupiedAt: true },
    }),
    // A table's open tab keeps it occupied until it is charged or voided, the
    // same rule the Mesas floor plan uses.
    prisma.order.findMany({
      where: { restaurantId, tableId: { not: null }, paidAt: null, voidedAt: null },
      select: { tableId: true, status: true },
    }),
    prisma.reservation.findMany({
      where: { restaurantId, date: limaToday, status: { in: BLOCKING_RESERVATION_STATUSES } },
      select: { tableId: true, startTime: true, durationMin: true },
    }),
  ]);

  const current = periodOrders.filter((o) => o.createdAt >= start);
  const previous = periodOrders.filter((o) => o.createdAt < start);
  const previousSoFar = previous.filter((o) => o.createdAt <= prevNow);

  const sum = (list: { total: number }[]) => list.reduce((acc, o) => acc + o.total, 0);
  const kitchenSeconds = (list: typeof periodOrders) =>
    median(
      list
        .filter((o) => o.readyAt)
        .map((o) => (o.readyAt!.getTime() - o.createdAt.getTime()) / 1000)
    );

  const sales = sum(current);
  const orders = current.length;
  const avgTicket = orders > 0 ? sales / orders : 0;
  const prevSales = sum(previousSoFar);
  const prevOrders = previousSoFar.length;
  const prevTicket = prevOrders > 0 ? prevSales / prevOrders : 0;
  const kitchen = kitchenSeconds(current);
  const prevKitchen = kitchenSeconds(previousSoFar);

  /* ---- chart buckets: by hour for today, by day otherwise ---- */
  let series: number[];
  let prevSeries: number[];
  let labels: string[];

  if (range === "1d") {
    const hours = current.map((o) => limaHour(o.createdAt));
    const first = Math.min(SERVICE_START_HOUR, ...hours);
    const last = Math.max(SERVICE_END_HOUR, ...hours);
    const slots = Array.from({ length: last - first + 1 }, (_, i) => first + i);
    const byHour = (list: typeof periodOrders) =>
      slots.map((h) => sum(list.filter((o) => limaHour(o.createdAt) === h)));
    series = byHour(current);
    prevSeries = byHour(previous);
    labels = slots.map(hourLabel);
  } else {
    const dayIndex = (d: Date, from: Date) => Math.floor((d.getTime() - from.getTime()) / DAY_MS);
    series = Array.from({ length: days }, () => 0);
    prevSeries = Array.from({ length: days }, () => 0);
    for (const o of current) series[dayIndex(o.createdAt, start)] += o.total;
    for (const o of previous) prevSeries[dayIndex(o.createdAt, prevStart)] += o.total;
    labels = dayLabels(range, now);
  }

  const channels = CHANNEL_ROWS.map((row) => ({
    ...row,
    count: current.filter((o) => channelOf(o) === row.key).length,
  }));

  const live: LiveOrder[] = liveOrders.map((o) => {
    const web = o.source === "online_store";
    const origin =
      o.channel === "dine_in"
        ? o.table?.name ?? o.customerName
        : `${web ? "Web · " : ""}${o.channel === "delivery" ? "Delivery" : "Para llevar"}`;
    return {
      id: o.id,
      origin,
      items: itemsSummary(o.items),
      state: o.status === "delivered" ? "served" : o.status,
      minutes: Math.max(0, Math.floor((now.getTime() - o.createdAt.getTime()) / 60000)),
    };
  });

  /* ---- the floor: free, busy, waiting to pay, or held by a reservation ---- */
  const tables: TableTile[] = floorTables.map((table) => {
    const tabs = openTabs.filter((o) => o.tableId === table.id);
    let state: TableTile["state"] = "free";
    if (tabs.some((o) => o.status === "delivered")) state = "bill";
    else if (table.occupiedAt || tabs.length > 0) state = "busy";
    else if (
      todaysReservations.some(
        (r) => r.tableId === table.id && reservationStillHolds(r.startTime, r.durationMin, limaMinutes)
      )
    ) {
      state = "reserved";
    }
    return { name: table.name, state };
  });

  /* ---- the three dishes with the most units in the range ---- */
  const units = new Map<string, number>();
  for (const order of current) {
    if (!Array.isArray(order.items)) continue;
    for (const line of order.items as Line[]) {
      if (!line?.name) continue;
      units.set(line.name, (units.get(line.name) ?? 0) + (line.quantity ?? 1));
    }
  }
  const ranked = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const photos = ranked.length
    ? await prisma.menuItem.findMany({
        where: { restaurantId, name: { in: ranked.map(([name]) => name) } },
        select: { name: true, photoUrl: true },
      })
    : [];
  const top: TopItem[] = ranked.map(([name, count]) => ({
    name,
    count,
    photoUrl: photos.find((p) => p.name === name)?.photoUrl ?? null,
  }));

  return {
    range,
    demo: false,
    kpis: { sales, orders, avgTicket, kitchenSeconds: kitchen },
    deltas: {
      sales: percentChange(sales, prevSales),
      orders: percentChange(orders, prevOrders),
      avgTicket: orders > 0 ? percentChange(avgTicket, prevTicket) : null,
      kitchen: kitchen != null && prevKitchen != null ? percentChange(kitchen, prevKitchen) : null,
    },
    series,
    previous: prevSeries,
    labels,
    axis: spreadLabels(labels),
    channels,
    live,
    kitchen: {
      pending: liveOrders.filter((o) => o.status === "pending").length,
      preparing: liveOrders.filter((o) => o.status === "preparing").length,
      ready: liveOrders.filter((o) => o.status === "ready").length,
    },
    tables,
    top,
  };
}
