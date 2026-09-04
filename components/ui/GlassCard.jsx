"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PointerGlow from "@/components/ui/PointerGlow";

/**
 * Glass surface with a cursor-tracked radial highlight and a hairline
 * gradient border that lights up on hover. The highlight itself lives in
 * PointerGlow, which the landing panels use too, so there is one
 * implementation of it rather than two that drift.
 */
export default function GlassCard({
  children,
  className = "",
  glowColor = "255,90,51",
  hoverLift = true,
  ...rest
}) {
  const [active, setActive] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      whileHover={hoverLift ? { y: -6 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-2xl border border-cream/10 bg-cream/[0.028] backdrop-blur-xl shadow-card ${className}`}
      {...rest}
    >
      <PointerGlow color={glowColor} />
      {/* top hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px hairline-top opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* border glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset transition-all duration-500 ${
          active ? "ring-cream/[0.14]" : "ring-transparent"
        }`}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
