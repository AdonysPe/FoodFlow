"use client";

import type { ReactNode } from "react";
import GlassCard from "@/components/ui/GlassCard";
import useCountUp from "@/lib/useCountUp";

export default function StatTile({
  label,
  value,
  icon,
  prefix = "",
  suffix = "",
  decimals = 0,
  delta,
  hint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Percentage change against the comparable previous period. */
  delta?: number | null;
  hint?: string;
}) {
  const { ref, display } = useCountUp(value, { decimals });

  return (
    <GlassCard className="p-5 sm:p-6" hoverLift={false}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-white/50">{label}</span>
        <span className="rounded-lg bg-white/[0.05] p-2 text-accent-400">{icon}</span>
      </div>
      <p ref={ref} className="mt-4 font-display text-[1.9rem] font-extrabold tracking-[-0.02em] text-white">
        {prefix}
        {display}
        {suffix}
      </p>
      {(delta != null || hint) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta != null && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${
                delta >= 0 ? "bg-mint/12 text-mint" : "bg-accent-400/12 text-accent-200"
              }`}
            >
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
            </span>
          )}
          {hint && <span className="text-[11.5px] text-white/35">{hint}</span>}
        </div>
      )}
    </GlassCard>
  );
}
