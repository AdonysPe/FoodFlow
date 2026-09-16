"use client";

import { m as motion } from "framer-motion";
import Container from "@/components/ui/Container";
import PointerGlow from "@/components/ui/PointerGlow";
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
          <div className="relative">
            {/* Warm light behind the pane — the glass has to refract something,
                otherwise it is just a grey box. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -bottom-6 top-6 -z-10 rounded-[3rem] bg-[radial-gradient(60%_70%_at_75%_60%,rgba(255,90,51,0.22),transparent_70%),radial-gradient(50%_60%_at_20%_10%,rgba(255,162,133,0.12),transparent_70%)] blur-2xl"
            />

            <div className="group relative isolate overflow-hidden rounded-[2rem] liquid px-6 py-14 text-cream sm:px-12 sm:py-16">
              <PointerGlow radius={520} />
              {/* slow sheen across the pane, so the light never sits still */}
              <span
                aria-hidden
                className="sweep-sheen pointer-events-none absolute inset-0 opacity-20"
              />

              <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-14">
                <div className="lg:col-span-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-cream/[0.07] px-3.5 py-1.5 text-[12px] font-semibold text-cream/80 ring-1 ring-inset ring-cream/10">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400/70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
                    </span>
                    {t.cta.badge}
                  </span>

                  <h2 className="mt-6 font-display text-[2.1rem] font-extrabold leading-[1.04] tracking-[-0.04em] text-balance text-fg sm:text-[2.9rem]">
                    {t.cta.titleLead}{" "}
                    <span className="text-cream/45">{t.cta.titleAccent}</span>
                  </h2>

                  <p className="mt-5 max-w-lg text-pretty text-[15.5px] leading-relaxed text-cream/70 sm:text-base">
                    {t.cta.paragraph}
                  </p>

                  <div className="mt-6 rounded-xl border border-cream/10 bg-cream/[0.04] p-4 text-[13.5px] leading-relaxed text-cream/75">
                    {t.cta.founder}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {/* the one saturated thing on the pane: the action */}
                    <Button
                      type="button"
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
                      className="liquid-soft inline-flex h-13 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold text-cream/90 transition-colors duration-300 hover:bg-cream/[0.1] hover:text-fg"
                    >
                      <IconChat className="h-4 w-4 text-chat-ink" />
                      {t.cta.askAnything}
                    </button>
                  </div>

                  <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-[13px] font-medium text-cream/70">
                    {t.cta.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-1.5">
                        <IconCheck className="h-3.5 w-3.5 text-accent-ink" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* plan teaser — each tile opens the chat on the plans
                    answer. The tiles carry the first two lines of what the
                    plan includes and stretch to the height of the copy
                    beside them, so the column fills instead of leaving a
                    hole between the prices and the notes. */}
                <div className="flex h-full flex-col lg:col-span-6">
                  <div className="flex flex-1 flex-col">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                      {t.cta.plansLabel}
                    </p>

                    <div className="mt-4 flex flex-1 flex-col gap-3">
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
                          className="liquid-soft group flex flex-1 flex-col justify-center gap-3 rounded-2xl px-5 py-4 text-left transition-colors duration-300 hover:bg-cream/[0.1]"
                        >
                          <span className="flex items-start justify-between gap-4">
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="font-display text-[16.5px] font-bold text-fg">
                                  {plan.name}
                                </span>
                                {plan.badge && (
                                  <span className="rounded-full bg-accent-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent-ink ring-1 ring-inset ring-accent-400/30">
                                    {plan.badge}
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-[13px] text-cream/55">
                                {plan.tagline}
                              </span>
                            </span>

                            <span className="flex shrink-0 items-center gap-2">
                              <span className="font-display text-[18px] font-bold text-accent-ink">
                                {plan.price}
                                <span className="text-[11.5px] font-medium text-cream/55">
                                  {plan.period}
                                </span>
                              </span>
                              <IconArrowRight className="h-4 w-4 text-cream/40 transition-colors group-hover:text-accent-ink" />
                            </span>
                          </span>

                          {/* the two lines that separate this plan from the
                              one above it — the same list the pricing page
                              shows, cut to its opening pair */}
                          <span className="grid gap-1.5 border-t border-cream/10 pt-3">
                            {plan.features.slice(0, 2).map((feature) => (
                              <span
                                key={feature}
                                className="flex gap-2 text-[12.5px] leading-snug text-cream/65"
                              >
                                <IconCheck className="mt-[3px] h-3 w-3 shrink-0 text-accent-ink" />
                                {feature}
                              </span>
                            ))}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    {/* what it runs on and how their customers pay — the two
                        questions that arrive right after the price does */}
                    <ul className="space-y-2 border-t border-cream/10 pt-4 text-[13px] leading-relaxed text-cream/65">
                      {t.pricing.keyNotes.map((note) => (
                        <li key={note} className="flex gap-2.5">
                          <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />
                          {note}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 text-[13px] text-cream/55">
                      {t.cta.loginPrompt}{" "}
                      <a
                        href="/login"
                        className="font-semibold text-fg underline-offset-4 hover:underline"
                      >
                        {t.cta.loginCta}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
