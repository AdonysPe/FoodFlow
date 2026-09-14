"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";

export default function RappiAlternative({ as }) {
  const { t } = useLanguage();
  const c = t.rappiAlternative;
  const negocioPlan = t.chat.plans.items[2];

  return (
    <section className="relative py-24 sm:py-28 lg:py-32">
      <Container>
        <SectionHeading as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

        <Reveal>
          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border-l-2 border-accent-400 bg-cream/[0.028] p-6 sm:mt-16">
            <h2 className="font-display text-xl font-semibold text-fg">{c.truthTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-cream/70">{c.truthBody}</p>
          </div>
        </Reveal>

        <div className="mt-20 sm:mt-24">
          <Reveal><h2 className="font-display text-2xl font-bold text-fg sm:text-3xl">{c.compareTitle}</h2></Reveal>
          <Reveal delay={0.06}>
            <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <thead><tr className="border-b border-cream/12">
                  <th className="py-3 pr-5 text-[11px] uppercase tracking-[0.14em] text-cream/55">{c.compareHead}</th>
                  <th className="py-3 pr-5 text-[11px] uppercase tracking-[0.14em] text-cream/55">Rappi</th>
                  <th className="py-3 text-[11px] uppercase tracking-[0.14em] text-cream/55">FoodFlow</th>
                </tr></thead>
                <tbody>{c.rows.map((row) => (
                  <tr key={row.label} className="border-b border-cream/10">
                    <th className="py-4 pr-5 font-display text-[15px] font-semibold text-fg">{row.label}</th>
                    <td className="py-4 pr-5 text-[14px] leading-relaxed text-cream/70">{row.rappi}</td>
                    <td className="py-4 text-[14px] leading-relaxed text-cream/70">{row.foodflow === "{price}" ? negocioPlan.price : row.foodflow}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="mt-20 rounded-3xl border border-warn/25 bg-warn/[0.06] p-6 sm:mt-24 sm:p-9">
            <h2 className="font-display text-2xl font-bold text-fg">{c.loseTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-cream/70">{c.loseIntro}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {c.losses.map((item) => <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-cream/70"><IconCheck className="mt-1 h-4 w-4 shrink-0 text-warn-ink" />{item}</li>)}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <GlassCard className="mt-20 p-6 sm:mt-24 sm:p-9" hoverLift={false}>
            <h2 className="font-display text-2xl font-bold text-fg">{c.bothTitle}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-cream/70">{c.bothBody}</p>
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
            <div className="mt-7 flex justify-center"><Button href="/calculadora" size="lg" icon={<IconArrowRight className="h-4 w-4" />}>{c.ctaButton}</Button></div>
          </div>
        </Reveal>

        <Reveal><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[14px]"><Link href="/comisiones-rappi-pedidosya" className="font-semibold text-accent-ink hover:text-fg">{c.commissionsLink}</Link><Link href="/vender-sin-comision" className="font-semibold text-accent-ink hover:text-fg">{c.directLink}</Link></div></Reveal>
      </Container>
    </section>
  );
}
