"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PointerGlow from "@/components/ui/PointerGlow";
import dynamic from "next/dynamic";
import { IconArrowRight, IconCheck, IconPlay } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, INTRO_DELAY } from "@/lib/motion";

/**
 * Three.js is ~126 kB gzipped — more than half of everything the home page
 * shipped, for a decorative field that is `aria-hidden` and carries no
 * content. Loaded on demand and client-only: the CSS glow and the grid floor
 * underneath already stand on their own, so nothing is missing while it
 * arrives, and nothing moves when it does — the canvas is absolutely
 * positioned inside an `isolate` section, so it never touches layout.
 */
const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), {
  ssr: false,
});

export default function Hero() {
  const { t } = useLanguage();
  const { headlineWords: words, offer } = t.hero;
  const ref = useRef(null);

  // Hold the entrance until the load curtain starts lifting.
  const intro = useReducedMotion() ? 0 : INTRO_DELAY;

  // The offer card drifts up a touch slower than the copy as the hero
  // leaves. Spring-smoothed so it never reads as stepped.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });
  const cardY = useTransform(smooth, [0, 1], [0, -48]);
  const copyY = useTransform(smooth, [0, 1], [0, 40]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-24 pb-14 sm:pt-28 sm:pb-20 lg:pt-32 lg:[@media(max-height:820px)]:pt-24"
    >
      <ThreeBackground className="opacity-60" />

      {/* lime core glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[42%] top-[-24rem] -z-10 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.16),transparent_62%)] blur-3xl"
      />

      {/* grid floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem] grid-mask opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ---------------------------------------------------------- copy */}
          <motion.div style={{ y: copyY }} className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: intro + 0.1 }}
            >
              <Badge>{t.hero.badge}</Badge>
            </motion.div>

            <h1 className="mt-6 font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.85rem] lg:[@media(max-height:820px)]:text-[3.3rem]">
              {words.map((word, i) => (
                // whitespace-pre keeps the real space inside the span, so the
                // accessible name and copy-paste read as words, not one blob.
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.75, ease: EASE, delay: intro + 0.18 + i * 0.06 }}
                  className="inline-block whitespace-pre text-gradient"
                >
                  {`${word} `}
                </motion.span>
              ))}

              <motion.span
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: EASE, delay: intro + 0.18 + words.length * 0.06 }}
                className="relative inline-block text-accent-icon"
              >
                {t.hero.headlineAccent}
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.9, ease: EASE, delay: intro + 0.9 }}
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-linear-to-r from-accent-400/0 via-accent-400 to-accent-400/0"
                />
              </motion.span>

              <motion.span
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, ease: EASE, delay: intro + 0.3 + words.length * 0.06 }}
                className="block text-gradient"
              >
                {t.hero.headlineTail}
              </motion.span>
            </h1>

            {/* The h1 above sells the promise ("en 48 horas"); this says what
                the thing actually is, which is what a search for "sistema para
                restaurantes Lima" needs to find in a heading. Deliberately one
                short line, and the paragraph below tightens its top margin to
                match — the hero is tuned to the fold and must not grow. */}
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: intro + 0.5 }}
              className="mt-5 max-w-xl text-pretty font-display text-[17px] font-semibold leading-snug tracking-[-0.015em] text-cream/75 sm:text-[18px]"
            >
              {t.hero.tagline}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: intro + 0.58 }}
              className="mt-3.5 max-w-xl text-pretty text-[16px] leading-relaxed text-cream/60"
            >
              {t.hero.subheadline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: intro + 0.7 }}
              className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            >
              <Button
                href="#contacto"
                size="lg"
                className="w-full sm:w-auto"
                icon={
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                }
              >
                {t.hero.ctaPrimary}
              </Button>
              <Button
                href="#product"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                icon={<IconPlay className="h-4 w-4 opacity-70" />}
              >
                {t.hero.ctaSecondary}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: intro + 0.78 }}
              className="mt-3.5 text-[13px] text-cream/55"
            >
              {t.hero.ctaNote}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: intro + 0.86 }}
              className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-cream/55"
            >
              {t.hero.proof.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 text-accent-icon" />
                  {p}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* -------------------------------------------------- offer card */}
          <motion.div
            style={{ y: cardY }}
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: intro + 0.45 }}
            className="lg:col-span-5"
          >
            <div className="group relative overflow-hidden rounded-3xl border border-cream/10 bg-ink-800/80 p-6 shadow-lift backdrop-blur-xl sm:p-7">
              <PointerGlow radius={420} />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px hairline-top"
              />

              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/55">
                {offer.eyebrow}
              </p>

              <ol className="relative mt-5 space-y-3.5">
                {/* the spine draws itself down through the steps */}
                <motion.span
                  aria-hidden
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 1.4, ease: EASE, delay: intro + 0.8 }}
                  className="absolute left-3.5 top-3 bottom-3 w-px origin-top bg-linear-to-b from-accent-400 to-cream/10"
                />

                {offer.steps.map((step, i) => (
                  // Index key: the copy is translated, and a text key would
                  // remount the item on every language toggle.
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: intro + 0.9 + i * 0.14 }}
                    className="relative flex items-center gap-3.5"
                  >
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${
                        i === offer.steps.length - 1
                          ? "bg-cream/10 text-cream"
                          : "bg-accent-400 text-on-accent"
                      }`}
                    >
                      {step.time}
                    </span>
                    <p className="text-[14.5px] font-semibold text-fg">{step.title}</p>
                  </motion.li>
                ))}
              </ol>

              <div className="mt-6 border-t border-cream/10 pt-5">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/50">
                  {offer.includedLabel}
                </p>
                <ul className="mt-3.5 space-y-2">
                  {offer.included.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: intro + 1.3 + i * 0.1 }}
                      className="flex gap-2.5 text-[13.5px] leading-snug text-cream/80"
                    >
                      <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-icon" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-cream/10 pt-5">
                <p className="font-display text-[1.35rem] font-extrabold tracking-[-0.03em] text-fg">
                  {offer.priceTitle}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-cream/62">
                  {offer.priceCopy}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-cream/50">
                  {offer.dataNote}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
