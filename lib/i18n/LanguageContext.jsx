"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { dictionaries, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "./dictionaries";

const LanguageContext = createContext(null);

/**
 * The choice, remembered outside React.
 *
 * The provider lives inside SiteShell, and SiteShell is mounted by each page
 * rather than by a shared layout, so every client-side navigation unmounts and
 * remounts it. With the language kept only in component state that meant the
 * page came back in Spanish on every link click and then flipped to English a
 * beat later — and worse, the persistence effect wrote that default straight
 * back over the stored choice, so English survived exactly one page.
 *
 * A module-level variable outlives the remount (the module stays loaded for
 * the life of the document), so the second and every later page renders in the
 * right language from its very first frame.
 */
let remembered = null;

/** `useLayoutEffect` on the client, `useEffect` on the server, without the warning. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LanguageProvider({ children }) {
  // First render of the document must match what the server sent, so it starts
  // at the default; every later mount in the same document starts already
  // correct.
  const [lang, setLangState] = useState(() => remembered ?? DEFAULT_LOCALE);

  /**
   * Switching language re-renders every translated component on the page at
   * once — the whole marketing site hangs off this provider. As a transition,
   * React builds the new tree in interruptible chunks and keeps the current
   * one interactive until it is ready, so the swap lands in one paint instead
   * of a stutter.
   */
  // `pending` is deliberately not put on the context: it flips twice per
  // switch, and any consumer of the context re-renders with it — two extra
  // passes over the whole tree to power a spinner nothing shows.
  const [, startTransition] = useTransition();

  // Until the stored choice has been read, nothing may be written back: that
  // is the write that used to destroy it.
  const restored = useRef(remembered != null);

  // Layout effect, not effect: this runs before the browser paints, so a
  // returning visitor never sees a frame of the language they did not pick.
  useIsomorphicLayoutEffect(() => {
    if (restored.current) return;
    let stored = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // Private mode or blocked storage: the default is the right answer.
    }
    restored.current = true;
    if (stored && dictionaries[stored] && stored !== lang) {
      remembered = stored;
      setLangState(stored);
    }
    // Runs once per mount; `lang` is only read to skip a needless setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only mirrors the state onto the document; persistence belongs to the two
  // handlers below, because "the user picked this" and "the state happens to
  // be this right now" are not the same event — conflating them is what let a
  // remount's default overwrite a real choice.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const commit = useCallback((next) => {
    remembered = next;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Blocked storage: the choice still holds for the rest of the session,
      // because `remembered` is what the next mount reads first.
    }
    startTransition(() => setLangState(next));
  }, []);

  const setLang = useCallback(
    (next) => {
      if (dictionaries[next]) commit(next);
    },
    [commit]
  );

  const toggleLang = useCallback(() => {
    commit((remembered ?? DEFAULT_LOCALE) === "en" ? "es" : "en");
  }, [commit]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t: dictionaries[lang] }),
    [lang, setLang, toggleLang]
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
