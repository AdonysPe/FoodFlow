"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ThreeBackground from "@/components/ThreeBackground";
import DashboardPreview from "@/components/DashboardPreview";
import { IconArrowRight, IconPlay, IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

export default function Hero() {
  const { t } = useLanguage();
  const headline = t.hero.headlineWords;
  const proof = t.hero.proof;
  const ref = useRef(null);

  // Scroll-linked entrance for the mockup: it rises, un-tilts and settles as
  // the hero leaves the viewport. Spring-smoothed so it never feels stepped.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  // The fade is held back until the hero is most of the way out: the mockup
  // is what the visitor scrolled down to look at, so dimming it early reads
  // as the page fighting them.
  const y = useTransform(smooth, [0, 1], [0, 60]);
  const scale = useTransform(smooth, [0, 1], [1, 0.96]);
  const opacity = useTransform(smooth, [0.55, 1], [1, 0.45]);
  const rotateX = useTransform(smooth, [0, 1], [0, 6]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44"
    >
      {/* ---------------------------------------------------------- backdrop */}
      <ThreeBackground className="opacity-70" />

      {/* warm core glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-22rem] -z-10 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,47,0.20),transparent_62%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[24rem] -z-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.16),transparent_65%)] blur-3xl animate-pulse-slow"
      />

      {/* grid floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem] grid-mask opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container className="relative">
        {/* ------------------------------------------------------------ copy */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          >
            <Badge>{t.hero.badge}</Badge>
          </motion.div>

          <h1 className="mt-7 font-display text-[2.6rem] font-extrabold leading-[1.03] tracking-[-0.04em] text-balance sm:text-6xl lg:text-[4.35rem]">
            {headline.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.75, ease: EASE, delay: 0.22 + i * 0.06 }}
                // whitespace-pre keeps the real space inside the span, so the
                // accessible name and copy-paste read as words, not one blob.
                className="inline-block whitespace-pre text-gradient"
              >
                {`${word} `}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.22 + headline.length * 0.06 }}
              className="relative inline-block"
            >
              <span className="text-gradient-accent">{t.hero.headlineAccent}</span>
              {/* underline that draws itself in */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.95 }}
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-linear-to-r from-accent-400/0 via-accent-500 to-accent-400/0"
              />
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
            className="mt-7 max-w-xl text-pretty text-[16.5px] leading-relaxed text-white/55 sm:text-lg"
          >
            {t.hero.subheadline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.74 }}
            className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button
              href="#cta"
              size="lg"
              className="w-full sm:w-auto"
              icon={<IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
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

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/40"
          >
            {proof.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <IconCheck className="h-3.5 w-3.5 text-accent-400" />
                {p}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* --------------------------------------------------------- mockup */}
        <motion.div
          style={{ y, scale, opacity, rotateX, transformPerspective: 1600 }}
          className="relative mx-auto mt-16 max-w-5xl sm:mt-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.5 }}
            style={{ transformPerspective: 1600 }}
          >
            {/* glow bed under the frame */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,122,47,0.22),transparent_70%)] blur-2xl"
            />
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-2 backdrop-blur-xl sm:p-3">
              <DashboardPreview variant="full" />
            </div>
          </motion.div>

          {/* floating stat chips */}
          <FloatingChip
            className="-left-32 top-24"
            delay={1.1}
            label={t.hero.chipOrders}
            value="48"
            trend="+22%"
          />
          <FloatingChip
            className="-right-32 bottom-20"
            delay={1.3}
            label={t.hero.chipFoodCost}
            value="27.4%"
            trend="-3.1%"
          />
        </motion.div>
      </Container>

      {/* bottom fade into the next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-ink-950"
      />
    </section>
  );
}

function FloatingChip({ className = "", delay = 0, label, value, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={`absolute hidden animate-float rounded-2xl border border-white/[0.09] bg-ink-900/70 p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl 2xl:block ${className}`}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-semibold text-white">{value}</span>
        <span className="text-[11px] font-medium text-mint">{trend}</span>
      </div>
    </motion.div>
  );
}
