"use client";

import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import GlassCard from "@/components/ui/GlassCard";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import {
  IconOrders,
  IconDashboard,
  IconInsights,
  IconAnalytics,
} from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, scaleIn, viewportOnce } from "@/lib/motion";

// Icon and visual accent are shared across languages; text comes from the
// dictionary and is paired in by index.
const FEATURE_META = [
  { icon: IconOrders, visual: "channels" },
  { icon: IconDashboard, visual: "pulse" },
  { icon: IconInsights, visual: "cohort" },
  { icon: IconAnalytics, visual: "bars" },
];

export default function Features() {
  const { t } = useLanguage();
  const features = t.features.items.map((item, i) => ({ ...item, ...FEATURE_META[i] }));

  return (
    <section id="features" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,47,0.09),transparent_65%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          eyebrow={t.features.eyebrow}
          title={t.features.title}
          description={t.features.description}
        />

        <RevealGroup className="mt-14 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-2">
          {features.map((f, i) => (
            // Index, not the translated title: the title changes with the
            // language toggle, and a text-derived key would remount the
            // card, resetting it to its pre-reveal (opacity: 0) state with
            // no trigger left to animate it back in.
            <RevealItem key={i} variants={scaleIn}>
              <GlassCard className="h-full p-6 sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-linear-to-b from-white/[0.1] to-white/[0.02] text-accent-300 transition-all duration-500 group-hover:border-accent-400/30 group-hover:text-accent-200 group-hover:shadow-[0_0_28px_-6px_rgba(255,122,47,0.55)]">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <Visual kind={f.visual} labels={t.features.channelsDemo} suffix={t.features.cohortSuffix} />
                </div>

                <h3 className="mt-6 font-display text-xl font-semibold tracking-[-0.02em] text-white">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/50">
                  {f.copy}
                </p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {f.points.map((p) => (
                    <li
                      key={p}
                      className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-white/45 transition-colors duration-300 group-hover:border-white/[0.12] group-hover:text-white/65"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1} className="mt-8 text-center">
          <p className="text-[13.5px] text-white/35">{t.features.footnote}</p>
        </Reveal>
      </Container>
    </section>
  );
}

/* ----------------------- tiny per-card visual accents ---------------------- */

function Visual({ kind, labels, suffix }) {
  if (kind === "channels") {
    return (
      <div className="hidden items-center gap-1.5 sm:flex">
        {labels.map((c, i) => (
          <motion.span
            key={c}
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.08 }}
            className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/40 transition-colors duration-300 group-hover:border-accent-400/20 group-hover:text-accent-200/70"
          >
            {c}
          </motion.span>
        ))}
      </div>
    );
  }

  if (kind === "pulse") {
    return (
      <svg viewBox="0 0 96 34" className="hidden h-9 w-24 sm:block" aria-hidden>
        <motion.path
          d="M1 22 L14 22 L20 9 L27 29 L34 16 L41 22 L58 22 L64 12 L71 26 L78 22 L95 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/25 transition-colors duration-500 group-hover:text-accent-400"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
        />
      </svg>
    );
  }

  if (kind === "cohort") {
    return (
      <div className="hidden items-center -space-x-2 sm:flex">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4, ease: EASE, delay: 0.15 + i * 0.07 }}
            className="h-7 w-7 rounded-full border border-ink-900 bg-linear-to-br from-white/25 to-white/5 transition-transform duration-500 group-hover:-translate-y-0.5"
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        ))}
        <span className="ml-2! text-[11px] text-white/35">{suffix}</span>
      </div>
    );
  }

  return (
    <div className="hidden h-9 items-end gap-1 sm:flex">
      {[40, 62, 34, 78, 54, 92].map((h, i) => (
        <motion.span
          key={i}
          initial={{ height: 4, opacity: 0 }}
          whileInView={{ height: `${(h / 100) * 36}px`, opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.06 }}
          className="w-1.5 rounded-sm bg-white/20 transition-colors duration-500 group-hover:bg-accent-400/70"
        />
      ))}
    </div>
  );
}
