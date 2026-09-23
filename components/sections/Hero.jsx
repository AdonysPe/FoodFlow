"use client";

import { useRef } from "react";
import {
  m as motion,
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
import { EASE } from "@/lib/motion";

// Its own chunk, loaded client-only: keeps this purely-decorative field off
// the critical path for the hero's first paint, and its setup is pushed to
// requestIdleCallback besides (see ParticleThreads.jsx).
const ParticleThreads = dynamic(() => import("@/components/ParticleThreads"), {
  ssr: false,
});

export default function Hero() {
  const { t } = useLanguage();
  const { headlineWords: words, offer } = t.hero;
  const ref = useRef(null);

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

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-24 pb-14 sm:pt-28 sm:pb-20 lg:pt-32 lg:[@media(max-height:820px)]:pt-24"
    >
      <ParticleThreads />

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
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
            >
              <Badge>{t.hero.badge}</Badge>
            </motion.div>

            <h1 className="mt-6 font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.85rem] lg:[@media(max-height:820px)]:text-[3.3rem]">
              {words.map((word) => (
                // whitespace-pre keeps the real space inside the span, so the
                // accessible name and copy-paste read as words, not one blob.
                <span
                  key={word}
                  className="inline-block whitespace-pre text-gradient"
                >
                  {`${word} `}
                </span>
              ))}

              <span className="relative inline-block text-accent-icon">
                {t.hero.headlineAccent}
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-linear-to-r from-accent-400/0 via-accent-400 to-accent-400/0"
                />
              </span>

              <span className="block text-gradient">
                {t.hero.headlineTail}
              </span>
            </h1>

            {/* The h1 above sells the promise ("en 48 horas"); this says what
                the thing actually is, which is what a search for "sistema para
                restaurantes Lima" needs to find in a heading. Deliberately one
                short line, and the paragraph below tightens its top margin to
                match — the hero is tuned to the fold and must not grow. */}
            <h2 className="mt-5 max-w-xl text-pretty font-display text-[17px] font-semibold leading-snug tracking-[-0.015em] text-cream/75 sm:text-[18px]">
              {t.hero.tagline}
            </h2>

            <p className="mt-3.5 max-w-xl text-pretty text-[16px] leading-relaxed text-cream/60">
              {t.hero.subheadline}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.18 }}
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
              transition={{ duration: 0.6, ease: EASE, delay: 0.22 }}
              className="mt-3.5 text-[13px] text-cream/55"
            >
              {t.hero.ctaNote}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.26 }}
              className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-cream/55"
            >
              {t.hero.proof.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 text-accent-icon" />
                  {p}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* -------------------------------------------------- offer card */}
          <motion.div
            style={{ y: cardY }}
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.12 }}
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
                  transition={{ duration: 1.1, ease: EASE, delay: 0.32 }}
                  className="absolute left-3.5 top-3 bottom-3 w-px origin-top bg-linear-to-b from-accent-400 to-cream/10"
                />

                {offer.steps.map((step, i) => (
                  // Index key: the copy is translated, and a text key would
                  // remount the item on every language toggle.
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: EASE, delay: 0.38 + i * 0.1 }}
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
                      transition={{ duration: 0.45, ease: EASE, delay: 0.6 + i * 0.08 }}
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
