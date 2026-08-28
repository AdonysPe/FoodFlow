"use client";

import Container from "@/components/ui/Container";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { LogoMark } from "@/components/ui/Logo";
import { IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function About() {
  const { t } = useLanguage();
  const a = t.about;

  return (
    <section id="nosotros" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 h-[24rem] bg-[radial-gradient(45%_60%_at_30%_50%,rgba(255,90,51,0.07),transparent_70%)] blur-3xl"
      />

      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* portrait slot — a face is the point of this section */}
          <Reveal className="lg:col-span-5">
            <figure className="relative mx-auto max-w-sm">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-cream/10 bg-ink-800 shadow-lift">
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(255,90,51,0.14),transparent_70%)]">
                  <LogoMark className="h-12 w-12 opacity-70" />
                  <p className="text-[13px] font-medium text-cream/45">{a.photoNote}</p>
                </div>
              </div>
              <figcaption className="mt-4 text-center text-[13.5px] text-cream/55">
                {a.signature}
              </figcaption>
            </figure>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-cream/10 bg-cream/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
                {a.eyebrow}
              </span>
            </Reveal>

            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-balance text-gradient sm:text-4xl">
                {a.title}
              </h2>
            </Reveal>

            {a.body.map((paragraph, i) => (
              <Reveal key={i} delay={0.12 + i * 0.06}>
                <p className="mt-5 max-w-xl text-pretty text-[15.5px] leading-relaxed text-cream/66 sm:text-base">
                  {paragraph}
                </p>
              </Reveal>
            ))}

            <Reveal delay={0.3}>
              <blockquote className="mt-9 border-l-2 border-accent-400 pl-5">
                <p className="font-display text-[21px] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[23px]">
                  {a.quote}
                </p>
              </blockquote>
            </Reveal>

            <Reveal delay={0.24}>
              <p className="mt-9 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/50">
                {a.commitmentLabel}
              </p>
            </Reveal>

            <RevealGroup className="mt-4 space-y-2.5" gap={0.08}>
              {a.commitment.map((item, i) => (
                <RevealItem key={i}>
                  <p className="flex gap-2.5 text-[15px] leading-snug text-cream/80">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                    {item}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </Container>
    </section>
  );
}
