"use client";

import type { ReactNode } from "react";
import { m } from "framer-motion";

// The panel's segmented control, design B: a pill row where the selected
// option's cream pill glides between options with a spring. `idBase` must be
// unique per mounted instance — it keys the shared layout animation.
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
  return (
    <div className={`lbd-sc${size === "sm" ? " lbd-sc--sm" : ""}`} role="group">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} type="button" aria-pressed={active} onClick={() => onChange(o.id)} className={active ? "is-on" : undefined}>
            {active && (
              <m.span
                layoutId={`seg-${idBase}`}
                transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                className="lbd-sc-pill"
              />
            )}
            <span className="lbd-sc-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
