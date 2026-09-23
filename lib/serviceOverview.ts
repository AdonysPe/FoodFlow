// The owner's "Resumen del servicio" — the same model the landing's demo panel
// shows, fed with the restaurant's real orders. Client-safe: the Prisma loader
// lives in lib/db/serviceOverview.ts and only hands this shape across.

export const OVERVIEW_RANGES = ["1d", "7d", "30d"] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export const RANGE_CHIPS: Record<OverviewRange, string> = { "1d": "1D", "7d": "7D", "30d": "30D" };

export function parseOverviewRange(raw: string | undefined): OverviewRange {
  return (OVERVIEW_RANGES as readonly string[]).includes(raw ?? "") ? (raw as OverviewRange) : "1d";
}

export type ChannelKey = "dine_in" | "delivery" | "pickup" | "web";

export const CHANNEL_ROWS: { key: ChannelKey; label: string }[] = [
  { key: "dine_in", label: "Salón" },
  { key: "delivery", label: "Delivery" },
  { key: "pickup", label: "Para llevar" },
  { key: "web", label: "Web y QR" },
];

// What a live row can be. "served" is a dine-in order the kitchen is done
// with but the table is still eating — the account is open, so it stays live.
export type LiveState = "pending" | "preparing" | "ready" | "served";

export type LiveOrder = {
  id: string;
  origin: string;
  items: string;
  state: LiveState;
  minutes: number;
};

export type ServiceOverviewData = {
  range: OverviewRange;
  /** True when the restaurant has no orders yet and the panel shows sample data. */
  demo: boolean;
  kpis: {
    sales: number;
    orders: number;
    avgTicket: number;
    /** Median seconds from order to "ready"; null when nothing reached ready. */
    kitchenSeconds: number | null;
  };
  /** Percent change against the same stretch of the previous period. */
  deltas: {
    sales: number | null;
    orders: number | null;
    avgTicket: number | null;
    kitchen: number | null;
  };
  series: number[];
  previous: number[];
  /** One label per bucket, for the chart's hover readout. */
  labels: string[];
  /** Five of those, spaced out along the x axis. */
  axis: string[];
  channels: { key: ChannelKey; label: string; count: number }[];
  live: LiveOrder[];
  kitchen: { pending: number; preparing: number; ready: number };
};

export const LIVE_STATE_LABELS: Record<LiveState, string> = {
  pending: "En cola",
  preparing: "Preparando",
  ready: "Listo",
  served: "Servido",
};

/* ------------------------------ Lima calendar ----------------------------- */

// Peru is UTC−5 all year (no daylight saving), and every venue runs there. A
// fixed offset keeps the buckets right on a UTC server without a tz library.
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** The UTC instant of Lima midnight, `daysAgo` days back from `now`. */
export function limaMidnight(daysAgo = 0, now = new Date()): Date {
  const wall = new Date(now.getTime() - LIMA_OFFSET_MS);
  return new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - daysAgo) +
      LIMA_OFFSET_MS
  );
}

/** Hour of the day (0–23) on a Lima wall clock. */
export function limaHour(date: Date): number {
  return new Date(date.getTime() - LIMA_OFFSET_MS).getUTCHours();
}

/** "9am", "12pm", "6pm" — the demo's axis style. */
export function hourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/** Five evenly spaced labels out of however many buckets there are. */
export function spreadLabels(labels: string[], count = 5): string[] {
  if (labels.length <= count) return labels;
  return Array.from({ length: count }, (_, i) =>
    labels[Math.round((i * (labels.length - 1)) / (count - 1))]
  );
}

/** "9 min", "2h 05m", "15 d" — how long a live order has been open. */
export function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  return `${Math.floor(minutes / (24 * 60))} d`;
}

/** "11m 20s" under an hour, "1h 05m" past it. */
export function formatKitchenTime(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 3600) return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
  return `${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}m`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/* -------------------------------- demo data ------------------------------- */

// The landing demo's numbers, so an owner with no orders yet sees the panel
// they were sold instead of a wall of zeros — always under a "datos de
// ejemplo" banner. Channel counts are re-cut to add up to the 96 orders.
const DEMO_SERIES: Record<OverviewRange, number[]> = {
  "1d": [280, 340, 310, 420, 390, 520, 480, 610, 570, 720, 680, 840, 790, 960],
  "7d": [6120, 6840, 6390, 7210, 7580, 8460, 8940],
  "30d": [
    4400, 3900, 5200, 4800, 6300, 5800, 7400, 6900, 8200, 7700, 9100, 8600, 9900, 9400, 7600,
    6800, 8100, 7300, 8800, 8200, 9600, 8900, 10100, 9500, 8700, 9300, 9800, 9100, 10400, 8940,
  ],
};

/** Bucket labels for day ranges: weekday for a week, day + month for a month. */
export function dayLabels(range: OverviewRange, now = new Date()): string[] {
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, i) =>
    limaMidnight(days - 1 - i, now).toLocaleDateString("es-PE", {
      timeZone: "America/Lima",
      ...(range === "7d" ? { weekday: "short" } : { day: "numeric", month: "short" }),
    })
  );
}

function demoLabels(range: OverviewRange, now: Date): string[] {
  // The demo's service runs 9am–10pm: fourteen hourly buckets.
  if (range === "1d") return Array.from({ length: 14 }, (_, i) => hourLabel(9 + i));
  return dayLabels(range, now);
}

export function demoOverview(range: OverviewRange, now = new Date()): ServiceOverviewData {
  const raw = DEMO_SERIES[range];
  const rawTotal = raw.reduce((a, b) => a + b, 0);
  // Today adds up to the demo's S/ 8,940; longer ranges are the sum of their
  // days, so the tiles never contradict the chart under them.
  const series = range === "1d" ? raw.map((v) => Math.round((v * 8940) / rawTotal)) : raw;
  const sales = range === "1d" ? 8940 : rawTotal;
  const orders = range === "1d" ? 96 : Math.round(sales / 93.1);
  return {
    range,
    demo: true,
    kpis: { sales, orders, avgTicket: range === "1d" ? 93.1 : sales / orders, kitchenSeconds: 680 },
    deltas: { sales: 18.2, orders: 12.4, avgTicket: 4.1, kitchen: -9.3 },
    series,
    previous: series.map((v, i) => Math.round(v * (0.8 + ((i * 7) % 5) * 0.03))),
    labels: demoLabels(range, now),
    axis: spreadLabels(demoLabels(range, now)),
    channels: [
      { key: "dine_in", label: "Salón", count: 35 },
      { key: "delivery", label: "Delivery", count: 28 },
      { key: "pickup", label: "Para llevar", count: 20 },
      { key: "web", label: "Web y QR", count: 13 },
    ],
    live: [
      { id: "d1", origin: "Mesa 12", items: "Lomo saltado x2", state: "preparing", minutes: 9 },
      { id: "d2", origin: "Delivery", items: "Hamburguesa, papas", state: "ready", minutes: 14 },
      { id: "d3", origin: "Mesa 04", items: "Ceviche, causa", state: "served", minutes: 22 },
      { id: "d4", origin: "Para llevar", items: "Pollo a la brasa x1", state: "ready", minutes: 6 },
    ],
    kitchen: { pending: 2, preparing: 4, ready: 2 },
  };
}
