"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { buildComparisonPaths } from "@/lib/chart";
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
  type TableTile,
} from "@/lib/serviceOverview";

// The owner's Resumen, design B ("Noche"), as approved in the prototype: the
// greeting, today's sales as the hero with its curve, three tiles, what is in
// the kitchen now, the room and the dishes that sell. Every figure comes from
// the restaurant's orders, tables and menu; the range switch, the channel mix
// and the kitchen load are what the panel already had, redrawn in the same
// cards.

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

const TOP_LABELS: Record<OverviewRange, string> = {
  "1d": "Lo más pedido hoy",
  "7d": "Lo más pedido · 7 días",
  "30d": "Lo más pedido · 30 días",
};

// How far along a live order is, for its progress bar. A served dine-in order
// is done cooking but its table is still open, so its bar is full and quiet.
const PROGRESS: Record<LiveState, number> = { pending: 12, preparing: 55, ready: 100, served: 100 };

// A ticket waiting longer than this gets flagged.
const LATE_MINUTES = 20;

const W = 600;
const H = 170;
const RING = 176; // circumference of the Mesas ring (r = 28)

function percent(delta: number) {
  return `${Math.abs(Math.round(delta))}%`;
}

/** "Mesa 07" → "07", "Terraza 2" → "02", "Barra" → "BAR": what fits a tile. */
function tileLabel(name: string) {
  const digits = name.match(/\d+/);
  return digits ? digits[0].padStart(2, "0").slice(-3) : name.trim().slice(0, 3).toUpperCase();
}

