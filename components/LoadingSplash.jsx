"use client";

import { useLayoutEffect, useRef } from "react";
import { lbFontClasses } from "@/components/landing/lbFonts";

const MARK = "FoodFlow".split("");

/**
 * The loading splash — option A ("Respira") of the splash prototype: the
 * wordmark arrives letter by letter out of a blur, the vermilion dot lands and
 * breathes, a hairline runs underneath. It fades in only after a beat, so a
 * fast load never flashes it.
 *
 * Full screen it is every route's `loading` fallback. When the page arrives
 * React drops the fallback at once; a copy of it is left over the new page and
 * lifts like a curtain. `contained` fills the panel's content area instead,
 * under the sidebar, and simply gives way.
 */
export default function LoadingSplash({ contained = false }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (contained) return undefined;
    const node = ref.current;
    const shownAt = performance.now();
    return () => {
      // Gone before it faded in (or a dev double-mount), or the reader asked
      // for less motion: nothing to lift.
      if (!node || performance.now() - shownAt < 450) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const curtain = node.cloneNode(true);
      curtain.classList.add("is-exit");
      curtain.removeAttribute("role");
      curtain.setAttribute("aria-hidden", "true");
      const remove = () => curtain.remove();
      curtain.addEventListener("animationend", (event) => { if (event.animationName === "lb-splash-lift") remove(); });
      window.setTimeout(remove, 1600);
      document.body.appendChild(curtain);
    };
  }, [contained]);

  return (
    <div ref={ref} className={`${lbFontClasses} lb-splash${contained ? " lb-splash--contained" : ""}`} role="status" aria-live="polite">
      <span className="lb-splash-glow" aria-hidden="true" />
      <div className="lb-splash-layer">
        <span className="lb-splash-mark" aria-hidden="true">
          <span>
            {MARK.map((letter, index) => (
              <span key={index} className="lb-splash-letter" style={{ animationDelay: `${(0.3 + index * 0.055).toFixed(3)}s` }}>
                {letter}
              </span>
            ))}
          </span>
          <span className="lb-splash-dot" />
        </span>
        <span className="lb-splash-track" aria-hidden="true">
          <span />
        </span>
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  );
}
