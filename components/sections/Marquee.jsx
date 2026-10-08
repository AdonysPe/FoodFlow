"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The band under the hero: five promises in the display face, a vermilion
 * dot between them. Two copies, translated by exactly -50%, so the loop has
 * no seam at any width.
 */
export default function Marquee() {
  const { t } = useLanguage();
  const items = t.landing.marquee;
  const run = (copy) =>
    items.flatMap((item, i) => [
      <span key={`${copy}-t${i}`}>{item}</span>,
      <i key={`${copy}-d${i}`}>●</i>,
    ]);
  return (
    <div className="lb-marquee" aria-hidden>
      <div className="lb-marquee-track">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
