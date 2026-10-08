"use client";

import { useRef } from "react";
import { m as motion, useScroll, useSpring, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import DashboardPreview from "@/components/DashboardPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

/**
 * "El panel", B design. The interactive DashboardPreview is untouched — it
 * is the demo the visitor plays with — and keeps the unfold-on-scroll it
 * had. What changed is the stage around it: a centred headline in the
 * display face, a glass frame over a warm glow, and the demo chips.
 */
export default function LandingShowcase() {
  const { t } = useLanguage();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "center 0.55"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 24, restDelta: 0.001 });
  const rotateX = useTransform(smooth, [0, 1], [16, 0]);
  const scale = useTransform(smooth, [0, 1], [0.93, 1]);
  const opacity = useTransform(smooth, [0, 0.6], [0.45, 1]);

  return (
    <section id="product" className="relative scroll-mt-24 overflow-x-clip py-28 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-[34rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,90,51,0.12),transparent_70%)] blur-3xl"
      />

      <div className="mx-auto w-full max-w-7xl px-5 text-center sm:px-8 lg:px-10">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-ink">{t.showcase.eyebrow}</p>
          <h2 className="mx-auto mt-4 max-w-4xl font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.05em] text-balance text-fg sm:text-6xl lg:text-[4.2rem]">
            {t.showcase.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-cream/65">{t.showcase.description}</p>
        </Reveal>

        <div ref={ref} className="mt-14 text-left sm:mt-16" style={{ perspective: "1800px" }}>
          <motion.div
            style={{ rotateX, scale, opacity, transformOrigin: "50% 100%" }}
            className="relative mx-auto max-w-6xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -bottom-8 top-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,90,51,0.2),transparent_72%)] blur-2xl"
            />
            <div className="rounded-[2rem] border border-cream/10 bg-cream/[0.04] p-2 shadow-panel backdrop-blur-2xl sm:p-3">
              <DashboardPreview variant="full" />
            </div>

            {t.showcase.chips.map((chip, i) => (
              <Chip key={i} chip={chip} index={i} />
            ))}
          </motion.div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12.5px] text-cream/50">
            <span className="font-medium text-accent-ink">{t.dashboard.demoHint}</span>
            <span aria-hidden className="text-cream/30">
              ·
            </span>
            {t.showcase.demoNote}
          </p>
        </div>
      </div>
    </section>
  );
}

function Chip({ chip, index }) {
  const left = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.35 + index * 0.15 }}
      className={`absolute hidden animate-float rounded-2xl border border-cream/10 bg-ink-900/80 p-3.5 shadow-lift backdrop-blur-xl 2xl:block ${
        left ? "-left-28 top-24" : "-right-28 bottom-24"
      }`}
      style={{ animationDelay: `${index * 1.4}s` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/50">{chip.label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-fg">{chip.value}</p>
    </motion.div>
  );
}
