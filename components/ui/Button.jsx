"use client";

import { motion } from "framer-motion";

const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-50";

const sizes = {
  md: "h-11 px-5",
  lg: "h-13 px-7 text-[15px]",
};

const variants = {
  // Lime fill with an inner highlight — reads as the one true action.
  primary:
    "bg-linear-to-b from-accent-300 to-accent-500 text-ink-950 shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset,0_18px_40px_-18px_rgba(205,241,77,0.7)] hover:to-accent-400",
  // Glass secondary that brightens on hover.
  secondary:
    "glass text-cream/90 hover:bg-cream/[0.09] hover:text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]",
  // For use *on* an accent-filled surface, where the fill would disappear.
  invert:
    "bg-ink-950 text-accent-400 hover:bg-ink-900 focus-visible:ring-ink-950/70 focus-visible:ring-offset-accent-400",
  ghost: "text-cream/70 hover:text-white",
};

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  ...rest
}) {
  const Tag = href ? motion.a : motion.button;

  return (
    <Tag
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      {...rest}
    >
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
          {/* sheen sweep on hover */}
          <span className="absolute -inset-y-8 -left-1/3 w-1/3 rotate-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%]" />
        </span>
      )}
      <span className="relative flex items-center gap-2">
        {children}
        {icon}
      </span>
    </Tag>
  );
}
