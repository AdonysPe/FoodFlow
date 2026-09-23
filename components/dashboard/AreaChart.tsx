"use client";

import { useId } from "react";
import { m } from "framer-motion";
import { buildAreaPath } from "@/lib/chart";
import { EASE, viewportOnce } from "@/lib/motion";

const WIDTH = 560;
const HEIGHT = 160;

export default function AreaChart({
  data,
  labels,
}: {
  data: number[];
  labels?: string[];
}) {
  const uid = useId();
  const safeData = data.length > 1 ? data : [...data, ...data];
  const { line, area } = buildAreaPath(safeData, WIDTH, HEIGHT, 10);

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
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
            x2={WIDTH}
            y1={12 + i * 45}
            y2={12 + i * 45}
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />
        ))}

        <m.path
          d={area}
          fill={`url(#fill-${uid})`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        />
        <m.path
          d={line}
          fill="none"
          stroke={`url(#stroke-${uid})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1.3, ease: EASE }}
        />
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between text-[10px] text-faint">
          {labels.map((lbl, i) => (
            <span key={`${lbl}-${i}`}>{lbl}</span>
          ))}
        </div>
      )}
    </div>
  );
}
