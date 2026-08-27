"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Glass surface with a cursor-tracked radial highlight and a hairline
 * gradient border that lights up on hover. Pointer position is written to
 * CSS custom properties so the highlight costs no React re-renders.
 */
export default function GlassCard({
  children,
  className = "",
  glowColor = "255,90,51",
  hoverLift = true,
  ...rest
}) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      whileHover={hoverLift ? { y: -6 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-2xl border border-cream/10 bg-cream/[0.028] backdrop-blur-xl shadow-card ${className}`}
      style={{ "--glow": glowColor }}
      {...rest}
    >
      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), rgba(var(--glow),0.16), transparent 65%)",
        }}
      />
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
