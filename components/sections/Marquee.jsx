"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Edge-to-edge band of what the pilot includes. The track holds the list
 * twice and translates by exactly -50%, so the loop has no visible seam.
 * CSS-driven, so `prefers-reduced-motion` in globals.css stops it.
 *
 * The track is sized by its content (`w-max`), never as a percentage of the
 * viewport: a copy pinned to 50% of the screen is narrower than the words it
 * holds on a phone, so the two copies overlap and -50% stops landing on a
 * copy boundary. Content width keeps the seam exact at any screen size.
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
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-11 whitespace-nowrap pr-11"
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
