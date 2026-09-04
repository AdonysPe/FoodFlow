"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "./dictionaries";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LOCALE);

  // Pick up a saved choice after mount — reading localStorage during render
  // would mismatch the server-rendered markup and trigger a hydration warning.
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && dictionaries[stored]) setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (next) => {
        if (dictionaries[next]) setLangState(next);
      },
      toggleLang: () => setLangState((prev) => (prev === "en" ? "es" : "en")),
      t: dictionaries[lang],
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

/**
 * Same context, but null instead of a throw when there is no provider.
 *
 * For the handful of controls that live on both sides of the site: the
 * marketing shell is bilingual, the dashboard and the sign-in screen are
 * Spanish-only and never mount LanguageProvider. A component that works in
 * both takes the translation when there is one and falls back to its own
 * copy when there is not.
 */
export function useOptionalLanguage() {
  return useContext(LanguageContext);
}
