"use client";

import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { CONTACT_EMAIL } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function CookiePolicy() {
  const { t } = useLanguage();
  const page = t.cookies.page;

  return (
    <section className="relative overflow-x-clip pt-32 pb-24 sm:pt-40 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[24rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.09),transparent_65%)] blur-3xl"
      />

      <Container className="max-w-3xl">
        <Reveal>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em] text-gradient sm:text-5xl">
            {page.title}
          </h1>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="mt-3 text-[13px] text-cream/50">{page.updated}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-[16px] leading-relaxed text-cream/70">{page.intro}</p>
        </Reveal>

        <div className="mt-10 divide-y divide-cream/10 border-y border-cream/10">
          {page.sections.map((section, i) => (
            <Reveal key={i} delay={Math.min(i, 3) * 0.05}>
              <div className="py-6">
                <h2 className="font-display text-[19px] font-semibold text-white">
                  {section.title}
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-cream/66">
                  {section.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-8 inline-block text-[15px] font-medium text-accent-300 underline-offset-4 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </Reveal>
      </Container>
    </section>
  );
}
