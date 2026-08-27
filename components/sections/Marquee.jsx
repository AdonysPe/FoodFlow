"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Edge-to-edge band of what the pilot includes. The track holds the list
 * twice and translates by exactly -50%, so the loop has no visible seam.
 * CSS-driven, so `prefers-reduced-motion` in globals.css stops it.
 */
export default function Marquee() {
  const { t } = useLanguage();
  const items = t.marquee;

  return (
    <section
      aria-label={t.features.eyebrow}
      className="border-y border-cream/10 bg-ink-900/60 py-4.5"
    >
      <div className="fade-edges overflow-hidden">
        <div className="flex w-[200%] animate-marquee">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex w-1/2 shrink-0 items-center justify-around gap-11 whitespace-nowrap pr-11"
            >
              {items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-11 text-[13px] font-medium uppercase tracking-[0.18em] text-cream/55"
                >
                  {item}
                  <span aria-hidden className="text-accent-400">
                    /
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
