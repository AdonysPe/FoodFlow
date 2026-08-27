"use client";

import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { IconArrowRight, IconChat, IconCheck } from "@/components/ui/Icons";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

export default function CTA() {
  const { t } = useLanguage();
  const { openChat } = useChat();
  // The plans live in the chat script, so prices are written down once.
  const plans = t.chat.plans.items;

  return (
    <section id="cta" className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-accent-400 px-6 py-14 text-ink-950 sm:px-12 sm:py-16">
            {/* slow sheen across the block, so the panel is never quite static */}
            <span
              aria-hidden
              className="sweep-sheen pointer-events-none absolute inset-0 opacity-40"
            />

            <div className="relative grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-ink-950/10 px-3.5 py-1.5 text-[12px] font-semibold text-ink-950/70">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink-950/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink-950" />
                  </span>
                  {t.cta.badge}
                </span>

                <h2 className="mt-6 font-display text-[2.1rem] font-extrabold leading-[1.04] tracking-[-0.04em] text-balance sm:text-[2.9rem]">
                  {t.cta.titleLead}{" "}
                  <span className="text-ink-950/60">{t.cta.titleAccent}</span>
                </h2>

                <p className="mt-5 max-w-lg text-pretty text-[15.5px] leading-relaxed text-ink-950/70 sm:text-base">
                  {t.cta.paragraph}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="invert"
                    size="lg"
                    onClick={() => openChat("planes")}
                    icon={
                      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    }
                  >
                    {t.cta.askPlans}
                  </Button>
                  <button
                    type="button"
                    onClick={() => openChat()}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-ink-950/25 px-6 text-[15px] font-semibold transition-colors duration-300 hover:bg-ink-950/10"
                  >
                    <IconChat className="h-4 w-4" />
                    {t.cta.askAnything}
                  </button>
                </div>

                <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-[13px] font-medium text-ink-950/65">
                  {t.cta.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <IconCheck className="h-3.5 w-3.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* plan teaser — each row opens the chat on the plans answer */}
              <div className="lg:col-span-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-950/50">
                  {t.cta.plansLabel}
                </p>

                <div className="mt-4 flex flex-col gap-2.5">
                  {plans.map((plan, i) => (
                    <motion.button
                      key={plan.name}
                      type="button"
                      onClick={() => openChat("planes")}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                      whileHover={{ x: 4 }}
                      className="group flex items-center gap-4 rounded-2xl bg-ink-950 px-5 py-4 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-display text-[16px] font-bold text-white">
                            {plan.name}
                          </span>
                          {plan.badge && (
                            <span className="rounded-full bg-accent-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-950">
                              {plan.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[13px] text-cream/50">
                          {plan.tagline}
                        </span>
                      </span>
                      <span className="font-display text-[17px] font-bold text-accent-400">
                        {plan.price}
                        <span className="text-[11.5px] font-medium text-cream/40">
                          {plan.period}
                        </span>
                      </span>
                      <IconArrowRight className="h-4 w-4 shrink-0 text-cream/30 transition-colors group-hover:text-accent-400" />
                    </motion.button>
                  ))}
                </div>

                <p className="mt-4 text-[13px] text-ink-950/60">
                  {t.cta.loginPrompt}{" "}
                  <a
                    href="/login"
                    className="font-semibold text-ink-950 underline-offset-4 hover:underline"
                  >
                    {t.cta.loginCta}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
