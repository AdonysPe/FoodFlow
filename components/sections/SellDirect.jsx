"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";

/**
 * The "sell direct" guide — the page for someone searching how to take
 * delivery orders without paying a commission.
 *
 * The block that makes this page worth trusting is `keep`: the honest list of
 * cases where the apps are still the right call. A page that only argues one
 * side reads as an ad and gets treated as one, by readers and by Google. Every
 * channel also carries its `catch`, for the same reason.
 *
 * `as` follows the same contract as the other route-leading sections.
 */
export default function SellDirect({ as }) {
  const { t } = useLanguage();
  const c = t.sellDirect;

  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <Container>
        <SectionHeading
          as={as}
          eyebrow={c.eyebrow}
          title={c.title}
          description={c.description}
        />

        {/* --------------------------------------------- where it comes from */}
        <Reveal delay={0.06}>
          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border-l-2 border-accent-400 bg-cream/[0.028] px-6 py-6 sm:mt-16">
            <h2 className="font-display text-[19px] font-semibold tracking-[-0.015em] text-fg">
              {c.costTitle}
            </h2>
            <p className="mt-3 text-pretty text-[15.5px] leading-relaxed text-cream/70">
              {c.costBody}
            </p>
            <Link
              href="/comisiones-rappi-pedidosya"
              className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-ink underline decoration-accent-400/40 underline-offset-4 transition-colors hover:text-fg"
            >
              {c.costLinkLabel}
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>

        {/* ------------------------------------------------------- channels */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.channelsTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.channelsIntro}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 flex flex-col gap-4">
            {c.channels.map((ch) => (
              <RevealItem key={ch.step}>
                <GlassCard className="p-6 sm:p-7" hoverLift={false}>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cream/10 bg-cream/[0.04] font-display text-[16px] font-bold text-accent-ink"
                    >
                      {ch.step}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[19px] font-semibold text-fg">
                        {ch.title}
                      </h3>
                      <p className="mt-2 text-pretty text-[15px] leading-relaxed text-cream/70">
                        {ch.body}
                      </p>
                      {/* The trade-off, stated where the reader is deciding. */}
                      <p className="mt-3 text-pretty text-[14px] leading-relaxed text-cream/55">
                        {ch.catch}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl border border-cream/10 bg-cream/[0.03] px-4 py-3 sm:w-44 sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/50">
                        {c.costLabel}
                      </p>
                      <p className="mt-1 font-display text-[15.5px] font-bold tracking-[-0.015em] text-fg">
                        {ch.cost}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* ------------------------------------------------------ getting paid */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.payTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.payIntro}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            {/* Its own scroll container, so a narrow phone never drags the
                whole page sideways. */}
            <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[38rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-cream/12">
                    <th className="py-3 pr-4 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                      {c.payHeadMethod}
                    </th>
                    <th className="py-3 pr-4 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                      {c.payHeadFee}
                    </th>
                    <th className="py-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                      {c.payHeadNote}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.payRows.map((row) => (
                    <tr key={row.method} className="border-b border-cream/10">
                      <td className="py-4 pr-4 align-top font-display text-[15.5px] font-semibold text-fg">
                        {row.method}
                      </td>
                      <td className="py-4 pr-4 align-top text-[14.5px] font-semibold tabular-nums text-accent-ink">
                        {row.fee}
                      </td>
                      <td className="py-4 align-top text-[14px] leading-relaxed text-cream/66">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>

        {/* ---------------------------------------------------------- delivery */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.deliveryTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.deliveryIntro}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-3">
            {c.delivery.map((item) => (
              <RevealItem key={item.title}>
                <GlassCard className="h-full p-6">
                  <h3 className="font-display text-[17px] font-semibold text-fg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-cream/66">
                    {item.body}
                  </p>
                </GlassCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* ------------------------------------ when the apps are still right */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <div className="rounded-3xl border border-cream/12 bg-ink-800/50 px-6 py-8 sm:px-9 sm:py-10">
              <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-[28px]">
                {c.keepTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/70">
                {c.keepIntro}
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {c.keep.map((item) => (
                  <li key={item} className="flex gap-3">
                    <IconCheck className="mt-1 h-4 w-4 shrink-0 text-accent-icon" />
                    <span className="text-pretty text-[14.5px] leading-relaxed text-cream/70">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-cream/10 pt-5 font-display text-[16.5px] font-semibold tracking-[-0.015em] text-fg">
                {c.keepClose}
              </p>
            </div>
          </Reveal>
        </div>

        {/* -------------------------------------------------------- four weeks */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.planTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-4 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-cream/66">
              {c.planIntro}
            </p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.plan.map((week) => (
              <RevealItem key={week.week}>
                <div className="h-full border-t-2 border-accent-400/50 pt-4">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
                    {week.week}
                  </p>
                  <h3 className="mt-2 font-display text-[17px] font-semibold text-fg">
                    {week.title}
                  </h3>
                  <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-cream/66">
                    {week.body}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* --------------------------------------------------------------- faq */}
        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] text-fg sm:text-3xl">
              {c.faqTitle}
            </h2>
          </Reveal>

          {/* Open, not an accordion: these are the answers the FAQPage schema
              declares, and Google wants them in the HTML. */}
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

        <Reveal delay={0.08}>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px]">
            <Link href="/alternativa-a-rappi" className="font-semibold text-accent-ink hover:text-fg">
              {t.rappiAlternative.eyebrow}
            </Link>
            <Link href="/web-de-pedidos" className="font-semibold text-accent-ink hover:text-fg">
              {t.orderingSite.eyebrow}
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-10 text-[13px] leading-relaxed text-cream/50">
            {c.disclaimer}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
