"use client";

import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import RestaurantSitePreview from "@/components/RestaurantSitePreview";
import { IconArrowRight } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * "Tu propia web de pedidos", B design. Same copy, same button to
 * /web-de-pedidos and the same live RestaurantSitePreview; the preview now
 * floats over a warm glow, and the heading takes the display scale the
 * rest of the B page uses.
 */
export default function LandingCustomSite() {
  const { t } = useLanguage();
  const c = t.customSiteSummary;

  return (
    <section id="customer-site" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <div>
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-ink">{c.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.05em] text-balance text-fg sm:text-[3.4rem]">
              {c.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-cream/65">{c.description}</p>
          </Reveal>
          <Reveal delay={0.14} className="mt-8">
            <Button
              href="/web-de-pedidos"
              size="lg"
              className="rounded-full!"
              icon={<IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
            >
              {c.button}
            </Button>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(255,90,51,0.22),transparent)] blur-3xl"
          />
          <div className="lb-float">
            <RestaurantSitePreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
