"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, m as motion, useInView } from "framer-motion";
import { buildComparisonPaths } from "@/lib/chart";
import { demoFigures } from "@/lib/serviceOverview";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, viewportOnce } from "@/lib/motion";

const RANGE_KEYS = ["1d", "7d", "30d"];

// Non-text data lives here and is paired with the dictionary by index: tones,
// which channel a row belongs to, which ticket is running late.
const CHANNEL_TONES = ["bg-accent-400", "bg-accent-400/70", "bg-cream/35", "bg-cream/20"];
const ORDER_TONES = ["amber", "amber", "mint", "mint", "mint"];
// 1 = dine-in, 2 = delivery, 3 = pickup — matches the filter list order.
const ORDER_CHANNEL = [1, 2, 1, 3, 1];
const LATE_TICKET = { column: 1, index: 1 };
const CUSTOMER_TONES = ["mint", "mint", "amber", "plain", "amber"];

const TONE = {
  amber: "bg-accent-400/12 text-accent-300 ring-accent-400/25",
  mint: "bg-mint/10 text-mint ring-mint/25",
  plain: "bg-cream/[0.06] text-cream/62 ring-cream/10",
  late: "bg-accent-500/15 text-accent-300 ring-accent-400/35",
};

const LIVE_TONE = { pending: "plain", preparing: "amber", ready: "mint", served: "mint" };
const NEXT_STATE = { pending: "preparing", preparing: "ready", ready: "served" };

const PANEL = "rounded-xl border border-cream/10 bg-cream/[0.03] shadow-card";
const TRANSITION = { duration: 0.28, ease: EASE };

// One tick is one simulated minute of service.
const TICK_MS = 2600;
// Past this a ticket that is still cooking reads as late, like the real panel.
const LATE_MINUTES = 20;
const MAX_ROWS = 6;

