"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconWhatsApp } from "@/components/ui/Icons";
import { buildWhatsAppUrl } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

/** How far down the page counts as "reading", not "landed". */
const SCROLL_TRIGGER = 220;
/** The pause after that scroll, so the button does not chase the cursor. */
const APPEAR_DELAY = 2000;

/**
 * The green button in the corner. It is the third way to reach us — after
 * the form and the chat — and the one that costs a visitor nothing: their
 * own WhatsApp opens with the first message already written.
 *
 * It stays out of the way rather than floating over everything: it waits
 * until someone has scrolled, and it steps aside while the lead form or the
 * footer is on screen, so it never sits on top of another call to action.
 */
export default function WhatsAppFab() {
  const { t } = useLanguage();
  const copy = t.whatsapp;
  const url = buildWhatsAppUrl(copy.message);

  const [armed, setArmed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Arm on the first real scroll, then wait out the delay.
  useEffect(() => {
    let timer;

    const onScroll = () => {
      if (window.scrollY < SCROLL_TRIGGER) return;
      window.removeEventListener("scroll", onScroll);
      timer = setTimeout(() => setArmed(true), APPEAR_DELAY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // someone may arrive already scrolled, e.g. on a hash link

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  // Hide while a competing call to action owns the screen: the lead form
  // section and the footer both live in the same corner on a phone.
  //
  // Measured against the viewport on scroll rather than watched with an
  // IntersectionObserver — the sections are swapped by the page transition,
  // so what needs re-checking is the geometry, not a fixed set of nodes.
  useEffect(() => {
    const update = () => {
      const blockers = [
        document.querySelector("#contacto"),
        document.querySelector("footer"),
      ].filter(Boolean);

      setBlocked(
        blockers.some((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!url) return null;

  return (
    <AnimatePresence>
      {armed && !blocked && (
        <motion.a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.label}
          title={copy.tooltip}
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.4, ease: EASE }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.95 }}
          // Sits one step above the chat launcher, which owns the corner.
          className="group fixed bottom-[5.5rem] right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-fg shadow-[0_12px_26px_-12px_rgba(37,211,102,0.7)] transition-colors duration-300 hover:bg-[#1fbe5b] sm:bottom-[6.25rem] sm:right-6"
        >
          {/* one slow ring outward — a heartbeat, not a strobe */}
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity, repeatDelay: 1.2 }}
            className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366]"
          />
          <IconWhatsApp className="relative h-7 w-7" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
