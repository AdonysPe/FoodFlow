"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "ff-theme";

// The page ground of each theme, mirrored from --color-ink-950 in
// globals.css. Only the browser-chrome meta tag reads these; everything
// visible takes its colour from the stylesheet.
const GROUND = { dark: "#0c0908", light: "#f6f2ea" };

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  /** Whether this route offers the switch at all. */
  available: false,
});

/**
 * Light/dark for the site.
 *
 * The whole theme is CSS: `data-theme="light"` on <html> re-points the token
 * ladder in globals.css, so nothing here knows about colours — it only owns
 * the attribute, the preference, and who is allowed to change it.
 *
 * `enabled` is the rollout switch. Only the routes that pass it get the
 * toggle and get the attribute applied; everywhere else stays on the dark
 * design as-is. The matching pre-paint script in the root layout uses the
 * same rule, so the two never disagree.
 *
 * Dark stays the default even for a visitor whose OS is set to light: the
 * brand is a dark one, and landing on the theme the site was designed in
 * should take a deliberate click to leave. (Following the OS instead is one
 * matchMedia call here plus the same check in the layout script.)
 */
export function ThemeProvider({ children, enabled = false }) {
  const [theme, setTheme] = useState("dark");

  // Pick up what the pre-paint script already decided. Read after mount
  // rather than in the initial state so the server and the first client
  // render agree; the page is already painted in the right theme by then,
  // so this only catches React up.
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* private mode: stay on the default */
    }
  }, [enabled]);

  // Dark is the absence of the attribute, so a route that does not offer the
  // switch cleans it off on the way in — that is what keeps the rollout to
  // the landing page even though the preference is stored site-wide. The
  // browser chrome is repainted from the same place, since the meta tag the
  // layout ships is a static default.
  useEffect(() => {
    const root = document.documentElement;
    const light = enabled && theme === "light";
    if (light) root.dataset.theme = "light";
    else delete root.dataset.theme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? GROUND.light : GROUND.dark);
  }, [enabled, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* nothing to remember it with; the session still switches */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, available: enabled }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Runs before the first paint, inlined in the root layout. Without it a
 * visitor who chose light gets a black frame first, which is worse than no
 * light mode at all. Kept to one expression and wrapped in try/catch because
 * a throw here would take the whole document with it.
 */
export const THEME_SCRIPT = `(function(){try{if(location.pathname!=="/")return;if(localStorage.getItem("${STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}})()`;
