"use client";

import Link from "next/link";
import { m as motion } from "framer-motion";

// A route link that still takes framer's hover/tap props.
const MotionLink = motion.create(Link);

const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-50";

const sizes = {
  md: "h-11 px-5",
  lg: "h-13 px-7 text-[15px]",
};

const variants = {
  // Lime fill with an inner highlight — reads as the one true action.
  primary:
    "bg-linear-to-b from-accent-300 to-accent-500 text-on-accent shadow-accent-btn hover:to-accent-400",
  // Glass secondary that brightens on hover.
  secondary:
    "glass text-cream/90 hover:bg-cream/[0.09] hover:text-fg shadow-card",
  // For use *on* an accent-filled surface, where the fill would disappear.
  invert:
    "bg-ink-950 text-accent-icon hover:bg-ink-900 focus-visible:ring-ink-950/70 focus-visible:ring-offset-accent-400",
  ghost: "text-cream/70 hover:text-fg",
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
  // Hash links stay plain anchors; real routes go through the router so the
  // page transition plays instead of a full reload.
  const isRoute = typeof href === "string" && href.startsWith("/");
  const Tag = isRoute ? MotionLink : href ? motion.a : motion.button;

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
          {/* Sheen sweep on hover. Literally white in both themes, not `fg`:
              this is a glint of light travelling across a vermilion fill, and
              the fill is the same colour on paper as it is on warm black. */}
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
