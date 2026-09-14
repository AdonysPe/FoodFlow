"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import RestaurantSitePreview from "@/components/RestaurantSitePreview";
import { IconArrowRight } from "@/components/ui/Icons";

export default function CustomSiteSummary() {
  const { t } = useLanguage();
  const c = t.customSiteSummary;

  return (
    <section id="customer-site" className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal><p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-ink">{c.eyebrow}</p></Reveal>
            <Reveal delay={0.06}><h2 className="mt-4 font-display text-3xl font-bold text-gradient sm:text-4xl">{c.title}</h2></Reveal>
            <Reveal delay={0.1}><p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-cream/70">{c.description}</p></Reveal>
            <Reveal delay={0.14} className="mt-7"><Button href="/web-de-pedidos" icon={<IconArrowRight className="h-4 w-4" />}>{c.button}</Button></Reveal>
          </div>
          <Reveal delay={0.1}><RestaurantSitePreview /></Reveal>
        </div>
      </Container>
    </section>
  );
}
