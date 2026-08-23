"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { IconOrders, IconBolt, IconTrendUp } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STEP_META = [
  { icon: IconOrders, step: "01" },
  { icon: IconBolt, step: "02" },
  { icon: IconTrendUp, step: "03" },
];

export default function HowItWorks() {
  const { t } = useLanguage();
  const steps = t.howItWorks.steps.map((s, i) => ({ ...s, ...STEP_META[i] }));
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.65"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    restDelta: 0.001,
  });

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 border-y border-white/[0.06] bg-linear-to-b from-ink-950 via-ink-900/40 to-ink-950 py-24 sm:py-32"
    >
      <Container>
        <SectionHeading
          eyebrow={t.howItWorks.eyebrow}
          title={t.howItWorks.title}
          description={t.howItWorks.description}
        />

        <div ref={ref} className="relative mt-16 sm:mt-20">
          {/* Connector rail — draws itself as the section scrolls.
              Vertical on mobile, horizontal from lg up; two elements because
              the axis being scaled differs. */}
          <div
            aria-hidden
            className="absolute bottom-6 left-[27px] top-6 w-px bg-white/[0.08] lg:hidden"
          >
            <motion.div
              className="h-full w-full origin-top bg-linear-to-b from-accent-400 to-accent-600"
              style={{ scaleY: progress }}
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 top-7 hidden h-px bg-white/[0.08] lg:block"
          >
            <motion.div
              className="h-full w-full origin-left bg-linear-to-r from-accent-400 via-accent-500 to-accent-600"
              style={{ scaleX: progress }}
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
            {steps.map((s, i) => (
              <Reveal
                key={s.step}
                delay={i * 0.12}
                className="relative pl-16 lg:pl-0"
              >
                {/* node */}
                <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-ink-900 text-accent-300 shadow-[0_0_36px_-10px_rgba(255,122,47,0.65)] lg:relative lg:mb-7">
                  <s.icon className="h-6 w-6" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-linear-to-b from-accent-400 to-accent-600 px-1 font-display text-[10px] font-bold text-ink-950">
                    {i + 1}
                  </span>
                </div>

                <p className="font-mono text-[11px] tracking-[0.18em] text-white/30">
                  {t.howItWorks.stepLabel} {s.step}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/50">
                  {s.copy}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[11.5px] font-medium text-white/45">
                  {s.meta}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
