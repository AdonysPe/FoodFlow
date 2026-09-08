"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

const BAR_TONES = [
  "from-accent-300 to-accent-500",
  "from-accent-400 to-accent-600",
  "from-mint/80 to-mint",
];

export default function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number }[];
}) {
  const base = stages[0]?.value || 1;

  return (
    <div className="flex flex-col gap-4">
      {stages.map((stage, i) => {
        const pct = Math.max((stage.value / base) * 100, stage.value > 0 ? 6 : 0);
        const ofBase = base > 0 ? Math.round((stage.value / base) * 100) : 0;
        return (
          <div key={stage.label}>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-fg/70">{stage.label}</span>
              <span className="text-faint">
                {stage.value.toLocaleString("en-US")}
                {i > 0 && <span className="ml-1.5 text-faint">({ofBase}%)</span>}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-fg/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
                className={`h-full rounded-full bg-linear-to-r ${BAR_TONES[i % BAR_TONES.length]}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
