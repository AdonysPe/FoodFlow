"use client";

import Container from "@/components/ui/Container";
import PointerGlow from "@/components/ui/PointerGlow";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import {
  IconOrders,
  IconKitchen,
  IconMenuBook,
  IconAnalytics,
} from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { scaleIn } from "@/lib/motion";

// Icons are shared across languages; the text comes from the dictionary and
// is paired in by index.
const ICONS = [IconOrders, IconKitchen, IconMenuBook, IconAnalytics];

export default function Features() {
  const { t } = useLanguage();
  const items = t.features.items.map((item, i) => ({ ...item, Icon: ICONS[i] }));

  return (
    <section id="features" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[26rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.07),transparent_65%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          eyebrow={t.features.eyebrow}
          title={t.features.title}
          description={t.features.description}
          align="left"
        />

        <RevealGroup className="mt-12 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ title, copy, Icon }, i) => (
            // Index key: the title is translated, and keying on it would
            // remount the card on every language toggle, stranding it at
            // its pre-reveal opacity with no trigger left to animate it in.
            <RevealItem key={i} variants={scaleIn}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-cream/10 bg-ink-800/70 p-6 shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:border-accent-400/40 hover:bg-ink-800 hover:shadow-lift">
                <PointerGlow radius={300} />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cream/10 bg-cream/[0.04] text-accent-icon transition-colors duration-500 group-hover:border-accent-400/40 group-hover:bg-accent-400/10">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-[17.5px] font-semibold tracking-[-0.01em] text-fg">
                  {title}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-cream/66">{copy}</p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1}>
          <p className="mt-8 text-[13.5px] text-cream/55">{t.features.footnote}</p>
        </Reveal>
      </Container>
    </section>
  );
}
