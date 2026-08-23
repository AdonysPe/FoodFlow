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
}: {
  label: string;
  value: number;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  decimals?: number;
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
    </GlassCard>
  );
}
