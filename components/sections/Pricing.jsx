"use client";

import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, scaleIn } from "@/lib/motion";

export default function Pricing() {
  const { t } = useLanguage();
  const { openChat } = useChat();
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
          eyebrow={t.pricing.eyebrow}
          title={t.pricing.title}
          description={t.pricing.description}
        />

        <RevealGroup className="mt-12 grid gap-4 sm:mt-14 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <RevealItem key={plan.name} variants={scaleIn}>
              <article
                className={`flex h-full flex-col rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1.5 sm:p-7 ${
                  plan.badge
                    ? "border-accent-400/45 bg-accent-400/[0.06] shadow-lift"
                    : "border-cream/10 bg-ink-800/70 shadow-card hover:border-cream/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display text-[19px] font-bold text-white">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span className="rounded-full bg-accent-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-950">
                      {t.pricing.popular}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13.5px] text-cream/55">{plan.tagline}</p>

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-[2.3rem] font-extrabold tracking-[-0.03em] text-white">
                    {plan.price}
                  </span>
                  <span className="text-[14px] font-medium text-cream/50">
                    {plan.period}
                  </span>
                  <span aria-hidden className="text-[14px] text-accent-300">
                    *
                  </span>
                </p>

                <ul className="mt-6 flex-1 space-y-2.5 border-t border-cream/10 pt-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-2.5 text-[14px] leading-snug text-cream/75"
                    >
                      <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant={plan.badge ? "primary" : "secondary"}
                  size="md"
                  className="mt-7 w-full"
                  onClick={() => openChat("planes")}
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

        <Reveal delay={0.08}>
          <p className="mt-5 text-[13px] text-cream/55">{t.pricing.taxNote}</p>
        </Reveal>

        {/* add-ons: the "and if I need one more waiter?" answer */}
        <Reveal delay={0.12}>
          <div className="mt-12 rounded-2xl border border-cream/10 bg-ink-800/60 p-6 shadow-card sm:p-7">
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
                    <span className="font-display text-[19px] font-bold text-accent-300">
                      {addon.price}
                    </span>
                    <span className="text-[12.5px] text-cream/50">{addon.unit}</span>
                  </p>
                  <p className="mt-1.5 text-[14.5px] font-semibold text-white">
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
      </Container>
    </section>
  );
}
