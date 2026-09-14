"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";

export default function QrMenu({ as }) {
  const { t } = useLanguage();
  const c = t.qrMenu;
  const cartaPlan = t.chat.plans.items[0];

  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <Container>
        <SectionHeading as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

        <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-3">
          {c.steps.map((step) => (
            <RevealItem key={step.number}>
              <GlassCard className="h-full p-6" hoverLift={false}>
                <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">
                  {step.number}
                </span>
                <h2 className="mt-3 font-display text-xl font-semibold text-fg">{step.title}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-cream/70">{step.body}</p>
              </GlassCard>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.08}>
          <div className="mt-20 grid gap-8 rounded-3xl border border-cream/12 bg-cream/[0.028] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.demoTitle}</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cream/70">{c.demoBody}</p>
            </div>
            <Button href="/carta/tanta" size="lg" icon={<IconArrowRight className="h-4 w-4" />}>
              {c.demoButton}
            </Button>
          </div>
        </Reveal>

        <div className="mt-20 sm:mt-24">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.planTitle}</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <GlassCard className="mt-8 p-6 sm:p-8" hoverLift={false}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-xl font-bold text-fg">{cartaPlan.name}</p>
                  <p className="mt-1 text-[14px] text-cream/60">{cartaPlan.tagline}</p>
                </div>
                <p className="font-display text-3xl font-extrabold text-accent-ink">{cartaPlan.price}</p>
              </div>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {c.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-cream/70">
                    <IconCheck className="mt-1 h-4 w-4 shrink-0 text-accent-icon" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>

        <Reveal>
          <div className="mt-20 rounded-3xl border border-cream/10 bg-cream/[0.028] p-8 text-center sm:mt-24">
            <h2 className="font-display text-2xl font-bold text-fg">{c.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-cream/70">{c.ctaBody}</p>
            <div className="mt-7 flex justify-center"><Button href="/precios" size="lg" icon={<IconArrowRight className="h-4 w-4" />}>{c.ctaButton}</Button></div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-20 rounded-3xl border border-warn/25 bg-warn/[0.06] p-6 sm:mt-24 sm:p-9">
            <h2 className="font-display text-2xl font-bold text-fg">{c.notForTitle}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cream/70">{c.notForBody}</p>
          </div>
        </Reveal>

        <div className="mt-20 sm:mt-24">
          <Reveal><h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.faqTitle}</h2></Reveal>
          <RevealGroup className="mt-8 max-w-3xl divide-y divide-cream/10 border-y border-cream/10">
            {c.faq.map((item) => (
              <RevealItem key={item.q}>
                <div className="py-6">
                  <h3 className="font-display text-[17.5px] font-semibold text-fg">{item.q}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-cream/70">{item.a}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal>
          <div className="mt-20 flex flex-wrap gap-x-6 gap-y-3 border-t border-cream/10 pt-8 text-[14px]">
            <Link href="/precios" className="font-semibold text-accent-ink hover:text-fg">{c.pricingLink}</Link>
            <Link href="/web-de-pedidos" className="font-semibold text-accent-ink hover:text-fg">{c.orderingLink}</Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
