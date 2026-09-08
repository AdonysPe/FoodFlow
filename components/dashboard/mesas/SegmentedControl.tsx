"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

// Apple-style segmented control: the selected "pill" glides between options
// with a spring. `idBase` must be unique per mounted instance — it keys the
// shared layout animation.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  idBase,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  idBase: string;
}) {
  const pad =
    size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-[13.5px]";

  return (
    <div className="inline-flex w-fit rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`relative rounded-lg font-medium transition-colors duration-200 ${pad} ${
              active ? "text-fg" : "text-faint hover:text-fg/75"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${idBase}`}
                transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                className="absolute inset-0 rounded-lg bg-fg/[0.1] shadow-[inset_0_1px_0_0_var(--spec),0_2px_8px_-2px_var(--drop-soft)]"
              />
            )}
            <span className="relative flex items-center gap-2">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
