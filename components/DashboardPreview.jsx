"use client";

import { useId, useState } from "react";
import { m as motion } from "framer-motion";
import { buildAreaPath } from "@/lib/chart";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, viewportOnce } from "@/lib/motion";

// Three ranges of simulated revenue, so the 1D/7D/30D switch actually moves
// the line instead of pretending to.
const REVENUE = [
  [12, 18, 15, 26, 22, 34, 30, 44, 38, 52, 47, 63, 58, 71],
  [28, 34, 31, 42, 39, 52, 48, 61, 57, 72, 68, 84, 79, 96],
  [44, 39, 52, 48, 63, 58, 74, 69, 82, 77, 91, 86, 99, 94],
];

// Non-text data lives here and is paired with the dictionary by index: tones,
// which channel a row belongs to, which ticket is running late.
const CHANNEL_TONES = ["bg-accent-400", "bg-accent-400/70", "bg-cream/30", "bg-cream/20"];
const LIVE_ORDER_TONES = ["amber", "amber", "mint", "mint"];
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

const PANEL = "rounded-xl border border-cream/10 bg-cream/[0.03] shadow-card";
const TRANSITION = { duration: 0.28, ease: EASE };

/**
 * The product shot — and, on the landing, the demo a visitor can poke at:
 * the sidebar switches between six simulated views, the range chips redraw
 * the chart and a dish can be marked sold out. Built from DOM + SVG so it
 * stays crisp, animates on scroll and never ships a screenshot that goes
 * stale.
 */
export default function DashboardPreview({ variant = "full", className = "" }) {
  const { t } = useLanguage();
  const d = t.dashboard;
  const uid = useId().replace(/:/g, "");
  const full = variant === "full";

  const [view, setView] = useState(0);
  const [range, setRange] = useState(1);

  return (
    // A screenshot of the product, not a part of the page: it keeps the dark
    // UI in both themes — which is also the only one the dashboard has. The
    // explicit text colour re-states what <body> gives it in dark mode, since
    // inside a light page it would otherwise inherit the page's ink.
    <section
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
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                    view === i
                      ? "bg-cream/[0.08] text-white"
                      : "text-cream/55 hover:bg-cream/[0.04] hover:text-cream/85"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      view === i ? "bg-accent-400" : "bg-cream/25"
                    }`}
                  />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-6 rounded-xl border border-cream/10 bg-cream/[0.03] p-3">
              <p className="text-[11px] text-cream/55">{d.kitchenLoad}</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">64%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-accent-400 to-accent-600"
                  initial={{ width: 0 }}
                  whileInView={{ width: "64%" }}
                  viewport={viewportOnce}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
                />
              </div>
            </div>
          </aside>
        )}

        {/* main column */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-cream/50">
                {d.today}
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-semibold text-white sm:text-xl">
                {view === 0 ? d.performanceOverview : viewTitle(d, view)}
              </h3>
            </div>

            {(view === 0 || view === 5) && (
              <div className="hidden shrink-0 gap-1.5 sm:flex">
                {d.ranges.map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(i)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      i === range
                        ? "bg-cream/[0.1] text-white"
                        : "text-cream/50 hover:text-cream/80"
                    }`}
                  >
                    {r}
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
                <Overview d={d} uid={uid} full={full} series={REVENUE[range]} />
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

/* -------------------------------- overview ------------------------------- */

function Overview({ d, uid, full, series }) {
  const { line, area } = buildAreaPath(series, 560, 150, 10);
  const channels = d.channels.map((c, i) => ({ ...c, tone: CHANNEL_TONES[i] }));
  const orders = d.orders.map((o, i) => ({ ...o, tone: LIVE_ORDER_TONES[i] }));

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {d.kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, ease: EASE, delay: 0.05 * i }}
            className={`${PANEL} p-3`}
          >
            <p className="truncate text-[10.5px] uppercase tracking-[0.12em] text-cream/50">
              {kpi.label}
            </p>
            <p className="mt-1.5 font-display text-base font-semibold text-white sm:text-lg">
              {kpi.value}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-mint">
              <TrendIcon />
              {kpi.delta}
            </p>
          </motion.div>
        ))}
      </div>

      <div className={`mt-3 grid gap-3 ${full ? "lg:grid-cols-[1.6fr_1fr]" : ""}`}>
        <div className={`${PANEL} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-medium text-cream/75">{d.revenue}</p>
            <p className="text-[11px] text-cream/50">{d.vsLastWeek}</p>
          </div>
          <svg
            viewBox="0 0 560 150"
            preserveAspectRatio="none"
            className="h-28 w-full sm:h-32"
            aria-hidden
          >
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
                x2="560"
                y1={12 + i * 42}
                y2={12 + i * 42}
                stroke="rgba(243,239,230,0.05)"
                strokeWidth="1"
              />
            ))}

            <motion.path key={`a-${area}`} d={area} fill={`url(#fill-${uid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE }} />
            <motion.path
              key={`l-${line}`}
              d={line}
              fill="none"
              stroke={`url(#stroke-${uid})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: EASE }}
            />
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-cream/42">
            {d.timeLabels.map((lbl) => (
              <span key={lbl}>{lbl}</span>
            ))}
          </div>
        </div>

        {full && (
          <div className={`${PANEL} p-4`}>
            <p className="mb-3.5 text-[12px] font-medium text-cream/75">
              {d.ordersByChannel}
            </p>
            <div className="space-y-3">
              {channels.map((c, i) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="text-cream/66">{c.label}</span>
                    <span className="text-cream/50">{c.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream/[0.07]">
                    <motion.div
                      className={`h-full rounded-full ${c.tone}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${c.value}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`mt-3 ${PANEL} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-cream/75">{d.liveOrders}</p>
          <span className="text-[11px] text-cream/50">{d.updatedJustNow}</span>
        </div>
        <div className="space-y-1.5">
          {orders.slice(0, full ? 4 : 3).map((o, i) => (
            <motion.div
              key={o.table}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.07 }}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-cream/[0.04]"
            >
              <span className="w-20 shrink-0 truncate text-[12px] text-cream/75">
                {o.table}
              </span>
              <span className="hidden min-w-0 flex-1 truncate text-[12px] text-cream/55 sm:block">
                {o.items}
              </span>
              <StatePill tone={o.tone}>{o.state}</StatePill>
            </motion.div>
          ))}
        </div>
      </div>
    </>
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

function TrendIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
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
