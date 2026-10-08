"use client";

import { m as motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { IconArrowRight, IconChat, IconCheck } from "@/components/ui/Icons";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

/**
 * The closing section of the home page, B design. Same anchor (#cta, which
 * the 404 page links to), same copy and the same behaviour as
 * components/sections/CTA.jsx — the plan tiles and "Ver los planes" open
 * the chat on its plans answer, the second button opens the chat — only
 * restaged: a large display headline over a warm glow, then the plans as
 * B cards. The other pages keep using the original CTA.
 */
export default function LandingCTA() {
  const { t } = useLanguage();
  const { openChat } = useChat();
  const plans = t.chat.plans.items;

  return (
    <section id="cta" className="relative isolate scroll-mt-24 overflow-x-clip py-28 sm:py-36">
      <div
        aria-hidden
        className="lb-glow pointer-events-none absolute left-1/2 -translate-x-1/2 top-24 -z-10 h-[460px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,51,0.22),transparent)] blur-[30px]"
      />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-cream/10 bg-cream/[0.06] px-3.5 py-1.5 text-[13px] text-cream/80 backdrop-blur-xl">
            <span className="lb-pulse h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
            {t.cta.badge}
          </span>
          <h2 className="mx-auto mt-7 max-w-4xl font-display text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.045em] text-balance text-fg sm:text-5xl lg:text-[3.4rem]">
            {t.cta.titleLead} <span className="text-cream/45">{t.cta.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-[17px] leading-relaxed text-cream/65">{t.cta.paragraph}</p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-full! sm:w-auto"
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
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border border-cream/15 px-7 text-[15px] font-semibold text-cream/90 transition-colors duration-300 hover:bg-cream/[0.08] hover:text-fg sm:w-auto"
            >
              <IconChat className="h-4 w-4 text-chat-ink" />
              {t.cta.askAnything}
            </button>
          </div>

          <ul className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[13px] font-medium text-cream/65">
            {t.cta.bullets.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <IconCheck className="h-3.5 w-3.5 text-accent-ink" />
                {b}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-cream/10 bg-cream/[0.04] p-5 text-center text-[14.5px] leading-relaxed text-cream/75">
            {t.cta.founder}
          </div>
        </Reveal>

        <div className="mt-14">
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-cream/50">
            {t.cta.plansLabel}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((plan, i) => {
              const featured = Boolean(plan.badge);
              return (
                <motion.button
                  key={plan.name}
                  type="button"
                  onClick={() => openChat("planes")}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className={`group flex flex-col gap-3 rounded-[1.75rem] p-7 text-left transition-colors duration-300 ${
                    featured
                      ? "bg-cream text-ink-950 shadow-[0_40px_90px_-40px_rgba(255,90,51,0.45)]"
                      : "border border-cream/[0.08] bg-ink-900 hover:border-accent-400/35"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className={`font-display text-[19px] font-semibold ${featured ? "" : "text-fg"}`}>{plan.name}</span>
                    {plan.badge && (
                      <span className="rounded-full bg-accent-600 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
                        {plan.badge}
                      </span>
                    )}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className={`font-display text-[44px] font-semibold leading-none tracking-[-0.05em] ${featured ? "" : "text-fg"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-[13px] ${featured ? "text-ink-950/60" : "text-cream/55"}`}>{plan.period}</span>
                  </span>
                  <span className={`text-[14px] ${featured ? "text-ink-950/70" : "text-cream/60"}`}>{plan.tagline}</span>
                  <span className={`mt-1 grid gap-2 border-t pt-4 ${featured ? "border-ink-950/15" : "border-cream/10"}`}>
                    {plan.features.slice(0, 2).map((feature) => (
                      <span
                        key={feature}
                        className={`flex gap-2 text-[13px] leading-snug ${featured ? "text-ink-950/80" : "text-cream/70"}`}
                      >
                        <IconCheck className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${featured ? "text-accent-600" : "text-accent-ink"}`} />
                        {feature}
                      </span>
                    ))}
                  </span>
                  <span
                    className={`mt-auto inline-flex items-center gap-1.5 pt-2 text-[13.5px] font-semibold ${
                      featured ? "text-accent-600" : "text-accent-ink"
                    }`}
                  >
                    {t.cta.askPlans}
                    <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </motion.button>
              );
            })}
          </div>

          <ul className="mx-auto mt-10 grid max-w-4xl gap-2 text-[13.5px] leading-relaxed text-cream/60 sm:grid-cols-2">
            {t.pricing.keyNotes.map((note) => (
              <li key={note} className="flex gap-2.5">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />
                {note}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-center text-[13.5px] text-cream/55">
            {t.cta.loginPrompt}{" "}
            <a href="/login" className="font-semibold text-fg underline-offset-4 hover:underline">
              {t.cta.loginCta}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
