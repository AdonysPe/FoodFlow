"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The band under the hero, B design: the same list as before, set large in
 * the display face with a vermilion dot between items. Same seamless loop
 * as the original (two copies, translate -50%, track sized by its content),
 * and the global reduced-motion rule still stops it.
 */
export default function LandingMarquee() {
  const { t } = useLanguage();
  const items = t.marquee;

  return (
    <section aria-label={t.features.eyebrow} className="border-y border-cream/[0.08] py-6">
      <div className="fade-edges overflow-hidden">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-14 whitespace-nowrap pr-14"
            >
              {items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-14 font-display text-[24px] font-medium tracking-[-0.03em] text-cream/40 sm:text-[28px]"
                >
                  {item}
                  <span aria-hidden className="h-2 w-2 rounded-full bg-accent-400" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