const soles = (v) => `S/ ${Math.round(v).toLocaleString("en-US")}`;
const soles2 = (v) =>
  `S/ ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kitchenTime = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;

/**
 * The product shot — and, on the landing, the demo a visitor can poke at:
 * the sidebar switches between six simulated views, the range chips redraw
 * the chart and a dish can be marked sold out. The Resumen view is the owner's
 * real panel run on the demo's figures (the same `demoFigures` an empty
 * dashboard shows), and while it is on screen a simulated service plays out:
 * tickets age, move through the kitchen and new ones walk in, lifting the
 * tiles, the chart and the channel bars as they do.
 */
export default function DashboardPreview({ variant = "full", className = "" }) {
  const { t } = useLanguage();
  const d = t.dashboard;
  const full = variant === "full";

  const [view, setView] = useState(0);
  const [range, setRange] = useState(1);

  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.25 });
  const live = useLiveService(d, inView);

  return (
    // A screenshot of the product, not a part of the page: it keeps the dark
    // UI in both themes — which is also the only one the dashboard has. The
    // explicit text colour re-states what <body> gives it in dark mode, since
    // inside a light page it would otherwise inherit the page's ink.
    <section
      ref={ref}
      data-theme="dark"
      className={`relative overflow-hidden rounded-2xl border border-cream/10 bg-linear-to-b from-ink-800/90 to-ink-900/95 text-cream/86 shadow-panel backdrop-blur-2xl ${className}`}
      aria-label={d.ariaLabel}
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-cream/10 bg-cream/[0.02] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
        </div>
        <div className="mx-auto hidden items-center gap-2 rounded-md border border-cream/10 bg-ink-950/60 px-3 py-1 text-[11px] text-cream/50 sm:flex">
          <LockIcon />
          {d.browserUrl}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <span className="hidden items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint ring-1 ring-mint/20 sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
            {d.live}
          </span>
          <div className="h-6 w-6 rounded-full bg-linear-to-br from-accent-400 to-accent-600" />
        </div>
      </div>

      <div className="flex">
        {/* sidebar — the demo's navigation */}
        {full && (
          <aside className="hidden w-44 shrink-0 border-r border-cream/10 p-4 lg:block">
            <div className="mb-5 flex items-center gap-2 px-1">
              <LogoMark className="h-6 w-6" />
              <span className="font-display text-sm font-semibold text-cream/85">
                FoodFlow
              </span>
            </div>

            <nav className="space-y-1" role="tablist" aria-orientation="vertical">
              {d.nav.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={view === i}
                  onClick={() => setView(i)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                    view === i ? "text-white" : "text-cream/55 hover:bg-cream/[0.04] hover:text-cream/85"
                  }`}
                >
                  {view === i && (
                    <motion.span
                      layoutId="demo-nav-active"
                      className="absolute inset-0 rounded-lg bg-cream/[0.08]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span
                    className={`relative h-1.5 w-1.5 rounded-full transition-colors ${
                      view === i ? "bg-accent-400" : "bg-cream/25"
                    }`}
                  />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </nav>

            <SidebarKitchen d={d} kitchen={live.kitchen} />
          </aside>
        )}

        {/* main column */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-cream/50">
                {view === 0 || view === 5
                  ? `${d.periods[RANGE_KEYS[range]]} · ${d.demoSuffix}`
                  : d.today}
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-semibold text-white sm:text-xl">
                {view === 0 ? d.performanceOverview : viewTitle(d, view)}
              </h3>
            </div>

            {(view === 0 || view === 5) && (
              <div className="hidden shrink-0 gap-1 rounded-lg border border-cream/10 bg-cream/[0.03] p-1 sm:flex">
                {d.ranges.map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(i)}
                    className={`relative rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      i === range ? "text-white" : "text-cream/50 hover:text-cream/80"
                    }`}
                  >
                    {i === range && (
                      <motion.span
                        layoutId="demo-range-active"
                        className="absolute inset-0 rounded-md bg-cream/[0.1]"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="relative">{r}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* the tabs, for screens with no sidebar */}
          {full && (
            <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
              {d.nav.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setView(i)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                    view === i
                      ? "border-accent-400/50 bg-accent-400/12 text-white"
                      : "border-cream/10 text-cream/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Keyed on the view, with no exit animation: React swaps the panel
              on the spot, so switching never waits on an animation to finish. */}
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TRANSITION}
            role="tabpanel"
          >
              {view === 0 && (
                <Overview d={d} full={full} rangeKey={RANGE_KEYS[range]} live={live} />
              )}
              {view === 1 && <Orders d={d} />}
              {view === 2 && <Kitchen d={d} />}
              {view === 3 && <Menu d={d} />}
              {view === 4 && <Customers d={d} />}
              {view === 5 && <Analytics d={d} />}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const VIEW_KEYS = [null, "orders", "kitchen", "menu", "customers", "analytics"];
const viewTitle = (d, view) => d.views[VIEW_KEYS[view]].title;

/* ----------------------------- simulated service ---------------------------- */

const seedOrders = (d) => d.orders.map((o, i) => ({ ...o, id: `seed-${i}`, n: i, since: i % 3 }));

// Simulated minutes a ticket spends in each state before it moves on. A
// little spread per ticket (by `n`) so they don't all flip on the same beat.
const DWELL = {
  pending: () => 2,
  preparing: (n) => 4 + (n % 3),
  ready: (n) => 2 + (n % 2),
  served: () => 5,
};
const ARRIVAL_EVERY = 3;

/**
 * A lunch service that plays itself while the panel is on screen: each tick
 * is a minute, tickets move through the kitchen on their own clock, and every
 * few minutes a new order walks in — lifting the tiles, the chart and the
 * channel bars. Pauses off screen, in a background tab and for anyone who
 * prefers reduced motion; a click still moves a ticket along by hand.
 * Deterministic, so server and client render the same first frame.
 */
function useLiveService(d, inView) {
  const [orders, setOrders] = useState(() => seedOrders(d));
  const [extra, setExtra] = useState({ sales: 0, orders: 0, channels: [0, 0, 0, 0] });
  const [running, setRunning] = useState(false);
  const tick = useRef(0);
  const nextIncoming = useRef(0);
  const seq = useRef(d.orders.length);

  // A language switch restarts the service in the new copy.
  useEffect(() => {
    setOrders(seedOrders(d));
    setExtra({ sales: 0, orders: 0, channels: [0, 0, 0, 0] });
    tick.current = 0;
    nextIncoming.current = 0;
    seq.current = d.orders.length;
  }, [d]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setRunning(inView && !reduce.matches && !document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    reduce.addEventListener("change", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      reduce.removeEventListener("change", update);
    };
  }, [inView]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      tick.current += 1;
      const arriving =
        tick.current % ARRIVAL_EVERY === 0
          ? d.incoming[nextIncoming.current++ % d.incoming.length]
          : null;
      const n = arriving ? seq.current++ : 0;

      setOrders((prev) => {
        let next = prev.map((o) => {
          const aged = { ...o, minutes: o.minutes + 1, since: o.since + 1 };
          return aged.since >= DWELL[aged.state](aged.n) ? step(aged) : aged;
        });
        if (arriving) {
          next = [{ ...arriving, id: `live-${n}`, n, state: "pending", minutes: 0, since: 0 }, ...next];
        }
        return retire(next);
      });

      if (arriving) {
        setExtra((e) => ({
          sales: e.sales + arriving.total,
          orders: e.orders + 1,
          channels: e.channels.map((c, i) => (i === arriving.channel ? c + 1 : c)),
        }));
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, d]);

  const advance = (id) => setOrders((prev) => retire(prev.map((o) => (o.id === id ? step(o) : o))));

  return {
    orders,
    extra,
    advance,
    kitchen: {
      pending: orders.filter((o) => o.state === "pending").length,
      preparing: orders.filter((o) => o.state === "preparing").length,
      ready: orders.filter((o) => o.state === "ready").length,
    },
  };
}

// Served is the last stop: once a table has been served a while it leaves.
const step = (o) =>
  o.state === "served" ? { ...o, gone: true } : { ...o, state: NEXT_STATE[o.state], since: 0 };

// Drop what has left, and never let the board overflow — served rows go first.
function retire(list) {
  let next = list.filter((o) => !o.gone);
  while (next.length > MAX_ROWS) {
    const served = next.filter((o) => o.state === "served");
    const drop = (served.length ? served : next).reduce((a, b) => (b.minutes > a.minutes ? b : a));
    next = next.filter((o) => o.id !== drop.id);
  }
  return next;
}

/* -------------------------------- sidebar card ------------------------------ */

function SidebarKitchen({ d, kitchen }) {
  const { pending, preparing, ready } = kitchen;
  const total = pending + preparing + ready || 1;

  return (
    <div className="mt-6 rounded-xl border border-cream/10 bg-cream/[0.03] p-3">
      <p className="text-[11px] text-cream/55">{d.kitchenLoad}</p>
      <p className="mt-1 font-display text-lg font-semibold text-white">
        <Ticker value={pending + preparing} format={(v) => Math.round(v)} />
        <span className="ml-1.5 font-sans text-[11px] font-normal text-cream/50">
          {d.kitchenCard.active}
        </span>
      </p>
      <KitchenBar pending={pending} preparing={preparing} ready={ready} total={total} thin />
    </div>
  );
}

function KitchenBar({ pending, preparing, ready, total, thin = false }) {
  const segments = [
    [pending, "bg-cream/30"],
    [preparing, "bg-accent-400"],
    [ready, "bg-mint"],
  ];
  return (
    <div className={`mt-2 flex overflow-hidden rounded-full bg-cream/[0.08] ${thin ? "h-1.5" : "h-2"}`}>
      {segments.map(([count, tone], i) => (
        <motion.div
          key={i}
          className={`h-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${(count / total) * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      ))}
    </div>
  );
}

/* -------------------------------- overview ------------------------------- */

function Overview({ d, full, rangeKey, live }) {
  const base = demoFigures(rangeKey);
  const { extra } = live;

  // Today's walk-ins land in every range: today is the last bucket of all three.
  const sales = base.kpis.sales + extra.sales;
  const orders = base.kpis.orders + extra.orders;
  const ticket = extra.orders ? sales / orders : base.kpis.avgTicket;
  const series = base.series.map((v, i, all) => (i === all.length - 1 ? v + extra.sales : v));

  // Deltas move with the service, against a fixed previous period.
  const prevSales = base.kpis.sales / (1 + base.deltas.sales / 100);
  const prevOrders = base.kpis.orders / (1 + base.deltas.orders / 100);
  const prevTicket = base.kpis.avgTicket / (1 + base.deltas.avgTicket / 100);

  const kpis = [
    { label: d.kpiLabels.sales[rangeKey], value: sales, format: soles, delta: (sales / prevSales - 1) * 100 },
    { label: d.kpiLabels.orders, value: orders, format: (v) => Math.round(v).toLocaleString("en-US"), delta: (orders / prevOrders - 1) * 100 },
    { label: d.kpiLabels.avgTicket, value: ticket, format: soles2, delta: (ticket / prevTicket - 1) * 100 },
    { label: d.kpiLabels.kitchen, value: base.kpis.kitchenSeconds, format: kitchenTime, delta: base.deltas.kitchen, lowerIsBetter: true },
  ];

  const labels =
    rangeKey === "1d"
      ? Array.from({ length: series.length }, (_, i) => hourLabel(9 + i))
      : rangeKey === "7d"
        ? d.weekdays
        : Array.from({ length: series.length }, (_, i) => `${d.dayWord} ${i + 1}`);

  // The dictionary holds one day's mix; spread it over the range's orders so
  // the bars always add up to the Pedidos tile (the last one takes the rounding).
  const mixTotal = d.channels.reduce((acc, c) => acc + c.count, 0);
  const scaled = d.channels.map((c) => Math.round((c.count / mixTotal) * base.kpis.orders));
  scaled[scaled.length - 1] = base.kpis.orders - scaled.slice(0, -1).reduce((a, b) => a + b, 0);
  const channels = d.channels.map((c, i) => ({
    ...c,
    count: scaled[i] + extra.channels[i],
    tone: CHANNEL_TONES[i],
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Kpi key={i} kpi={kpi} index={i} />
        ))}
      </div>

      <div className={`mt-3 grid gap-3 ${full ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}>
        <SalesChart
          d={d}
          rangeKey={rangeKey}
          series={series}
          previous={base.previous}
          labels={labels}
        />
        {full && <Channels d={d} channels={channels} />}
      </div>

      <div className={`mt-3 grid gap-3 ${full ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}>
        <LiveOrders d={d} live={live} rows={full ? MAX_ROWS : 3} />
        {full && <KitchenCard d={d} kitchen={live.kitchen} />}
      </div>
    </>
  );
}

function hourLabel(hour) {
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function Kpi({ kpi, index }) {
  const good = kpi.lowerIsBetter ? kpi.delta <= 0 : kpi.delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 * index }}
      className={`${PANEL} p-3`}
    >
      <p className="truncate text-[10.5px] uppercase tracking-[0.12em] text-cream/50">
        {kpi.label}
      </p>
      <p className="mt-1.5 truncate font-display text-base font-semibold tabular-nums text-white sm:text-lg">
        <Ticker value={kpi.value} format={kpi.format} />
      </p>
      <p
        className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums ${
          good ? "text-mint" : "text-accent-300"
        }`}
      >
        <TrendIcon down={kpi.delta < 0} />
        {kpi.delta >= 0 ? "+" : "−"}
        {Math.abs(kpi.delta).toFixed(1)}%
      </p>
    </motion.div>
  );
}

/** Tweens a figure from its last value to the new one, so a sale ticks up. */
function Ticker({ value, format }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (current.current === value) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(current.current, value, {
      duration: reduce ? 0 : 0.9,
      ease: EASE,
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return format(shown);
}

const W = 560;
const H = 150;

function SalesChart({ d, rangeKey, series, previous, labels }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState(null);
  const { line, area, prevLine } = buildComparisonPaths(series, previous, W, H, 10, { fit: true });
  const n = series.length;
  const pct = hover != null ? (hover / (n - 1)) * 100 : 0;
  const axis = [0, 1, 2, 3, 4].map((i) => labels[Math.round((i * (n - 1)) / 4)]);

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - box.left, 0), box.width);
    setHover(Math.round((x / box.width) * (n - 1)));
  }

  return (
    <div className={`${PANEL} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-cream/75">{d.revenue}</p>
        <div className="flex items-center gap-3 text-[10.5px] text-cream/50">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-linear-to-r from-[#ffc184] to-accent-400" />
            {d.legendCurrent}
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="w-3.5 border-t border-dashed border-cream/35" />
            {d.comparedTo[rangeKey]}
          </span>
        </div>
      </div>

      <div
        className="relative touch-pan-y"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full sm:h-32" aria-hidden>
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5a33" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#ff5a33" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffc184" />
              <stop offset="100%" stopColor="#ff5a33" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1="0"
              x2={W}
              y1={12 + i * 42}
              y2={12 + i * 42}
              stroke="rgba(243,239,230,0.05)"
              strokeWidth="1"
            />
          ))}

          {/* Keyed on the range so a switch draws the line in again; within a
              range the paths morph, so a walk-in lifts the curve in place. */}
          {prevLine && (
            <motion.path
              key={`p-${rangeKey}`}
              initial={{ d: prevLine, opacity: 0 }}
              animate={{ d: prevLine, opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE }}
              fill="none"
              stroke="rgba(243,239,230,0.3)"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <motion.path
            key={`a-${rangeKey}`}
            initial={{ d: area, opacity: 0 }}
            animate={{ d: area, opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
            fill={`url(#fill-${uid})`}
          />
          <motion.path
            key={`l-${rangeKey}`}
            initial={{ d: line, pathLength: 0 }}
            animate={{ d: line, pathLength: 1 }}
            transition={{ d: { duration: 0.8, ease: EASE }, pathLength: { duration: 1.1, ease: EASE } }}
            fill="none"
            stroke={`url(#stroke-${uid})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {hover != null && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-cream/25"
              style={{ left: `${pct}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-cream/10 bg-ink-900/95 px-2.5 py-1.5 text-[11px] shadow-card backdrop-blur"
              style={{ left: `clamp(52px, ${pct}%, calc(100% - 52px))` }}
            >
              <p className="text-cream/50">{labels[hover]}</p>
              <p className="font-semibold tabular-nums text-white">{soles(series[hover])}</p>
              <p className="tabular-nums text-cream/45">
                {d.before} {soles(previous[hover])}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-cream/42">
        {axis.map((lbl, i) => (
          <span key={`${lbl}-${i}`}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

function Channels({ d, channels }) {
  const total = channels.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className={`${PANEL} p-4`}>
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[12px] font-medium text-cream/75">{d.ordersByChannel}</p>
        <span className="text-[10.5px] tabular-nums text-cream/50">
          {total} {d.ordersWord}
        </span>
      </div>
      <div className="space-y-3">
        {channels.map((c, i) => {
          const share = Math.round((c.count / total) * 100);
          return (
            <div key={c.label}>
              <div className="mb-1.5 flex justify-between text-[11px]">
                <span className="text-cream/66">{c.label}</span>
                <span className="tabular-nums text-cream/50">
                  {c.count} · {share}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream/[0.07]">
                <motion.div
                  className={`h-full rounded-full ${c.tone}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${share}%` }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.08 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveOrders({ d, live, rows }) {
  const list = live.orders.slice(0, rows);

  return (
    <div className={`${PANEL} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-cream/75">{d.liveOrders}</p>
        <span className="truncate text-[10.5px] text-cream/50">{d.tapHint}</span>
      </div>
      <div className="space-y-1">
        {list.map((o) => {
          const late = o.state !== "served" && o.minutes >= LATE_MINUTES;
          const fresh = o.state === "pending" && o.minutes <= 1;
          return (
            // No exit animation: a retired row just leaves and the rest slide
            // up via `layout`, so nothing can hang half-way out.
            <motion.button
              layout
              key={o.id}
              type="button"
              onClick={() => live.advance(o.id)}
              disabled={o.state === "served"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE, layout: { duration: 0.35, ease: EASE } }}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors enabled:hover:bg-cream/[0.05] ${
                fresh ? "bg-accent-400/[0.06]" : ""
              }`}
            >
              <span className="flex w-24 shrink-0 items-center gap-1.5 truncate text-[12px] text-cream/80">
                {fresh && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent-400" />}
                <span className="truncate">{o.table}</span>
              </span>
              <span className="hidden min-w-0 flex-1 truncate text-[12px] text-cream/55 sm:block">
                {o.items}
              </span>
              <span
                className={`ml-auto shrink-0 text-[11px] tabular-nums sm:ml-0 ${
                  late ? "font-semibold text-accent-300" : "text-cream/45"
                }`}
              >
                {fresh ? d.newBadge : `${o.minutes} min`}
              </span>
              <StatePill tone={LIVE_TONE[o.state]}>{d.liveStates[o.state]}</StatePill>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function KitchenCard({ d, kitchen }) {
  const { pending, preparing, ready } = kitchen;
  const total = pending + preparing + ready || 1;
  const c = d.kitchenCard;
  const counts = [pending, preparing, ready];
  const dots = ["bg-cream/30", "bg-accent-400", "bg-mint"];

  return (
    <div className={`${PANEL} flex flex-col p-4`}>
      <p className="text-[12px] font-medium text-cream/75">{d.kitchenLoad}</p>
      <p className="mt-2.5 font-display text-2xl font-semibold tabular-nums text-white">
        <Ticker value={pending + preparing} format={(v) => Math.round(v)} />
        <span className="ml-2 font-sans text-[11.5px] font-normal text-cream/50">{c.active}</span>
      </p>
      <KitchenBar pending={pending} preparing={preparing} ready={ready} total={total} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {c.segments.map((label, i) => (
          <div key={label} className="rounded-lg bg-cream/[0.03] px-2 py-1.5">
            <p className="flex items-center gap-1.5 truncate text-[10.5px] text-cream/50">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[i]}`} />
              {label}
            </p>
            <p className="mt-0.5 font-display text-[15px] font-semibold tabular-nums text-white">
              {counts[i]}
            </p>
          </div>
        ))}
      </div>
      {ready > 0 && (
        <p className="mt-3 text-[11px] text-mint">
          {ready} {ready === 1 ? c.readyOne : c.readyMany}
        </p>
      )}
    </div>
  );
}

/* --------------------------------- orders -------------------------------- */

function Orders({ d }) {
  const v = d.views.orders;
  const [filter, setFilter] = useState(0);
  const rows = v.rows
    .map((row, i) => ({ ...row, tone: ORDER_TONES[i], channel: ORDER_CHANNEL[i] }))
    .filter((row) => filter === 0 || row.channel === filter);

  return (
    <div className={`${PANEL} p-4`}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {v.filters.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(i)}
            className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
              i === filter
                ? "bg-accent-400 text-ink-950"
                : "bg-cream/[0.06] text-cream/62 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Row header cells={v.columns} />

      {rows.map((row, i) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE, delay: i * 0.03 }}
          >
            <Row
              cells={[
                <span key="id" className="font-mono text-[11px] text-cream/50">
                  {row.id}
                </span>,
                row.source,
                <span key="items" className="text-cream/55">
                  {row.items}
                </span>,
                <span key="total" className="font-medium text-white">
                  {row.total}
                </span>,
                <StatePill key="state" tone={row.tone}>
                  {row.state}
                </StatePill>,
              ]}
            />
          </motion.div>
        ))}

      <Note>{v.note}</Note>
    </div>
  );
}

/* -------------------------------- kitchen -------------------------------- */

function Kitchen({ d }) {
  const v = d.views.kitchen;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {v.columns.map((column, ci) => (
        <div key={column} className={`${PANEL} p-3.5`}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/50">
            {column}
          </p>
          <div className="space-y-2">
            {v.tickets[ci].map((ticket, ti) => {
              const late = LATE_TICKET.column === ci && LATE_TICKET.index === ti;
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.05 * (ci * 2 + ti) }}
                  className={`rounded-lg border p-2.5 ${
                    late
                      ? "border-accent-400/40 bg-accent-400/[0.07]"
                      : "border-cream/10 bg-cream/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-cream/55">{ticket.id}</span>
                    <span
                      className={`font-mono text-[11px] ${
                        late ? "text-accent-300" : "text-cream/55"
                      }`}
                    >
                      {ticket.time}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-cream/80">{ticket.items}</p>
                  {late && (
                    <p className="mt-2 inline-flex rounded-full bg-accent-400/12 px-2 py-0.5 text-[10.5px] font-medium text-accent-300 ring-1 ring-inset ring-accent-400/25">
                      {v.lateLabel}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="sm:col-span-3">
        <Note>{v.note}</Note>
      </div>
    </div>
  );
}

/* ---------------------------------- menu --------------------------------- */

function Menu({ d }) {
  const v = d.views.menu;
  const [soldOut, setSoldOut] = useState([]);
  const toggle = (i) =>
    setSoldOut((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <div className={`${PANEL} p-4`}>
      <Row header cells={v.columns} />

      {v.rows.map((row, i) => {
        const out = soldOut.includes(i);
        return (
          <motion.div
            key={row.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE, delay: i * 0.04 }}
          >
            <Row
              cells={[
                <span key="n" className={out ? "text-cream/50 line-through" : "text-white"}>
                  {row.name}
                </span>,
                row.category,
                <span key="p" className="font-medium text-white">
                  {row.price}
                </span>,
                <span key="m" className="text-mint">
                  {row.margin}
                </span>,
                <button
                  key="s"
                  type="button"
                  onClick={() => toggle(i)}
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset transition-colors ${
                    out ? TONE.amber : TONE.mint
                  }`}
                >
                  {out ? v.soldOutLabel : v.availableLabel}
                </button>,
              ]}
            />
          </motion.div>
        );
      })}

      <Note>{v.note}</Note>
    </div>
  );
}

/* -------------------------------- customers ------------------------------ */

function Customers({ d }) {
  const v = d.views.customers;

  return (
    <div className={`${PANEL} p-4`}>
      <Row header cells={v.columns} />
      {v.rows.map((row, i) => (
        <motion.div
          key={row.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE, delay: i * 0.04 }}
        >
          <Row
            cells={[
              <span key="n" className="text-white">
                {row.name}
              </span>,
              row.visits,
              row.last,
              <span key="s" className="font-medium text-white">
                {row.spend}
              </span>,
              <StatePill key="t" tone={CUSTOMER_TONES[i]}>
                {row.tag}
              </StatePill>,
            ]}
          />
        </motion.div>
      ))}
      <Note>{v.note}</Note>
    </div>
  );
}

/* -------------------------------- analytics ------------------------------ */

function Analytics({ d }) {
  const v = d.views.analytics;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className={`${PANEL} p-4`}>
        <p className="mb-3.5 text-[12px] font-medium text-cream/75">{v.marginLabel}</p>
        <div className="space-y-2.5">
          {v.margins.map((bar, i) => (
            <div key={bar.name}>
              <div className="mb-1.5 flex justify-between text-[11.5px]">
                <span className="text-cream/66">{bar.name}</span>
                <span className="text-cream/55">{bar.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream/[0.07]">
                <motion.div
                  className={`h-full rounded-full ${
                    i === 0 ? "bg-mint" : "bg-accent-400"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.value}%` }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.08 * i }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${PANEL} flex flex-col p-4`}>
        <p className="mb-3.5 text-[12px] font-medium text-cream/75">{v.hoursLabel}</p>
        <div className="flex flex-1 items-end gap-2">
          {v.hours.map((hour, i) => (
            <div key={hour.label} className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                className={`w-full rounded-t-md ${
                  hour.value > 80 ? "bg-accent-400" : "bg-accent-400/35"
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${hour.value}px` }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.05 * i }}
              />
              <span className="text-[10px] text-cream/50">{hour.label}</span>
            </div>
          ))}
        </div>
        <Note>{v.insight}</Note>
      </div>
    </div>
  );
}

/* -------------------------------- pieces --------------------------------- */

function Row({ cells, header = false }) {
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 sm:grid-cols-[70px_90px_1fr_80px_92px] ${
        header
          ? "border-b border-cream/10 pb-2 text-[10.5px] uppercase tracking-[0.12em] text-cream/50"
          : "text-[12px] text-cream/66 transition-colors hover:bg-cream/[0.04]"
      }`}
    >
      {/* the two middle columns fold away on narrow screens */}
      {cells.map((cell, i) => (
        <span
          key={i}
          className={`truncate ${i > 1 && i < 4 ? "hidden sm:block" : ""} ${
            i === 4 ? "justify-self-end" : ""
          }`}
        >
          {cell}
        </span>
      ))}
    </div>
  );
}

function StatePill({ tone, children }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${TONE[tone] ?? TONE.plain}`}
    >
      {children}
    </span>
  );
}

function Note({ children }) {
  return <p className="mt-3 text-[11.5px] leading-relaxed text-cream/55">{children}</p>;
}

/* --------------------------------- icons --------------------------------- */

function TrendIcon({ down = false }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 ${down ? "-scale-y-100" : ""}`} fill="none" aria-hidden>
      <path
        d="M2 8.5 5 5l2 2 3-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 3.5H10V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 10 14" className="h-3 w-2.5" fill="none" aria-hidden>
      <rect x="1" y="5" width="8" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
