"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "ff-theme";

// The page ground of each theme, mirrored from --color-ink-950 in
// globals.css. Only the browser-chrome meta tag reads these; everything
// visible takes its colour from the stylesheet.
const GROUND = { dark: "#0c0908", light: "#f6f2ea" };

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

/**
 * Paints the theme. Deliberately plain DOM work rather than React state:
 * flipping the attribute is what repaints the page, and it has to happen
 * synchronously inside the view transition below, which React's effects
 * (which run after paint) cannot promise.
 */
function paint(theme) {
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", GROUND[theme] ?? GROUND.dark);
}

/**
 * Light/dark for the whole site.
 *
 * The theme itself is entirely CSS: `data-theme="light"` on <html> re-points
 * the token ladder in globals.css. Nothing here knows about colours — it owns
 * the attribute, the stored preference, and how the swap is animated.
 *
 * Dark stays the default even for a visitor whose OS is set to light: the
 * brand is a dark one, and leaving the theme the site was designed in should
 * take a deliberate click. (Following the OS instead is one matchMedia call
 * here plus the same check in the layout's pre-paint script.)
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const current = useRef("dark");

  // Catch React up to whatever the pre-paint script already decided. Read
  // after mount rather than in the initial state so the server and the first
  // client render agree; the page is painted correctly by then, so this only
  // moves the toggle's knob into place.
  useEffect(() => {
    let saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private mode: stay on the default */
    }
    const initial = saved === "light" ? "light" : "dark";
    current.current = initial;
    paint(initial);
    setTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = current.current === "dark" ? "light" : "dark";
    current.current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* nothing to remember it with; the session still switches */
    }

    // Flipping the attribute invalidates every custom property on the
    // document, so the browser restyles and repaints the entire page — and
    // every frosted panel re-runs its backdrop blur while it does. Animating
    // that live (a CSS transition on the ground colour) means paying for it
    // on every frame of the animation. A view transition instead pays once:
    // the browser snapshots the page, swaps the theme in one frame, and
    // cross-fades the two snapshots on the compositor.
    const commit = () => {
      paint(next);
      // The snapshot is taken when this callback returns, so the toggle's own
      // knob has to have moved by then or it would pop afterwards.
      flushSync(() => setTheme(next));
    };

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof document.startViewTransition === "function" && !reduced) {
      document.startViewTransition(commit);
    } else {
      // Firefox, older Safari, or someone who asked for less motion: the swap
      // is instant, which is the fastest it can possibly be.
      commit();
    }
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Runs before the first paint, inlined in the root layout. Without it a
 * visitor who chose light gets a black frame first, which is worse than no
 * light mode at all. Kept to one expression and wrapped in try/catch because
 * a throw here would take the whole document with it.
 */
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem("${STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}})()`;
