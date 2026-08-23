"use client";

import { MotionConfig } from "framer-motion";

/**
 * Framer Motion animates in JS, so the `prefers-reduced-motion` rules in
 * globals.css (which only reach CSS animations and transitions) do not cover
 * it. `reducedMotion="user"` makes motion skip transform-based animation for
 * those users and settle straight on the final state.
 */
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
