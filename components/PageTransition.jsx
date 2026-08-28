"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

/**
 * Route change animation. Keyed on the pathname, so every navigation mounts a
 * fresh tree that rises into place while a hairline of accent sweeps across
 * the top — the same gesture as the load curtain, at a quarter of the length.
 *
 * Deliberately entrance-only: an exit animation would make the router wait on
 * a frame that a backgrounded tab never paints.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <>
      <motion.span
        key={`sweep-${pathname}`}
        aria-hidden
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.75, ease: EASE, times: [0, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[65] h-0.5 origin-left bg-linear-to-r from-accent-400 via-accent-300 to-transparent"
      />

      <motion.main
        key={pathname}
        id="main"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative"
      >
        {children}
      </motion.main>
    </>
  );
}
