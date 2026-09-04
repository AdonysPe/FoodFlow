"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-tracked highlight for a panel: a soft radial that follows the
 * pointer across the surface, so a card lights up where you are looking
 * instead of switching to a flat hover state.
 *
 * Drop it as the first child of a panel that is `group relative
 * overflow-hidden`. It attaches its listener to that parent — it has to,
 * because the overlay itself is `pointer-events-none` and must not sit
 * between the panel and its own clicks. Position is written to CSS custom
 * properties rather than React state, so tracking the cursor costs no
 * re-renders.
 *
 * Skipped entirely on touch pointers: there is no cursor to follow, and the
 * listener would only fire on tap.
 */
export default function PointerGlow({
  /** Diameter of the highlight, in px. */
  radius = 340,
  /** Comma-separated RGB channels. Defaults to the vermilion. */
  color = "255, 90, 51",
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${className}`}
      style={{
        background: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 0%), rgba(${color}, var(--glow-strength)), transparent 65%)`,
      }}
    />
  );
}
