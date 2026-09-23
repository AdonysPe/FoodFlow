"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { m as motion } from "framer-motion";
import { buildComparisonPaths } from "@/lib/chart";
import { EASE } from "@/lib/motion";
import { formatCurrency, formatSoles } from "@/lib/format";
import {
  LIVE_STATE_LABELS,
  OVERVIEW_RANGES,
  RANGE_CHIPS,
  formatElapsed,
  formatKitchenTime,
  type LiveState,
  type OverviewRange,
  type ServiceOverviewData,
} from "@/lib/serviceOverview";

// The landing's demo panel, grown into the real thing: same panels, same
// order, same tones — but every figure comes from the restaurant's orders and
// every colour from the dashboard's theme tokens, so it holds up in light too.

const PANEL = "rounded-xl border border-cream/10 bg-cream/[0.03] shadow-card";

const TONE = {
  amber: "bg-accent-400/12 text-accent-label ring-accent-400/25",
  mint: "bg-mint/10 text-mint-ink ring-mint/25",
  plain: "bg-cream/[0.06] text-muted ring-cream/10",
} as const;

const LIVE_TONE: Record<LiveState, keyof typeof TONE> = {
  pending: "plain",
  preparing: "amber",
  ready: "mint",
  served: "mint",
};

// Same order as the channel list: the house colour first, then quieter.
const CHANNEL_TONES = ["bg-accent-400", "bg-accent-400/70", "bg-cream/35", "bg-cream/20"];

const KPI_LABELS: Record<OverviewRange, string> = {
  "1d": "Ventas de hoy",
  "7d": "Ventas · 7 días",
  "30d": "Ventas · 30 días",
};

const COMPARED_TO: Record<OverviewRange, string> = {
  "1d": "vs. ayer a esta hora",
  "7d": "vs. 7 días anteriores",
  "30d": "vs. 30 días anteriores",
};

// A ticket waiting longer than this gets flagged, like the demo's late card.
const LATE_MINUTES = 20;

