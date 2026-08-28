"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { LogoMark } from "@/components/ui/Logo";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, INTRO_DELAY } from "@/lib/motion";

// Root-relative so the anchors still work when you are on /precios.
const HREFS = ["/#features", "/#product", "/precios", "/preguntas", "/#nosotros"];

export default function Navbar() {
  const { t } = useLanguage();
  const links = t.nav.links.map((label, i) => ({ label, href: HREFS[i] }));
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const intro = useReducedMotion() ? 0 : INTRO_DELAY;

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // Lock the page while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay: intro + 0.1 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? "border-b border-cream/10 bg-ink-950/70 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <Container>
          <nav className="flex h-16 items-center justify-between gap-6 sm:h-18">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-white">
                FoodFlow
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="relative rounded-lg px-3.5 py-2 text-[14px] font-medium text-cream/66 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2.5 md:flex">
              <LanguageToggle />
              <Button href="/login" variant="ghost" size="md">
                {t.nav.signIn}
              </Button>
              <Button href="/#cta" variant="primary" size="md">
                {t.nav.startFree}
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <LanguageToggle />
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
                aria-expanded={open}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-cream/10 bg-cream/[0.04]"
              >
                <span className="sr-only">Menu</span>
                <motion.span
                  animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute h-px w-4 bg-white"
                />
                <motion.span
                  animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute h-px w-4 bg-white"
                />
              </button>
            </div>
          </nav>
        </Container>
      </div>

      {/* The sheet stays mounted and animates height in both directions, so
          opening and closing use the same curve. `inert` keeps it out of the
          tab order and off the pointer while it is closed. */}
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.32, ease: EASE }}
        inert={!open}
        className="overflow-hidden border-b border-cream/10 bg-ink-950/95 backdrop-blur-2xl md:hidden"
        style={{ borderBottomWidth: open ? 1 : 0 }}
      >
        <Container className="py-5">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-[15px] font-medium text-cream/70 transition-colors hover:bg-cream/[0.05] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              href="/login"
              variant="secondary"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.nav.signIn}
            </Button>
            <Button
              href="#cta"
              variant="primary"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.nav.startFree}
            </Button>
          </div>
        </Container>
      </motion.div>
    </motion.header>
  );
}
