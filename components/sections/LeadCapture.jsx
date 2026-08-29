"use client";

import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import LeadForm from "@/components/lead/LeadForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The form in the page itself, right before the plans: by the time someone
 * has read what it costs, the way to answer is already on screen and nobody
 * has to hunt for a button.
 */
export default function LeadCapture() {
  const { t } = useLanguage();
  const copy = t.leadForm;

  return (
    <section
      id="contacto"
      className="relative scroll-mt-24 overflow-x-clip py-20 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-8 -z-10 h-[24rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.08),transparent_65%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.subtitle}
        />

        <Reveal delay={0.14}>
          <div className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-cream/10 bg-ink-800/60 p-5 shadow-lift sm:mt-12 sm:p-7">
            <LeadForm source="web_form" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
