"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

/**
 * The commissions explainer — the page a restaurant owner lands on after
 * typing "cuánto cobra Rappi de comisión" into Google.
 *
 * It answers the question first and sells second, which is the only way this
 * kind of page earns the position: someone comparing rates leaves the moment
 * it turns into a brochure. The pitch is the last block, after the reader has
 * what they came for.
 *
 * Every figure here is a RANGE, and the disclaimer at the bottom says so.
 * Real rates are negotiated venue by venue and change over time, so quoting a
 * single number as fact would be both wrong and the kind of claim a reader
 * can disprove with their own invoice.
 *
 * `as` follows the same contract as the other route-leading sections: the
 * page hands it "h1" because nothing above it on /comisiones-rappi-pedidosya
 * would otherwise be one.
 */
export default function Commissions({ as }) {
  const { t } = useLanguage();
  const c = t.commissions;

  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <Container>
        <SectionHeading
          as={as}
          eyebrow={c.eyebrow}
          title={c.title}
          description={c.description}
        />

        {/* ------------------------------------------------ what each app takes */}
        <div className="mt-16 sm:mt-20">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.ratesTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.ratesNote}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.rates.map((rate) => (
              <RevealItem key={rate.app}>
                <GlassCard
                  className={`h-full p-6 ${
                    rate.highlight ? "border-accent-400/45 bg-accent-400/[0.06]" : ""
                  }`}
                >
                  <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                    {rate.app}
                  </p>
                  <p
                    className={`mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] ${
                      rate.highlight ? "text-accent-icon" : "text-fg"
                    }`}
                  >
                    {rate.range}
                  </p>
                  <p className="mt-1 text-[13px] text-cream/55">{rate.label}</p>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-cream/66">
                    {rate.detail}
                  </p>
                </GlassCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* ------------------------------------------ what the percentage hides */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.hiddenTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.hiddenIntro}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {c.hidden.map((item, i) => (
              <RevealItem key={item.title}>
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cream/10 bg-cream/[0.04] font-display text-[12.5px] font-bold text-accent-ink"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[17px] font-semibold text-fg">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-pretty text-[14.5px] leading-relaxed text-cream/66">
                      {item.body}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* --------------------------------------------------- worked example */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.exampleTitle}
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-6 lg:grid-cols-5 lg:items-start">
            <Reveal delay={0.06} className="lg:col-span-3">
              <GlassCard className="p-6 sm:p-7" hoverLift={false}>
                <p className="text-[15px] leading-relaxed text-cream/70">
                  {c.exampleIntro}
                </p>
                <dl className="mt-6 divide-y divide-cream/10 border-y border-cream/10">
                  {c.exampleRows.map((row, i) => {
                    const isTotal = i === c.exampleRows.length - 1;
                    return (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-6 py-3.5"
                      >
                        <dt
                          className={`text-[14.5px] ${
                            isTotal ? "font-semibold text-fg" : "text-cream/66"
                          }`}
                        >
                          {row.label}
                        </dt>
                        <dd
                          className={`shrink-0 font-display tabular-nums tracking-[-0.02em] ${
                            isTotal
                              ? "text-[22px] font-extrabold text-fg"
                              : "text-[17px] font-bold text-cream/80"
                          }`}
                        >
                          {row.value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <p className="mt-5 font-display text-[17px] font-semibold tracking-[-0.015em] text-accent-icon">
                  {c.exampleFooter}
                </p>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.12} className="lg:col-span-2">
              <div className="rounded-2xl border-l-2 border-accent-400 bg-cream/[0.028] px-5 py-5">
                <p className="text-pretty text-[14.5px] leading-relaxed text-cream/70">
                  {c.exampleAside}
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* -------------------------------------------------------- what to do */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.optionsTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.optionsIntro}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2">
            {c.options.map((opt) => (
              <RevealItem key={opt.title}>
                <GlassCard className="h-full p-6">
                  <h3 className="font-display text-[17.5px] font-semibold text-fg">
                    {opt.title}
                  </h3>
                  <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-cream/66">
                    {opt.body}
                  </p>
                </GlassCard>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* The reader who got this far wants the how, not more of the what. */}
          <Reveal delay={0.1}>
            <p className="mt-7">
              <Link
                href="/vender-sin-comision"
                className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-accent-ink underline decoration-accent-400/40 underline-offset-4 transition-colors hover:text-fg"
              >
                {c.optionsLinkLabel}
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </Reveal>
        </div>

        {/* --------------------------------------------------------------- faq */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.faqTitle}
            </h2>
          </Reveal>

          {/* Open markup, not an accordion: these four answers are the ones the
              FAQPage schema declares, and Google wants them present in the
              HTML rather than behind a click. */}
          <RevealGroup className="mt-8 max-w-3xl divide-y divide-cream/10 border-y border-cream/10">
            {c.faq.map((item) => (
              <RevealItem key={item.q}>
                <div className="py-6">
                  <h3 className="font-display text-[17.5px] font-semibold text-fg">
                    {item.q}
                  </h3>
                  <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-cream/70">
                    {item.a}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* --------------------------------------------------------------- cta */}
        <Reveal delay={0.06}>
          <div className="mt-20 rounded-3xl border border-cream/10 bg-cream/[0.028] px-6 py-10 text-center sm:mt-24 sm:px-10 sm:py-12">
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.ctaBody}
            </p>
            <div className="mt-7 flex justify-center">
              <Button
                href="/calculadora"
                size="lg"
                icon={
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                }
              >
                {c.ctaButton}
              </Button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-10 text-[13px] leading-relaxed text-cream/50">
            {c.disclaimer}{" "}
            <Link
              href="/precios"
              className="underline decoration-cream/30 underline-offset-4 transition-colors hover:text-fg"
            >
              {t.pricing.eyebrow}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
