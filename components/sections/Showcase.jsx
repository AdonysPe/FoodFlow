"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import DashboardPreview from "@/components/DashboardPreview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

export default function Showcase() {
  const { t } = useLanguage();
  const ref = useRef(null);

  // The frame unfolds toward the viewer as it scrolls into place.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "center 0.55"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    restDelta: 0.001,
  });

  const rotateX = useTransform(smooth, [0, 1], [16, 0]);
  const scale = useTransform(smooth, [0, 1], [0.93, 1]);
  const opacity = useTransform(smooth, [0, 0.6], [0.45, 1]);

  return (
    <section id="product" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 h-[34rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,90,51,0.08),transparent_70%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          eyebrow={t.showcase.eyebrow}
          title={t.showcase.title}
          description={t.showcase.description}
        />

        <div ref={ref} className="mt-14 sm:mt-16" style={{ perspective: "1800px" }}>
          <motion.div
            style={{ rotateX, scale, opacity, transformOrigin: "50% 100%" }}
            className="relative mx-auto max-w-6xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -bottom-8 top-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,90,51,0.16),transparent_72%)] blur-2xl"
            />
            <div className="rounded-3xl border border-cream/10 bg-cream/[0.025] p-2 backdrop-blur-xl sm:p-3">
              <DashboardPreview variant="full" />
            </div>

            {/* floating demo chips — hidden until there is room beside the frame */}
            {t.showcase.chips.map((chip, i) => (
              <Chip key={i} chip={chip} index={i} />
            ))}
          </motion.div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12.5px] text-cream/50">
            <span className="font-medium text-accent-300">{t.dashboard.demoHint}</span>
            <span aria-hidden className="text-cream/30">
              ·
            </span>
            {t.showcase.demoNote}
          </p>
        </div>
      </Container>
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
      <p className="text-[10px] uppercase tracking-[0.14em] text-cream/50">{chip.label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-white">{chip.value}</p>
    </motion.div>
  );
}
