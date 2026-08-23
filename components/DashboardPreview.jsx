"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { buildAreaPath } from "@/lib/chart";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, viewportOnce } from "@/lib/motion";

const REVENUE = [28, 34, 31, 42, 39, 52, 48, 61, 57, 72, 68, 84, 79, 96];

// Tone/id/active flags are shared across languages; the label text is paired
// in from the dictionary by index.
const CHANNEL_TONES = ["bg-accent-400", "bg-accent-400/70", "bg-white/30", "bg-white/20"];

const ORDER_META = [
  { id: "#1042", tone: "amber" },
  { id: "#1041", tone: "violet" },
  { id: "#1040", tone: "mint" },
  { id: "#1039", tone: "mint" },
];

const STATE_TONE = {
  amber: "bg-accent-400/12 text-accent-300 ring-accent-400/25",
  violet: "bg-[#7c5cff]/12 text-[#b7a6ff] ring-[#7c5cff]/25",
  mint: "bg-mint/10 text-mint ring-mint/25",
};

/**
 * The product shot. Built entirely from DOM + SVG so it stays crisp on every
 * display, animates on scroll, and never ships a screenshot that goes stale.
 *
 * variant="compact" is the floating hero mockup (no sidebar, fewer panels);
 * variant="full" is the showcase version.
 */
export default function DashboardPreview({ variant = "full", className = "" }) {
  const { t } = useLanguage();
  const d = t.dashboard;
  const uid = useId().replace(/:/g, "");
  const full = variant === "full";
  const { line, area } = buildAreaPath(REVENUE, 560, 150, 10);
  const channels = d.channels.map((c, i) => ({ ...c, tone: CHANNEL_TONES[i] }));
  const orders = d.orders.map((o, i) => ({ ...o, ...ORDER_META[i] }));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.09] bg-linear-to-b from-ink-800/90 to-ink-900/95 backdrop-blur-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_60px_120px_-40px_rgba(0,0,0,0.95)] ${className}`}
      role="img"
      aria-label={d.ariaLabel}
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="mx-auto hidden items-center gap-2 rounded-md border border-white/[0.07] bg-ink-950/60 px-3 py-1 text-[11px] text-white/35 sm:flex">
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
        {/* sidebar */}
        {full && (
          <aside className="hidden w-44 shrink-0 border-r border-white/[0.07] p-4 lg:block">
            <div className="mb-5 flex items-center gap-2 px-1">
              <LogoMark className="h-6 w-6" />
              <span className="font-display text-sm font-semibold text-white/85">
                FoodFlow
              </span>
            </div>
            <nav className="space-y-1">
              {d.nav.map((label, i) => {
                const active = i === 0;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors ${
                      active
                        ? "bg-white/[0.07] text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-accent-400" : "bg-white/20"
                      }`}
                    />
                    {label}
                  </div>
                );
              })}
            </nav>
            <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[11px] text-white/40">{d.kitchenLoad}</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">64%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
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
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                {d.today}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold text-white sm:text-xl">
                {d.performanceOverview}
              </h3>
            </div>
            <div className="hidden gap-1.5 sm:flex">
              {d.ranges.map((r, i) => (
                <span
                  key={r}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                    i === 0 ? "bg-white/[0.09] text-white" : "text-white/35"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {d.kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.5, ease: EASE, delay: 0.05 * i }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
              >
                <p className="truncate text-[10.5px] uppercase tracking-[0.12em] text-white/35">
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

          {/* chart + channels */}
          <div className={`mt-3 grid gap-3 ${full ? "lg:grid-cols-[1.6fr_1fr]" : ""}`}>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-medium text-white/70">{d.revenue}</p>
                <p className="text-[11px] text-white/35">{d.vsLastWeek}</p>
              </div>
              <svg
                viewBox="0 0 560 150"
                preserveAspectRatio="none"
                className="h-28 w-full sm:h-32"
                aria-hidden
              >
                <defs>
                  <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7a2f" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#ff7a2f" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ffc184" />
                    <stop offset="100%" stopColor="#ff7a2f" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2="560"
                    y1={12 + i * 42}
                    y2={12 + i * 42}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                <motion.path
                  d={area}
                  fill={`url(#fill-${uid})`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={viewportOnce}
                  transition={{ duration: 1, ease: EASE, delay: 0.55 }}
                />
                <motion.path
                  d={line}
                  fill="none"
                  stroke={`url(#stroke-${uid})`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={viewportOnce}
                  transition={{ duration: 1.5, ease: EASE, delay: 0.2 }}
                />
              </svg>
              <div className="mt-2 flex justify-between text-[10px] text-white/25">
                {d.timeLabels.map((lbl) => (
                  <span key={lbl}>{lbl}</span>
                ))}
              </div>
            </div>

            {full && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="mb-3.5 text-[12px] font-medium text-white/70">
                  {d.ordersByChannel}
                </p>
                <div className="space-y-3">
                  {channels.map((c, i) => (
                    <div key={c.label}>
                      <div className="mb-1.5 flex justify-between text-[11px]">
                        <span className="text-white/55">{c.label}</span>
                        <span className="text-white/35">{c.value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={`h-full rounded-full ${c.tone}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${c.value}%` }}
                          viewport={viewportOnce}
                          transition={{ duration: 1, ease: EASE, delay: 0.4 + i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* live orders */}
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-medium text-white/70">{d.liveOrders}</p>
              <span className="text-[11px] text-white/35">{d.updatedJustNow}</span>
            </div>
            <div className="space-y-1.5">
              {orders.slice(0, full ? 4 : 3).map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.09 }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="font-mono text-[11px] text-white/35">{o.id}</span>
                  <span className="w-20 shrink-0 truncate text-[12px] text-white/70">
                    {o.table}
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate text-[12px] text-white/40 sm:block">
                    {o.items}
                  </span>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${STATE_TONE[o.tone]}`}
                  >
                    {o.state}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- icons --------------------------------- */

function TrendIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 8.5L5 5.5L7 7.5L10.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 3.4H10.6V6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 10 12" fill="none" aria-hidden>
      <rect x="1" y="5" width="8" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function LogoMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="url(#foodflow-logo)" />
      <path
        d="M10 20.5V13.5M16 20.5V10.5M22 20.5V16.5"
        stroke="#0a0c11"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="foodflow-logo" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#ffc184" />
          <stop offset="1" stopColor="#ed5f14" />
        </linearGradient>
      </defs>
    </svg>
  );
}
