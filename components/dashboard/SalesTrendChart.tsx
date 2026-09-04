"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { EASE } from "@/lib/motion";

export type TrendPoint = { label: string; value: number };

const W = 600;
const H = 190;
const PAD = 14;

/**
 * Zero-based scale on purpose. The shared `buildAreaPath` fits the line
 * between the smallest and largest value, which flatters a flat week; money
 * on a dashboard has to be read against zero or the shape lies.
 */
function buildPath(values: number[]) {
  const max = Math.max(...values, 1);
  const innerH = H - PAD * 2;
  const step = values.length > 1 ? W / (values.length - 1) : W;

  const pts = values.map((v, i) => [
    i * step,
    PAD + innerH - (v / max) * innerH,
  ]);

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
    return Array.from({ length: wanted }, (_, i) =>
      Math.round((i / (wanted - 1)) * (points.length - 1))
    );
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
      <div className="flex gap-3">
        {/* value axis — the amounts the shape is measured against */}
        <div className="flex w-14 shrink-0 flex-col justify-between py-[10px] text-right text-[10.5px] tabular-nums text-fg/30">
          <span>{shortMoney(max)}</span>
          <span>{shortMoney(max / 2)}</span>
          <span>S/ 0</span>
        </div>

        <div
          className="relative min-w-0 flex-1 touch-pan-y"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-44 w-full sm:h-52"
            aria-hidden
          >
            <defs>
              <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5a33" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff5a33" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffc184" />
                <stop offset="100%" stopColor="#ff5a33" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1="0"
                x2={W}
                y1={PAD + f * (H - PAD * 2)}
                y2={PAD + f * (H - PAD * 2)}
                stroke="var(--chart-axis)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <motion.path
              d={area}
              fill={`url(#fill-${uid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke={`url(#stroke-${uid})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: EASE }}
            />

            {hover !== null && (
              <>
                <line
                  x1={pts[hover][0]}
                  x2={pts[hover][0]}
                  y1={PAD}
                  y2={H - PAD}
                  stroke="var(--chart-tick)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={pts[hover][0]}
                  cy={pts[hover][1]}
                  r="4"
                  fill="#ff5a33"
                  stroke="var(--color-ink-950)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>

          {/* the amount for the day under the finger */}
          {active && (
            <div
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-fg/[0.12] bg-ink-950/95 px-2.5 py-1.5 text-center shadow-lift backdrop-blur-sm"
              style={{
                left: `${(hover! / Math.max(1, points.length - 1)) * 100}%`,
              }}
            >
              <p className="whitespace-nowrap text-[10.5px] text-fg/45">{active.label}</p>
              <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-fg">
                {formatCurrency(active.value)}
              </p>
            </div>
          )}

          <div className="mt-2 flex justify-between text-[10.5px] text-fg/30">
            {tickIdx.map((i) => (
              <span key={i}>{points[i]?.label}</span>
            ))}
          </div>
        </div>
      </div>

      {!hasSales && (
        <p className="mt-3 text-center text-[13px] text-fg/35">
          Todavía no hay ventas en este periodo.
        </p>
      )}
    </div>
  );
}
