"use client";

import { usePathname } from "next/navigation";

/**
 * Route change animation. Keyed on the pathname so CSS restarts the transition
 * for each navigation. The content's resting state is fully visible: browser
 * throttling in a background tab can delay the flourish, never the page.
 *
 * CSS keeps this off Framer Motion's runtime path and lets the global reduced-
 * motion rule collapse it without any hydration work.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <>
      <span
        key={`sweep-${pathname}`}
        aria-hidden
        className="page-transition-sweep pointer-events-none fixed inset-x-0 top-0 z-[65] h-0.5 origin-left bg-linear-to-r from-accent-400 via-accent-300 to-transparent"
      />

      <main
        key={pathname}
        id="main"
        className="page-transition-content relative"
      >
        {children}
      </main>
    </>
  );
}
