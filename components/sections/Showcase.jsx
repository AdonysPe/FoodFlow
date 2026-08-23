"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import DashboardPreview from "@/components/DashboardPreview";
import useCountUp from "@/lib/useCountUp";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The count-up numbers and their formatting are shared across languages;
// label/copy text is paired in from the dictionary by index.
const HIGHLIGHT_META = [
  { end: 23, suffix: "%", prefix: "+" },
  { end: 9.5, suffix: "h", prefix: "", decimals: 1 },
  { end: 31, suffix: "%", prefix: "-" },
];

export default function Showcase() {
  const { t } = useLanguage();
  const highlights = t.showcase.highlights.map((h, i) => ({
    ...h,
    ...HIGHLIGHT_META[i],
  }));
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

  const rotateX = useTransform(smooth, [0, 1], [18, 0]);
  const scale = useTransform(smooth, [0, 1], [0.92, 1]);
  const opacity = useTransform(smooth, [0, 0.6], [0.4, 1]);

  return (
    <section id="product" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 h-[36rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(124,92,255,0.10),transparent_70%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          eyebrow={t.showcase.eyebrow}
          title={t.showcase.title}
          description={t.showcase.description}
        />

        <div ref={ref} className="mt-16 sm:mt-20" style={{ perspective: "1800px" }}>
          <motion.div
            style={{ rotateX, scale, opacity, transformOrigin: "50% 100%" }}
            className="relative mx-auto max-w-6xl"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -bottom-8 top-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,122,47,0.18),transparent_72%)] blur-2xl"
            />
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-2 backdrop-blur-xl sm:p-3">
              <DashboardPreview variant="full" />
            </div>
          </motion.div>
        </div>

        {/* highlighted metrics */}
        <div className="mt-16 grid gap-5 sm:mt-20 sm:grid-cols-3">
          {highlights.map((h, i) => (
            // Index key: h.label is translated, and keying on it would
            // remount the count-up on every language toggle, resetting it
            // back to 0 for no reason.
            <Reveal key={i} delay={i * 0.09}>
              <Stat {...h} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Stat({ end, prefix = "", suffix = "", decimals = 0, label, copy }) {
  const { ref, display } = useCountUp(end, { decimals });

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors duration-500 hover:border-white/[0.14]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px hairline-top opacity-50 transition-opacity duration-500 group-hover:opacity-100"
      />
      <p className="font-display text-4xl font-bold tracking-[-0.035em] text-gradient-accent tabular-nums sm:text-[2.75rem]">
        {prefix}
        {display}
        {suffix}
      </p>
      <p className="mt-3 text-[14px] font-semibold text-white/85">{label}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/45">{copy}</p>
    </div>
  );
}
