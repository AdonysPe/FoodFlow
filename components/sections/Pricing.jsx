"use client";

import Link from "next/link";
import { m as motion } from "framer-motion";
import Container from "@/components/ui/Container";
import PointerGlow from "@/components/ui/PointerGlow";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, scaleIn } from "@/lib/motion";

// `as` is forwarded so /precios can claim the h1; it stays h2 anywhere else.
export default function Pricing({ as }) {
  const { t } = useLanguage();
  // Same source as the chat and the closing block: prices are written once.
  const plans = t.chat.plans.items;

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.08),transparent_65%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          as={as}
          eyebrow={t.pricing.eyebrow}
          title={t.pricing.title}
          description={t.pricing.description}
        />

        <FounderBanner copy={t.pricing.founder} />

        {/* Narrower than the container: three cards across the full 1280 read
            as three posters, not as a table you can compare down. */}
        <RevealGroup className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 lg:grid-cols-3">
          {plans.map((plan, planIndex) => (
            <RevealItem key={plan.name} variants={scaleIn}>
              <article
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-500 hover:-translate-y-1.5 sm:p-6 ${
                  plan.badge
                    ? "border-accent-400/45 bg-accent-400/[0.06] shadow-lift"
                    : "border-cream/10 bg-ink-800/70 shadow-card hover:border-cream/20"
                }`}
              >
                <PointerGlow radius={320} />
                <div className="relative flex items-center gap-2.5">
                  <h3 className="font-display text-[17.5px] font-bold text-fg">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span className="rounded-full bg-accent-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-on-accent">
                      {t.pricing.popular}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-cream/55">{plan.tagline}</p>

                <p className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-[2rem] font-extrabold tracking-[-0.03em] text-fg">
                    {plan.price}
                  </span>
                  <span className="text-[13.5px] font-medium text-cream/50">
                    {plan.period}
                  </span>
                  <span className="text-[11.5px] font-normal text-cream/50">
                    + IGV
                  </span>
                </p>

                <ul className="mt-5 flex-1 space-y-2 border-t border-cream/10 pt-5">
                  {plan.features.map((feature, featureIndex) => {
                    // On every plan after the first, the opening bullet is the
                    // "everything in the plan before" line — the hinge of the
                    // comparison, so it carries more weight than the rest.
                    const isInherited = planIndex > 0 && featureIndex === 0;

                    return (
                      <li
                        key={feature}
                        className={`flex gap-2.5 text-[13.5px] leading-snug ${
                          isInherited ? "font-semibold text-cream/90" : "text-cream/75"
                        }`}
                      >
                        <IconCheck
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isInherited ? "text-accent-ink" : "text-accent-icon"
                          }`}
                        />
                        {feature}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  variant={plan.badge ? "primary" : "secondary"}
                  size="md"
                  className="mt-6 w-full"
                  onClick={() => {
                    const planKey = plan.name.toLowerCase();
                    window.location.href = `/register?plan=${encodeURIComponent(planKey)}`;
                  }}
                  icon={
                    <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  }
                >
                  {t.pricing.cta}
                </Button>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* The two objections that come up before price ever does: what it
            runs on, and how their customers actually pay. */}
        <Reveal delay={0.08}>
          <ul className="mx-auto mt-4 grid max-w-5xl gap-3 sm:grid-cols-2">
            {t.pricing.keyNotes.map((note) => (
              <li
                key={note}
                className="flex gap-2.5 rounded-xl border border-cream/10 bg-ink-800/50 px-4 py-3.5 text-[13.5px] leading-relaxed text-cream/75"
              >
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />
                {note}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-5 max-w-5xl">
            <p className="text-[13px] text-cream/55">{t.pricing.taxNote}</p>
            <p className="mt-1.5 text-[13px] font-medium text-accent-ink">
              {t.pricing.savingsNote}
            </p>
          </div>
        </Reveal>

        {/* add-ons: the "and if I need one more waiter?" answer */}
        <Reveal delay={0.12}>
          <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-cream/10 bg-ink-800/60 p-6 shadow-card sm:p-7">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/50">
              {t.pricing.addonsLabel}
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {t.pricing.addons.map((addon, i) => (
                <motion.div
                  key={addon.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                >
                  <p className="flex items-baseline gap-1">
                    <span className="font-display text-[19px] font-bold text-accent-ink">
                      {addon.price}
                    </span>
                    <span className="text-[12.5px] text-cream/50">{addon.unit}</span>
                  </p>
                  <p className="mt-1.5 text-[14.5px] font-semibold text-fg">
                    {addon.name}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-cream/55">
                    {addon.copy}
                  </p>
                </motion.div>
              ))}
            </div>

            <p className="mt-6 border-t border-cream/10 pt-5 text-[13px] text-cream/50">
              {t.pricing.note}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-3 text-[14px]">
            <Link href="/carta-digital-qr" className="font-semibold text-accent-ink hover:text-fg">{t.qrMenu.eyebrow}</Link>
            <Link href="/web-de-pedidos" className="font-semibold text-accent-ink hover:text-fg">{t.orderingSite.eyebrow}</Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/**
 * The scarcity line, directly above the prices — the one place a visitor is
 * already weighing cost against what they get, which is where the founder
 * terms change the answer.
 */
function FounderBanner({ copy }) {
  return (
    <Reveal delay={0.14}>
      <div className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border border-accent-400/40 bg-accent-400/[0.07] px-5 py-5 shadow-accent sm:mt-12 sm:px-7 sm:py-6">
        <span
          aria-hidden
          className="sweep-sheen pointer-events-none absolute inset-0 opacity-[0.14]"
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="lg:shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink-950/45 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-label ring-1 ring-inset ring-accent-400/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-300/80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-300" />
              </span>
              {copy.label}
            </span>
            <p className="mt-2.5 font-display text-[21px] font-extrabold leading-tight tracking-[-0.02em] text-fg sm:text-[23px]">
              {copy.headline}
            </p>
          </div>

          <ul className="grid gap-2 text-[13.5px] leading-snug text-cream/85 sm:grid-cols-3 lg:flex-1 lg:border-l lg:border-accent-400/25 lg:pl-8">
            {copy.perks.map((perk) => (
              <li key={perk} className="flex gap-2">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
