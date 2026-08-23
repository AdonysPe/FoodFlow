"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import ThreeBackground from "@/components/ThreeBackground";
import { IconArrowRight, IconCheck, IconShield } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE } from "@/lib/motion";

export default function CTA() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // Demo-only handler — wire this to your signup endpoint.
  // Reads the value off the form rather than component state so browser
  // autofill (which can set the DOM value without a React change event)
  // still submits correctly.
  const onSubmit = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!value.includes("@")) return;
    setEmail(value);
    setSent(true);
  };

  return (
    <section id="cta" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-32">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.09] bg-linear-to-b from-ink-800/80 to-ink-900/90 px-6 py-16 text-center backdrop-blur-2xl sm:px-12 sm:py-20">
            <ThreeBackground className="opacity-45" density={0.55} />

            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[-14rem] -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,47,0.28),transparent_62%)] blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 h-px hairline-top"
            />

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-white/60 backdrop-blur-md">
                <IconShield className="h-3.5 w-3.5 text-accent-300" />
                {t.cta.badge}
              </span>

              <h2 className="mt-7 font-display text-[2.1rem] font-extrabold leading-[1.06] tracking-[-0.035em] text-balance text-gradient sm:text-5xl">
                {t.cta.titleLead}{" "}
                <span className="text-gradient-accent">{t.cta.titleAccent}</span>
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-pretty text-[15.5px] leading-relaxed text-white/55 sm:text-base">
                {t.cta.paragraph}
              </p>

              <div className="mt-10">
                <AnimatePresence mode="wait" initial={false}>
                  {sent ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-xl border border-mint/25 bg-mint/10 px-5 py-4 text-[14.5px] text-mint"
                    >
                      <IconCheck className="h-4 w-4" />
                      {t.cta.success}
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={onSubmit}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
                    >
                      <label htmlFor="cta-email" className="sr-only">
                        {t.cta.emailLabel}
                      </label>
                      <input
                        id="cta-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.cta.placeholder}
                        className="h-13 w-full rounded-xl sm:flex-1 border border-white/[0.1] bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="shrink-0"
                        icon={
                          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        }
                      >
                        {t.cta.button}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[12.5px] text-white/35">
                {t.cta.bullets.map((b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-accent-400" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