export default function ServiceOverview({
  data,
  eyebrow,
}: {
  data: ServiceOverviewData;
  eyebrow: string;
}) {
  const { kpis, deltas, range } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------ header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-faint">{eyebrow}</p>
          <h1 className="mt-1 font-display text-[1.4rem] font-semibold tracking-[-0.01em] text-fg sm:text-[1.6rem]">
            Resumen del servicio
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-mint-ink ring-1 ring-mint/20">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
            EN VIVO
          </span>
          <nav className="flex gap-1 rounded-lg border border-cream/10 bg-cream/[0.03] p-1" aria-label="Rango">
            {OVERVIEW_RANGES.map((r) => (
              <Link
                key={r}
                href={`/dashboard/app/overview?range=${r}`}
                scroll={false}
                aria-current={r === range ? "page" : undefined}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  r === range ? "bg-cream/[0.1] text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {RANGE_CHIPS[r]}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {data.demo && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-accent-400/25 bg-accent-400/[0.07] px-4 py-3 text-[13px]">
          <span className="font-semibold text-accent-label">Datos de ejemplo</span>
          <span className="text-muted">
            Así se verá tu resumen. Con tu primer pedido, estas cifras pasan a ser las tuyas.
          </span>
        </div>
      )}

      {/* -------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi i={0} label={KPI_LABELS[range]} value={formatSoles(kpis.sales)} delta={deltas.sales} />
        <Kpi i={1} label="Pedidos" value={kpis.orders.toLocaleString("es-PE")} delta={deltas.orders} />
        <Kpi i={2} label="Ticket promedio" value={formatCurrency(kpis.avgTicket)} delta={deltas.avgTicket} />
        <Kpi
          i={3}
          label="Tiempo de cocina"
          value={kpis.kitchenSeconds != null ? formatKitchenTime(kpis.kitchenSeconds) : "—"}
          delta={deltas.kitchen}
          // Faster is better here, so a drop is the good news.
          lowerIsBetter
        />
      </div>

      {/* ------------------------------------------- chart + channels */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SalesChart data={data} />
        <Channels data={data} />
      </div>

      {/* ---------------------------------------- live orders + kitchen */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <LiveOrders data={data} />
        <KitchenLoad data={data} />
      </div>

      {data.demo && (
        <p className="text-[12px] text-faint">
          Panel de demostración. Las cifras son de ejemplo hasta que registres pedidos.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- KPI */

function Kpi({
  i,
  label,
  value,
  delta,
  lowerIsBetter = false,
}: {
  i: number;
  label: string;
  value: string;
  delta: number | null;
  lowerIsBetter?: boolean;
}) {
  const good = delta != null && (lowerIsBetter ? delta <= 0 : delta >= 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 * i }}
      className={`${PANEL} p-4`}
    >
      <p className="truncate text-[11px] uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-2 truncate font-display text-[1.35rem] font-semibold tabular-nums text-fg sm:text-[1.5rem]">
        {value}
      </p>
      {delta != null ? (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium tabular-nums ${
            good ? "text-mint-ink" : "text-accent-label"
          }`}
        >
          <TrendIcon down={delta < 0} />
          {delta >= 0 ? "+" : "−"}
          {Math.abs(delta).toFixed(1)}%
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] text-faint">Sin comparación aún</p>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------- chart */

const W = 560;
const H = 150;

function SalesChart({ data }: { data: ServiceOverviewData }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const { line, area, prevLine } = buildComparisonPaths(data.series, data.previous, W, H, 10);
  const n = data.series.length;
  const empty = data.series.every((v) => v === 0);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - box.left, 0), box.width);
    setHover(n > 1 ? Math.round((x / box.width) * (n - 1)) : 0);
  }

  const pct = hover != null && n > 1 ? (hover / (n - 1)) * 100 : 50;

  return (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-fg/85">Ventas</p>
        <div className="flex items-center gap-3 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-linear-to-r from-[#ffc184] to-accent-400" />
            Actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-cream/35" />
            {COMPARED_TO[data.range]}
          </span>
        </div>
      </div>

      <div
        className="relative"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full sm:h-44" aria-hidden>
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
              className="stroke-cream/[0.06]"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {prevLine && (
            <path
              d={prevLine}
              fill="none"
              className="stroke-cream/30"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <motion.path
            key={`a-${area}`}
            d={area}
            fill={`url(#fill-${uid})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
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

        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-faint">
            Aún no hay ventas en este rango.
          </p>
        )}

        {hover != null && !empty && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-cream/25"
              style={{ left: `${pct}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-cream/10 bg-ink-900/95 px-2.5 py-1.5 text-[11.5px] shadow-card backdrop-blur"
              style={{ left: `clamp(56px, ${pct}%, calc(100% - 56px))` }}
            >
              <p className="text-faint">{data.labels[hover]}</p>
              <p className="font-semibold tabular-nums text-fg">
                {formatSoles(data.series[hover] ?? 0)}
              </p>
              <p className="tabular-nums text-faint">antes {formatSoles(data.previous[hover] ?? 0)}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-faint">
        {data.axis.map((lbl, i) => (
          <span key={`${lbl}-${i}`}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- channels */

function Channels({ data }: { data: ServiceOverviewData }) {
  const total = data.channels.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg/85">Pedidos por canal</p>
        <span className="text-[11.5px] tabular-nums text-faint">{total} pedidos</span>
      </div>
      <div className="space-y-3.5">
        {data.channels.map((c, i) => {
          const share = total > 0 ? Math.round((c.count / total) * 100) : 0;
          return (
            <div key={c.key}>
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="text-muted">{c.label}</span>
                <span className="tabular-nums text-faint">
                  {c.count} · {share}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream/[0.07]">
                <motion.div
                  className={`h-full rounded-full ${CHANNEL_TONES[i]}`}
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

/* -------------------------------------------------------- live orders */

function LiveOrders({ data }: { data: ServiceOverviewData }) {
  const rows = data.live.slice(0, 6);

  return (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-fg/85">Pedidos en vivo</p>
        {data.demo ? (
          <span className="text-[11.5px] text-faint">Actualizado hace un momento</span>
        ) : (
          <Link
            href="/dashboard/app/orders"
            className="text-[12px] font-medium text-accent-icon hover:text-accent-ink"
          >
            Ver todos{data.live.length > rows.length ? ` (${data.live.length})` : ""}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-faint">
          Nada en marcha ahora. Los pedidos nuevos aparecen aquí al instante.
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((o, i) => {
            const late = o.state !== "served" && o.minutes >= LATE_MINUTES;
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.05 }}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-cream/[0.04]"
              >
                <span className="w-24 shrink-0 truncate text-[13px] font-medium text-fg/85 sm:w-28">
                  {o.origin}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                  {o.items || "—"}
                </span>
                <span
                  className={`shrink-0 text-[11.5px] tabular-nums ${
                    late ? "font-semibold text-accent-label" : "text-faint"
                  }`}
                >
                  {formatElapsed(o.minutes)}
                </span>
                <StatePill tone={LIVE_TONE[o.state]}>{LIVE_STATE_LABELS[o.state]}</StatePill>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- kitchen load */

function KitchenLoad({ data }: { data: ServiceOverviewData }) {
  const { pending, preparing, ready } = data.kitchen;
  const total = pending + preparing + ready;
  const segments = [
    { label: "En cola", count: pending, className: "bg-cream/30" },
    { label: "Preparando", count: preparing, className: "bg-accent-400" },
    { label: "Listos", count: ready, className: "bg-mint" },
  ];

  return (
    <div className={`${PANEL} flex flex-col p-4 sm:p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg/85">Carga de cocina</p>
        {!data.demo && (
          <Link
            href="/dashboard/app/kitchen"
            className="text-[12px] font-medium text-accent-icon hover:text-accent-ink"
          >
            Abrir cocina
          </Link>
        )}
      </div>

      <p className="mt-3 font-display text-[1.6rem] font-semibold tabular-nums text-fg">
        {pending + preparing}
        <span className="ml-2 font-sans text-[13px] font-normal text-faint">
          {pending + preparing === 1 ? "ticket en marcha" : "tickets en marcha"}
        </span>
      </p>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-cream/[0.07]">
        {total > 0 &&
          segments.map((s, i) => (
            <motion.div
              key={s.label}
              className={`h-full ${s.className}`}
              initial={{ width: 0 }}
              animate={{ width: `${(s.count / total) * 100}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.08 }}
            />
          ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {segments.map((s) => (
          <div key={s.label} className="rounded-lg bg-cream/[0.03] px-2.5 py-2">
            <dt className="flex items-center gap-1.5 text-[11px] text-faint">
              <span className={`h-1.5 w-1.5 rounded-full ${s.className}`} />
              {s.label}
            </dt>
            <dd className="mt-0.5 font-display text-[1.05rem] font-semibold tabular-nums text-fg">
              {s.count}
            </dd>
          </div>
        ))}
      </dl>

      {ready > 0 && (
        <p className="mt-3 text-[12px] text-mint-ink">
          {ready === 1 ? "1 pedido listo esperando salir." : `${ready} pedidos listos esperando salir.`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- pieces */

function StatePill({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

function TrendIcon({ down }: { down: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 ${down ? "-scale-y-100" : ""}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M2 8.5 5 5l2 2 3-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 3.5H10V6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
