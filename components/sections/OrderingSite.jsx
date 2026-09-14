"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";

export default function OrderingSite() {
  const { t } = useLanguage();
  const c = t.orderingSite;
  const negocioPlan = t.chat.plans.items[2];

  return (
    <section className="relative overflow-x-clip pb-24 sm:pb-28 lg:pb-32">
      <Container>
        <div>
          <Reveal><h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.flowTitle}</h2></Reveal>
          <Reveal delay={0.06}><p className="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-cream/70">{c.flowIntro}</p></Reveal>
          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-3">
            {c.flow.map((item) => (
              <RevealItem key={item.title}><GlassCard className="h-full p-6" hoverLift={false}><h3 className="font-display text-lg font-semibold text-fg">{item.title}</h3><p className="mt-2 text-[14.5px] leading-relaxed text-cream/70">{item.body}</p></GlassCard></RevealItem>
            ))}
          </RevealGroup>
        </div>

        <div className="mt-20 sm:mt-24">
          <Reveal><h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.payTitle}</h2></Reveal>
          <Reveal delay={0.06}><p className="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-cream/70">{c.payIntro}</p></Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[40rem] border-collapse text-left">
                <thead><tr className="border-b border-cream/12"><th className="py-3 pr-5 text-[11px] uppercase tracking-[0.14em] text-cream/55">{c.payHeadMethod}</th><th className="py-3 pr-5 text-[11px] uppercase tracking-[0.14em] text-cream/55">{c.payHeadCost}</th><th className="py-3 text-[11px] uppercase tracking-[0.14em] text-cream/55">{c.payHeadNote}</th></tr></thead>
                <tbody>{c.payRows.map((row) => <tr key={row.method} className="border-b border-cream/10"><td className="py-4 pr-5 font-display text-[15px] font-semibold text-fg">{row.method}</td><td className="py-4 pr-5 text-[14px] font-semibold text-accent-ink">{row.cost}</td><td className="py-4 text-[14px] leading-relaxed text-cream/70">{row.note}</td></tr>)}</tbody>
              </table>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="mt-20 rounded-3xl border border-warn/25 bg-warn/[0.06] p-6 sm:mt-24 sm:p-9">
            <h2 className="font-display text-2xl font-bold text-fg">{c.honestTitle}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cream/70">{c.honestBody}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {c.traffic.map((item) => <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-cream/70"><IconCheck className="mt-1 h-4 w-4 shrink-0 text-warn-ink" />{item}</li>)}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <GlassCard className="mt-20 p-6 sm:mt-24 sm:p-9" hoverLift={false}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-display text-2xl font-bold text-fg">{c.planTitle}</h2><p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-cream/70">{c.planBody}</p></div>
              <div className="shrink-0 text-left sm:text-right"><p className="font-display text-lg font-bold text-fg">{negocioPlan.name}</p><p className="mt-1 font-display text-3xl font-extrabold text-accent-ink">{negocioPlan.price}</p></div>
            </div>
          </GlassCard>
        </Reveal>

        <div className="mt-20 sm:mt-24">
          <Reveal><h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.faqTitle}</h2></Reveal>
          <RevealGroup className="mt-8 max-w-3xl divide-y divide-cream/10 border-y border-cream/10">
            {c.faq.map((item) => <RevealItem key={item.q}><div className="py-6"><h3 className="font-display text-[17.5px] font-semibold text-fg">{item.q}</h3><p className="mt-2.5 text-[15px] leading-relaxed text-cream/70">{item.a}</p></div></RevealItem>)}
          </RevealGroup>
        </div>

        <Reveal>
          <div className="mt-20 rounded-3xl border border-cream/10 bg-cream/[0.028] p-8 text-center sm:mt-24">
            <h2 className="font-display text-2xl font-bold text-fg">{c.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-cream/70">{c.ctaBody}</p>
            <div className="mt-7 flex justify-center"><Button href="/precios" size="lg" icon={<IconArrowRight className="h-4 w-4" />}>{c.ctaButton}</Button></div>
          </div>
        </Reveal>

        <Reveal><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[14px]"><Link href="/vender-sin-comision" className="font-semibold text-accent-ink hover:text-fg">{c.directLink}</Link><Link href="/carta-digital-qr" className="font-semibold text-accent-ink hover:text-fg">{c.qrLink}</Link><Link href="/precios" className="font-semibold text-accent-ink hover:text-fg">{c.pricingLink}</Link></div></Reveal>
      </Container>
    </section>
  );
}
