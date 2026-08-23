"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Two-letter language switch. Shows the language you'd switch *to* (matching
 * how most sites label these), so it reads "ES" in English and "EN" in
 * Spanish.
 */
export default function LanguageToggle({ className = "" }) {
  const { t, lang, toggleLang } = useLanguage();

  // The label names the language you'd switch *to*, phrased in whichever
  // language is showing right now.
  const label =
    lang === "en" ? `Switch to ${t.nav.langName}` : `Cambiar a ${t.nav.langName}`;

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-white/70 transition-colors duration-200 hover:border-white/20 hover:text-white ${className}`}
    >
      <span className="tabular-nums">{t.nav.langToggle}</span>
    </button>
  );
}
