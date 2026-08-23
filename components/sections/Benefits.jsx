"use client";

import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import { IconTrendUp, IconClock, IconTarget, IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, viewportOnce } from "@/lib/motion";

const BENEFIT_META = [{ icon: IconTrendUp }, { icon: IconClock }, { icon: IconTarget }];

// Before/after values are demo data shared across languages; only the label
// text is translated.
const COMPARISON_VALUES = [
  { before: 82, after: 24 },
  { before: 74, after: 18 },
  { before: 38, after: 79 },
  { before: 46, after: 71 },
];

export default function Benefits() {
  const { t } = useLanguage();
  const benefits = t.benefits.items.map((b, i) => ({ ...b, ...BENEFIT_META[i] }));
  const comparison = t.benefits.comparisonLabels.map((label, i) => ({
    label,
    ...COMPARISON_VALUES[i],
  }));

  return (
    <section id="benefits" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/3 -z-10 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,47,0.10),transparent_65%)] blur-3xl"
      />

      <Container>
        <div className="grid items-stretch gap-14 lg:grid-cols-2 lg:gap-16">
          {/* copy side */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                {t.benefits.eyebrow}
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-balance text-gradient sm:text-4xl lg:text-[2.9rem]">
                {t.benefits.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-lg text-pretty text-[15px] leading-relaxed text-white/55 sm:text-base">
                {t.benefits.description}
              </p>
            </Reveal>

            <RevealGroup className="mt-10 space-y-3" gap={0.1}>
              {benefits.map((b, i) => (
                // Index key — see Features.jsx: a translated-text key would
                // remount the card on every language toggle and strand it
                // at opacity 0 since the reveal-once trigger already fired.
                <RevealItem key={i}>
                  <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-500 hover:border-white/[0.14] hover:bg-white/[0.04] sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-linear-to-b from-white/[0.1] to-white/[0.02] text-accent-300 transition-all duration-500 group-hover:border-accent-400/30 group-hover:shadow-[0_0_24px_-6px_rgba(255,122,47,0.6)]">
                        <b.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-white">
                          {b.title}
                        </h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-white/50">
                          {b.copy}
                        </p>
                        <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5">
                          {b.points.map((p) => (
                            <li
                              key={p}
                              className="flex items-center gap-1.5 text-[12.5px] text-white/40"
                            >
                              <IconCheck className="h-3.5 w-3.5 text-accent-400" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          {/* comparison card — the wrapper stretches to match the taller
              copy column and centers the card in that space, so a shorter
              card reads as a deliberate composition rather than leaving a
              blank gap underneath it. */}
          <div className="lg:flex lg:items-center">
            <Reveal delay={0.1} className="w-full lg:sticky lg:top-28">
              <GlassCard className="p-6 sm:p-8" hoverLift={false}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {t.benefits.comparisonTitle}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-white/40">
                      {t.benefits.comparisonSubtitle}
                    </p>
                  </div>
                  <span className="rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-semibold text-mint ring-1 ring-mint/20">
                    {t.benefits.verified}
                  </span>
                </div>

                <div className="mt-7 space-y-6">
                  {comparison.map((c, i) => (
                    <div key={c.label}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="text-[13px] font-medium text-white/70">
                          {c.label}
                        </span>
                        <span className="font-mono text-[11.5px] text-white/30">
                          {c.before} &rarr; {c.after}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <Bar value={c.before} delay={i * 0.1} tone="bg-white/15" />
                        <Bar
                          value={c.after}
                          delay={i * 0.1 + 0.15}
                          tone="bg-linear-to-r from-accent-400 to-accent-600"
                          glow
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-3 border-t border-white/[0.07] pt-6">
                  <div className="flex -space-x-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-8 w-8 rounded-full border-2 border-ink-900 bg-linear-to-br from-white/25 to-white/5"
                      />
                    ))}
                  </div>
                  <p className="text-[12.5px] leading-snug text-white/45">
                    {t.benefits.joinedPrefix}{" "}
                    <span className="font-semibold text-white/70">
                      {t.benefits.joinedBold}
                    </span>{" "}
                    {t.benefits.joinedSuffix}
                  </p>
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Bar({ value, delay, tone, glow = false }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
      <motion.div
        className={`h-full rounded-full ${tone} ${glow ? "shadow-[0_0_18px_-2px_rgba(255,122,47,0.7)]" : ""}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={viewportOnce}
        transition={{ duration: 1.1, ease: EASE, delay }}
      />
    </div>
  );
}
