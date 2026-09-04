"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CONSENT, readConsent, saveConsent } from "@/lib/consent";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, INTRO_DELAY } from "@/lib/motion";

/**
 * Cookie notice: one centred bar at the bottom, out of the corners so it
 * collides with nothing (the chat sits bottom-right). It appears once the
 * load curtain is gone and only when no choice is stored — read after mount,
 * never during render, so server and client markup match.
 */
export default function CookieBanner() {
  const { t } = useLanguage();
  const c = t.cookies.banner;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent()) return;
    const timer = setTimeout(() => setVisible(true), (INTRO_DELAY + 1.1) * 1000);
    return () => clearTimeout(timer);
  }, []);

  const decide = (value) => {
    saveConsent(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label={t.cookies.page.title}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: EASE }}
          // above the corner stack on phones (chat pill, then WhatsApp),
          // centred on wider screens
          className="liquid fixed inset-x-3 bottom-40 z-[75] rounded-2xl px-4 py-4 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[min(46rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:px-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/12 text-accent-ink ring-1 ring-inset ring-accent-400/25"
            >
              <CookieIcon />
            </span>

            <p className="flex-1 text-[13.5px] leading-relaxed text-cream/75">
              {c.text}{" "}
              <Link
                href="/cookies"
                className="font-medium text-cream/90 underline underline-offset-4 decoration-cream/30 transition-colors hover:text-fg hover:decoration-cream/70"
              >
                {c.more}
              </Link>
            </p>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => decide(CONSENT.necessary)}
                className="rounded-lg border border-cream/15 px-4 py-2 text-[13.5px] font-medium text-cream/75 transition-colors hover:border-cream/30 hover:text-fg"
              >
                {c.reject}
              </button>
              <button
                type="button"
                onClick={() => decide(CONSENT.all)}
                className="rounded-lg bg-accent-400 px-4 py-2 text-[13.5px] font-semibold text-on-accent shadow-accent transition-transform duration-200 hover:-translate-y-0.5"
              >
                {c.accept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CookieIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 3.2 3.2 0 0 1-4-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="14" cy="16" r="1" fill="currentColor" />
      <circle cx="8.5" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}
