"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  m as motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

// Root-relative so the anchors still work when you are on /precios.
// Six links plus both buttons need more than a tablet gives, so the full
// bar waits for `lg` and everything below that uses the sheet.
const HREFS = [
  "/#features",
  "/#product",
  "/calculadora",
  "/precios",
  "/preguntas",
  "/nosotros",
];

// Apple's sheet curve: a quick start that settles long and soft.
const SHEET_EASE = [0.32, 0.72, 0, 1];

export default function Navbar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const links = t.nav.links.map((label, i) => ({ label, href: HREFS[i] }));
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const toggleRef = useRef(null);
  const sheetRef = useRef(null);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // Lock the page while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // A new route, or a window grown past the breakpoint where the full bar
  // takes over, both leave nothing for the sheet to do.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  // Escape closes; Tab stays inside the sheet and the bar above it (the
  // close button lives there), so focus can't wander into the page behind.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const header = sheetRef.current?.closest("header");
      if (!header) return;
      const focusable = [...header.querySelectorAll("a[href], button:not([disabled])")].filter(
        (el) => el.offsetParent !== null
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <motion.header
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      // Above the WhatsApp and chat buttons (z-70) while the sheet covers the
      // screen, so they don't float over the menu; under the load curtain.
      className={`fixed inset-x-0 top-0 ${open ? "z-[78]" : "z-50"}`}
    >
      <div
        className={`relative z-10 transition-all duration-500 ${
          scrolled && !open
            ? "border-b border-cream/10 bg-ink-950/70 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <Container>
          <nav className="flex h-16 items-center justify-between gap-6 sm:h-18">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
                FoodFlow
              </span>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-lg px-3.5 py-2 text-[14px] font-medium text-cream/66 transition-colors hover:text-fg"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2.5 lg:flex">
              <ThemeToggle />
              <LanguageToggle />
              <Button href="/login" variant="ghost" size="md">
                {t.nav.signIn}
              </Button>
              <Button href="/#contacto" variant="primary" size="md">
                {t.nav.startFree}
              </Button>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <LanguageToggle />
              <motion.button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                whileTap={{ scale: 0.9 }}
                aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
                aria-expanded={open}
                aria-controls="mobile-menu"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-cream/10 bg-cream/[0.04] transition-colors duration-300 hover:bg-cream/[0.08]"
              >
                <span className="sr-only">Menu</span>
                <motion.span
                  animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute h-px w-4 bg-fg"
                />
                <motion.span
                  animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute h-px w-4 bg-fg"
                />
              </motion.button>
            </div>
          </nav>
        </Container>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.menu}
            key="sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, ease: SHEET_EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: SHEET_EASE, delay: 0.08 } }}
            onAnimationComplete={(definition) => {
              // Once it has faded in (not out — the exiting copy still has
              // open=true in its closure), hand focus to the first link so a
              // keyboard or screen-reader user starts inside the menu.
              if (definition?.opacity === 1) {
                sheetRef.current?.querySelector("a")?.focus({ preventScroll: true });
              }
            }}
            className="fixed inset-0 flex h-dvh flex-col overflow-y-auto overscroll-contain bg-ink-950/85 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
          >
            {/* the same warm light the hero sits under, so the sheet feels
                like a layer of the page rather than a different screen */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.16),transparent_65%)] blur-3xl"
            />

            <Container className="relative flex flex-1 flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20 sm:pt-24">
              <nav aria-label={t.nav.menu}>
                <motion.ul
                  initial="hidden"
                  animate="show"
                  exit="hide"
                  variants={{
                    show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
                    hide: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
                  }}
                >
                  {links.map((l, i) => {
                    const current = !l.href.includes("#") && pathname === l.href;
                    return (
                      <motion.li
                        // Index key: the label is translated, and a text key
                        // would remount the row on every language switch.
                        key={i}
                        variants={{
                          hidden: { opacity: 0, y: -14, filter: "blur(6px)" },
                          show: {
                            opacity: 1,
                            y: 0,
                            filter: "blur(0px)",
                            transition: { duration: 0.5, ease: SHEET_EASE },
                          },
                          hide: {
                            opacity: 0,
                            y: -8,
                            filter: "blur(4px)",
                            transition: { duration: 0.2, ease: SHEET_EASE },
                          },
                        }}
                        className="border-b border-cream/[0.08]"
                      >
                        <Link
                          href={l.href}
                          onClick={close}
                          aria-current={current ? "page" : undefined}
                          className="group flex items-center justify-between gap-4 py-4 outline-none"
                        >
                          <span
                            className={`font-display text-[28px] font-semibold leading-none tracking-[-0.03em] transition-colors duration-300 sm:text-[32px] ${
                              current ? "text-fg" : "text-cream/78 group-hover:text-fg group-focus-visible:text-fg"
                            }`}
                          >
                            {l.label}
                          </span>
                          <span
                            aria-hidden
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-active:scale-90 ${
                              current
                                ? "bg-accent-400 text-on-accent"
                                : "bg-cream/[0.05] text-cream/45 group-hover:bg-cream/[0.1] group-hover:text-fg group-focus-visible:bg-cream/[0.1] group-focus-visible:text-fg"
                            }`}
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m6 3.5 4.5 4.5L6 12.5" />
                            </svg>
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: SHEET_EASE, delay: 0.3 } }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.18, ease: SHEET_EASE } }}
                className="mt-auto flex flex-col gap-2.5 pt-10"
              >
                <Button href="/#contacto" variant="primary" size="lg" onClick={close}>
                  {t.nav.startFree}
                </Button>
                <Button href="/login" variant="secondary" size="lg" onClick={close}>
                  {t.nav.signIn}
                </Button>
              </motion.div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
