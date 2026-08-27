"use client";

import Container from "@/components/ui/Container";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import RestaurantSitePreview from "@/components/RestaurantSitePreview";
import { IconMenuBook, IconCart, IconChat } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Icon is shared across languages; title/copy come from the dictionary by index.
const ITEM_META = [{ icon: IconMenuBook }, { icon: IconCart }, { icon: IconChat }];

export default function CustomSite() {
  const { t } = useLanguage();
  const items = t.customSite.items.map((item, i) => ({ ...item, ...ITEM_META[i] }));

  return (
    <section
      id="customer-site"
      className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[26rem] -translate-y-1/2 bg-[radial-gradient(circle,rgba(124,92,255,0.08),transparent_65%)] blur-3xl"
      />

      <Container>
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16">
          {/* copy side */}
          <div>
            {/* product identity — a distinct sub-brand, not a footnote feature */}
            <Reveal>
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-accent-300 to-accent-500 text-[10.5px] font-bold text-ink-950 shadow-accent">
                  FS
                </span>
                <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-white">
                  {t.customSite.productName}
                </span>
                <span className="rounded-full border border-cream/10 bg-cream/[0.03] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-300">
                  {t.customSite.eyebrow}
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-balance text-gradient sm:text-4xl lg:text-[2.9rem]">
                {t.customSite.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-lg text-pretty text-[15px] leading-relaxed text-cream/66 sm:text-base">
                {t.customSite.description}
              </p>
            </Reveal>

            <RevealGroup className="mt-10 space-y-3" gap={0.1}>
              {items.map((item, i) => (
                // Index key: see the comment in Features.jsx — a
                // translated-text key would remount the card on every
                // language toggle and strand it at opacity 0.
                <RevealItem key={i}>
                  <div className="group relative rounded-2xl border border-cream/10 bg-cream/[0.02] p-5 transition-all duration-500 hover:border-cream/[0.14] hover:bg-cream/[0.04] sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cream/10 bg-linear-to-b from-cream/[0.1] to-cream/[0.02] text-accent-300 transition-all duration-500 group-hover:border-accent-400/30 group-hover:shadow-accent">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-cream/62">
                          {item.copy}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal delay={0.1} className="mt-6">
              <p className="text-[13.5px] leading-relaxed text-cream/50">
                {t.customSite.footnote}
              </p>
            </Reveal>
          </div>

          {/* live demo */}
          <Reveal delay={0.1} className="lg:sticky lg:top-28">
            <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-cream/45">
              {t.customSite.productName} · {t.customSite.demo.brand}
            </p>
            <RestaurantSitePreview />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