export default function ServiceOverview({
  data,
  eyebrow,
  greeting,
  canComanda,
}: {
  data: ServiceOverviewData;
  eyebrow: string;
  greeting: string;
  canComanda: boolean;
}) {
  const { kpis, deltas, range } = data;
  const inProgress = data.live.filter((o) => o.state !== "served").length;
  const occupied = data.tables.filter((t) => t.state === "busy" || t.state === "bill").length;
  const toCharge = data.tables.filter((t) => t.state === "bill").length;
  const free = data.tables.filter((t) => t.state === "free").length;
  const ringTo = data.tables.length > 0 ? Math.round(RING * (1 - occupied / data.tables.length)) : RING;

  return (
    <div className="lbd-ov">
      {/* ------------------------------------------------------ header */}
      <div className="lbd-ov-head lbd-rise">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: "#a39b90" }}>{eyebrow}</span>
          <h1 className="lbd-ov-h1">
            {greeting}
            <span style={{ color: "#ff5a33" }}>.</span>
          </h1>
        </div>
        <div className="lbd-ov-actions">
          {data.demo && <span className="lbd-ov-chip">Datos de demostración</span>}
          <nav className="lbd-seg" aria-label="Rango">
            {OVERVIEW_RANGES.map((r) => (
              <Link key={r} href={`/dashboard/app/overview?range=${r}`} scroll={false} aria-current={r === range ? "page" : undefined} className={r === range ? "is-on" : undefined}>
                {RANGE_CHIPS[r]}
              </Link>
            ))}
          </nav>
          <span className="lbd-ov-live">
            <i className="lbd-pulse" aria-hidden />
            En vivo
          </span>
          {canComanda && (
            <Link href="/dashboard/comanda" className="lbd-ov-cta">
              Nueva comanda
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------- sales hero + three tiles */}
      <div className="lbd-ov-row">
        <SalesHero data={data} />

        <div className="lbd-ov-stack">
          <div className="lbd-card lbd-rise lbd-ov-tile" style={{ animationDelay: ".14s" }}>
            <div className="lbd-ov-tile-main">
              <span className="lbd-ov-label">Pedidos</span>
              <span className="lbd-ov-num">{kpis.orders.toLocaleString("es-PE")}</span>
            </div>
            <span className="lbd-ov-aside">
              {inProgress} en curso
              <br />
              ahora
              {deltas.orders != null && <Delta value={deltas.orders} small />}
            </span>
          </div>

          <div className="lbd-card lbd-rise lbd-ov-tile" style={{ animationDelay: ".2s" }}>
            <div className="lbd-ov-tile-main">
              <span className="lbd-ov-label">Ticket medio</span>
              <span className="lbd-ov-num">{formatCurrency(kpis.avgTicket)}</span>
            </div>
            {deltas.avgTicket != null && (
              <span className="lbd-ov-aside">
                <Delta value={deltas.avgTicket} small />
              </span>
            )}
          </div>

          <div className="lbd-card lbd-rise lbd-ov-tile" style={{ animationDelay: ".26s" }}>
            <div className="lbd-ov-tile-main">
              <span className="lbd-ov-label">Mesas ocupadas</span>
              {data.tables.length > 0 ? (
                <span className="lbd-ov-num">
                  {occupied}
                  <span style={{ color: "#6f675e" }}>/{data.tables.length}</span>
                </span>
              ) : (
                <Link href="/dashboard/app/mesas" className="lbd-ov-link" style={{ fontSize: 14 }}>
                  Configura tus mesas ›
                </Link>
              )}
            </div>
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(243,239,230,0.1)" strokeWidth="6" />
              <circle className="lbd-ring" cx="32" cy="32" r="28" fill="none" stroke="#f3efe6" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 32 32)" style={{ "--ring-to": ringTo } as CSSProperties} />
            </svg>
          </div>
        </div>
      </div>

      {/* ------------------------- in progress, the room, what sells */}
      <div className="lbd-ov-row">
        <section className="lbd-card lbd-rise lbd-ov-panel" style={{ animationDelay: ".32s" }} aria-label="Pedidos en curso">
          <div className="lbd-ov-panel-head">
            <span className="lbd-ov-title">En curso</span>
            <Link href="/dashboard/app/kitchen" className="lbd-ov-link">
              Ver cocina ›
            </Link>
          </div>
          {data.live.length === 0 ? (
            <p className="lbd-ov-empty">Nada en marcha ahora. Los pedidos nuevos aparecen aquí al instante.</p>
          ) : (
            data.live.slice(0, 5).map((o) => {
              const late = o.state !== "served" && o.minutes >= LATE_MINUTES;
              return (
                <div key={o.id} className="lbd-ov-live-row">
                  <div className="lbd-ov-live-line">
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className="lbd-mono" style={{ color: "#a39b90" }}>
                        {o.origin}
                      </span>
                      {"  "}
                      {o.items || "—"}
                    </span>
                    <span style={{ flexShrink: 0, color: o.state === "ready" || late ? "#ff7a57" : "#a39b90", fontWeight: o.state === "ready" || late ? 550 : 400 }}>
                      {LIVE_STATE_LABELS[o.state]} · {formatElapsed(o.minutes)}
                    </span>
                  </div>
                  <div className="lbd-track">
                    <div className="lbd-bar" style={{ width: `${PROGRESS[o.state]}%`, background: o.state === "ready" ? "#ff5a33" : "#f3efe6", opacity: o.state === "served" ? 0.4 : 1 }} />
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="lbd-card lbd-rise lbd-ov-panel" style={{ animationDelay: ".38s" }} aria-label="Salón">
          <div className="lbd-ov-panel-head">
            <span className="lbd-ov-title">Salón</span>
            <span style={{ fontSize: 12, color: "#a39b90" }}>
              {data.tables.length === 0 ? "Sin mesas" : toCharge > 0 ? `${toCharge} por cobrar` : `${free} libres`}
            </span>
          </div>
          {data.tables.length === 0 ? (
            <p className="lbd-ov-empty">
              Aún no hay mesas en el plano. <Link href="/dashboard/app/mesas" className="lbd-ov-link">Crear mesas ›</Link>
            </p>
          ) : (
            <div className="lbd-tables">
              {data.tables.slice(0, 35).map((t, i) => (
                <TableChip key={`${t.name}-${i}`} table={t} />
              ))}
            </div>
          )}
        </section>

        <section className="lbd-card lbd-rise lbd-ov-panel" style={{ animationDelay: ".44s" }} aria-label="Lo más pedido">
          <span className="lbd-ov-title">{TOP_LABELS[range]}</span>
          {data.top.length === 0 ? (
            <p className="lbd-ov-empty">Aún no hay pedidos en este rango.</p>
          ) : (
            <div className="lbd-top3">
              {data.top.map((item) => (
                <div key={item.name} className="lbd-top3-item">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt={item.name} loading="lazy" className="lbd-top3-photo" />
                  ) : (
                    <span className="lbd-top3-photo lbd-top3-photo--blank" aria-hidden>
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="lbd-top3-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="lbd-display" style={{ fontSize: 22 }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------ channels + kitchen load */}
      <div className="lbd-ov-row">
        <Channels data={data} />
        <KitchenLoad data={data} />
      </div>

      {data.demo && <p style={{ margin: 0, fontSize: 12, color: "#8a8278" }}>Panel de demostración. Las cifras son de ejemplo hasta que registres pedidos.</p>}
    </div>
  );
}

/* ------------------------------------------------------------ sales hero */

function SalesHero({ data }: { data: ServiceOverviewData }) {
  const { range, kpis, deltas } = data;
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
    <section className="lbd-card lbd-card--glass lbd-rise lbd-ov-hero" style={{ animationDelay: ".08s" }} aria-label={KPI_LABELS[range]}>
      <div className="lbd-ov-hero-top">
        <span style={{ fontSize: 14, color: "#a39b90" }}>{KPI_LABELS[range]}</span>
        {deltas.sales != null && (
          <span style={{ fontSize: 13, color: deltas.sales >= 0 ? "#3ddc97" : "#ff7a57", fontWeight: 550 }}>
            {deltas.sales >= 0 ? "↑" : "↓"} {percent(deltas.sales)} {COMPARED_TO[range]}
          </span>
        )}
      </div>
      <span className="lbd-display lbd-ov-big">{formatSoles(kpis.sales)}</span>

      <div className="lbd-ov-chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="170" aria-hidden="true" style={{ display: "block" }}>
          {prevLine && <path d={prevLine} fill="none" stroke="rgba(243,239,230,0.28)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
          <path key={`a-${range}`} className="lbd-area" d={area} fill="rgba(255,90,51,0.12)" />
          <path key={`l-${range}`} className="lbd-line" d={line} fill="none" stroke="#ff5a33" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {empty && <p className="lbd-ov-chart-empty">Aún no hay ventas en este rango.</p>}

        {hover != null && !empty && (
          <>
            <span aria-hidden className="lbd-ov-cursor" style={{ left: `${pct}%` }} />
            <div className="lbd-ov-tip" style={{ left: `clamp(60px, ${pct}%, calc(100% - 60px))` }}>
              <span style={{ color: "#a39b90" }}>{data.labels[hover]}</span>
              <strong>{formatSoles(data.series[hover] ?? 0)}</strong>
              <span style={{ color: "#8a8278" }}>antes {formatSoles(data.previous[hover] ?? 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className="lbd-ov-axis lbd-mono">
        {data.axis.map((lbl, i) => (
          <span key={`${lbl}-${i}`}>{lbl}</span>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- the pieces */

function Delta({ value, small, lowerIsBetter }: { value: number; small?: boolean; lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? value <= 0 : value >= 0;
  return (
    <span style={{ display: "block", marginTop: small ? 6 : 0, fontSize: 12, color: good ? "#3ddc97" : "#ff7a57", fontWeight: 550 }}>
      {value >= 0 ? "↑" : "↓"} {percent(value)}
    </span>
  );
}

function TableChip({ table }: { table: TableTile }) {
  const label = { free: "libre", busy: "ocupada", bill: "por cobrar", reserved: "reservada" }[table.state];
  return (
    <span className={`lbd-table lbd-table--${table.state}`} title={`${table.name} · ${label}`}>
      {tileLabel(table.name)}
    </span>
  );
}

function Channels({ data }: { data: ServiceOverviewData }) {
  const total = data.channels.reduce((acc, c) => acc + c.count, 0);
  return (
    <section className="lbd-card lbd-rise lbd-ov-panel" style={{ animationDelay: ".5s" }} aria-label="Pedidos por canal">
      <div className="lbd-ov-panel-head">
        <span className="lbd-ov-title">Pedidos por canal</span>
        <span style={{ fontSize: 12, color: "#a39b90" }}>{total} pedidos</span>
      </div>
      {data.channels.map((c, i) => {
        const share = total > 0 ? Math.round((c.count / total) * 100) : 0;
        return (
          <div key={c.key} className="lbd-ov-live-row">
            <div className="lbd-ov-live-line">
              <span>{c.label}</span>
              <span style={{ color: "#a39b90" }}>
                {c.count} · {share}%
              </span>
            </div>
            <div className="lbd-track">
              <div className="lbd-bar" style={{ width: `${share}%`, background: i === 0 ? "#ff5a33" : i === 1 ? "rgba(255,90,51,0.65)" : "rgba(243,239,230,0.45)", animationDelay: `${0.5 + i * 0.08}s` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function KitchenLoad({ data }: { data: ServiceOverviewData }) {
  const { pending, preparing, ready } = data.kitchen;
  const total = pending + preparing + ready;
  const segments = [
    { label: "En cola", count: pending, color: "rgba(243,239,230,0.4)" },
    { label: "Preparando", count: preparing, color: "#ff5a33" },
    { label: "Listos", count: ready, color: "#3ddc97" },
  ];

  return (
    <section className="lbd-card lbd-rise lbd-ov-panel" style={{ animationDelay: ".56s" }} aria-label="Carga de cocina">
      <div className="lbd-ov-panel-head">
        <span className="lbd-ov-title">Cocina</span>
        <Link href="/dashboard/app/kitchen" className="lbd-ov-link">
          Abrir cocina ›
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <span className="lbd-display" style={{ fontSize: 36, letterSpacing: "-0.05em", lineHeight: 1 }}>
          {pending + preparing}
          <span style={{ marginLeft: 8, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 400, letterSpacing: 0, color: "#a39b90" }}>
            {pending + preparing === 1 ? "ticket en marcha" : "tickets en marcha"}
          </span>
        </span>
        <span style={{ fontSize: 13, color: "#cfc7bb", textAlign: "right" }}>
          Tiempo de cocina{" "}
          <strong className="lbd-mono" style={{ color: "#f3efe6", fontWeight: 600 }}>
            {data.kpis.kitchenSeconds != null ? formatKitchenTime(data.kpis.kitchenSeconds) : "—"}
          </strong>
          {data.deltas.kitchen != null && <Delta value={data.deltas.kitchen} lowerIsBetter />}
        </span>
      </div>

      <div className="lbd-track lbd-track--thick" style={{ display: "flex" }}>
        {total > 0 &&
          segments.map((s) => (
            <div key={s.label} className="lbd-bar" style={{ width: `${(s.count / total) * 100}%`, background: s.color, borderRadius: 0 }} />
          ))}
      </div>

      <dl className="lbd-kitchen-legend">
        {segments.map((s) => (
          <div key={s.label}>
            <dt>
              <i style={{ background: s.color }} />
              {s.label}
            </dt>
            <dd className="lbd-display">{s.count}</dd>
          </div>
        ))}
      </dl>

      {ready > 0 && <p style={{ margin: 0, fontSize: 12, color: "#3ddc97" }}>{ready === 1 ? "1 pedido listo esperando salir." : `${ready} pedidos listos esperando salir.`}</p>}
    </section>
  );
}
