"use client";

import { useId, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export type TrendPoint = { label: string; value: number };

const W = 600;
const H = 190;
const PAD = 14;

/**
 * Zero-based scale on purpose. A scale that fits the line between the
 * smallest and largest value flatters a flat week; money on a dashboard has
 * to be read against zero or the shape lies.
 */
function buildPath(values: number[]) {
  const max = Math.max(...values, 1);
  const innerH = H - PAD * 2;
  const step = values.length > 1 ? W / (values.length - 1) : W;

  const pts = values.map((v, i) => [i * step, PAD + innerH - (v / max) * innerH]);

  let line = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    line += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  return { line, area: `${line} L ${W} ${H} L 0 ${H} Z`, pts, max };
}

/** Axis money: S/ 1.2k reads at a glance where S/ 1,240.00 does not. */
function shortMoney(value: number): string {
  if (value >= 1000) return `S/ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `S/ ${Math.round(value)}`;
}

/**
 * The sales curve of Análisis, design B: a vermilion line over a soft fill,
 * the amounts the shape is measured against on the left, and the day under
 * the finger on hover.
 */
export default function SalesTrendChart({ points }: { points: TrendPoint[] }) {
  const uid = useId();
  const [hover, setHover] = useState<number | null>(null);

  const values = useMemo(() => points.map((p) => p.value), [points]);
  const { line, area, pts, max } = useMemo(() => buildPath(values), [values]);

  const hasSales = values.some((v) => v > 0);
  // Five ticks along the bottom, never more than the data has.
  const tickIdx = useMemo(() => {
    const wanted = Math.min(5, points.length);
    if (wanted < 2) return points.map((_, i) => i);
    return Array.from({ length: wanted }, (_, i) => Math.round((i / (wanted - 1)) * (points.length - 1)));
  }, [points]);

  const active = hover !== null ? points[hover] : null;

  function pick(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const i = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12 }}>
        <div className="lbd-an-axis">
          <span>{shortMoney(max)}</span>
          <span>{shortMoney(max / 2)}</span>
          <span>S/ 0</span>
        </div>

        <div className="lbd-an-plot" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" className="lbd-an-svg" aria-hidden>
            <defs>
              <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5a33" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#ff5a33" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="rgba(243,239,230,0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}

            <path d={area} fill={`url(#fill-${uid})`} />
            <path className="lbd-an-line" d={line} fill="none" stroke="#ff5a33" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} />

            {hover !== null && (
              <>
                <line x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD} y2={H - PAD} stroke="rgba(243,239,230,0.25)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4" fill="#ff5a33" stroke="#0c0908" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>

          {/* the amount for the day under the finger */}
          {active && (
            <div className="lbd-an-tip" style={{ left: `${(hover! / Math.max(1, points.length - 1)) * 100}%` }}>
              <span>{active.label}</span>
              <strong>{formatCurrency(active.value)}</strong>
            </div>
          )}

          <div className="lbd-an-ticks lbd-mono">
            {tickIdx.map((i) => (
              <span key={i}>{points[i]?.label}</span>
            ))}
          </div>
        </div>
      </div>

      {!hasSales && <p className="lbd-an-empty">Todavía no hay ventas en este periodo.</p>}
    </div>
  );
}
