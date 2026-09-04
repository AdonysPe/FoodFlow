"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/ThemeContext";
import { IconMoon, IconSun } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Light/dark switch. Two slots rather than one morphing glyph, so both states
 * are visible at rest and the control says what it does before you press it —
 * and it sits in the same 36px pill family as the language switch beside it.
 *
 * The knob is the only thing that moves: it slides under the target icon on a
 * spring while the two glyphs trade weight. Renders nothing on routes that do
 * not offer the theme yet, so the navbar is unchanged everywhere else.
 */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme, available } = useTheme();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  if (!available) return null;

  const light = theme === "light";
  const copy = t.nav.theme ?? {};
  const label = light ? copy.toDark : copy.toLight;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={light}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-9 w-[4.4rem] items-center rounded-lg border border-cream/10 bg-cream/[0.04] p-1 transition-colors duration-200 hover:border-cream/20 ${className}`}
    >
      <motion.span
        aria-hidden
        layout
        initial={false}
        animate={{ x: light ? "100%" : "0%" }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 480, damping: 34 }
        }
        className="absolute left-1 top-1 h-7 w-[1.85rem] rounded-md bg-cream/[0.1] shadow-[inset_0_1px_0_0_var(--soft-inset)]"
      />
      {[
        { on: !light, Icon: IconMoon },
        { on: light, Icon: IconSun },
      ].map(({ on, Icon }, i) => (
        <span
          key={i}
          className={`relative z-10 flex h-7 flex-1 items-center justify-center transition-colors duration-300 ${
            on ? "text-fg" : "text-cream/40"
          }`}
        >
          <Icon className="h-[15px] w-[15px]" />
        </span>
      ))}
    </button>
  );
}
