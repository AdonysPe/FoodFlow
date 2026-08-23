"use client";

import { motion } from "framer-motion";
import { fadeUp, stagger, viewportOnce } from "@/lib/motion";

/**
 * Scroll-triggered reveal. Wrap anything; pass `as` to keep semantics.
 * `delay` staggers siblings without needing a parent container.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  variants = fadeUp,
  as = "div",
  ...rest
}) {
  const Tag = motion[as] ?? motion.div;

  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Parent that staggers `Reveal`-less children using the same curve. */
export function RevealGroup({
  children,
  className = "",
  gap = 0.09,
  delay = 0,
  ...rest
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(gap, delay)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "", variants = fadeUp, ...rest }) {
  return (
    <motion.div className={className} variants={variants} {...rest}>
      {children}
    </motion.div>
  );
}
