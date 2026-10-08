"use client";

import Reveal from "@/components/ui/Reveal";
import LeadForm from "@/components/lead/LeadForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The form on the home page, B design. Same anchor (#contacto: the hero
 * button, the navbar and the WhatsApp FAB all point at it), same LeadForm
 * with the same `source`, so leads land exactly where they did. Only the
 * stage changed: heading on the left, the form in a glass card on the
 * right over a warm glow.
 *
 * The other pages keep using components/sections/LeadCapture.jsx.
 */
export default function LandingLeadCapture() {
  const { t } = useLanguage();
  const copy = t.leadForm;

  return (
    <section id="contacto" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-ink">{copy.eyebrow}</p>
          <h2 className="mt-4 max-w-xl font-display text-[2.4rem] font-semibold leading-[0.98] tracking-[-0.05em] text-balance text-fg sm:text-[3.4rem]">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-cream/65">{copy.subtitle}</p>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(255,90,51,0.18),transparent)] blur-3xl"
          />
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-cream/10 bg-cream/[0.045] p-6 shadow-panel backdrop-blur-2xl sm:p-8 lg:mx-0 lg:ml-auto">
            <LeadForm source="web_form" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
