"use client";

import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { LEGAL_HOLDER } from "@/lib/legal/holder";

/**
 * Renderer shared by every legal document. The documents themselves live in
 * `lib/legal/` as structured data, so the wording is versioned in one place
 * and the presentation in another.
 *
 * These pages are Spanish only while the rest of the site is bilingual: they
 * govern a contract executed in Peru, and a second translated text would be
 * one more thing that could be read against the first.
 */
export default function LegalDoc({ doc }) {
  return (
    <section className="relative overflow-x-clip pt-32 pb-24 sm:pt-40 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[24rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.09),transparent_65%)] blur-3xl"
      />

      <Container className="max-w-3xl">
        <Reveal>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em] text-gradient sm:text-5xl">
            {doc.title}
          </h1>
        </Reveal>

        <Reveal delay={0.06}>
          <p className="mt-3 text-[13px] text-cream/50">{doc.updated}</p>
        </Reveal>

        {doc.intro.map((paragraph, i) => (
          <Reveal key={i} delay={0.1 + i * 0.04}>
            <p className="mt-5 text-[16px] leading-relaxed text-cream/70">{paragraph}</p>
          </Reveal>
        ))}

        <div className="mt-10 divide-y divide-cream/10 border-y border-cream/10">
          {doc.sections.map((section, i) => (
            <Reveal key={section.title} delay={Math.min(i, 3) * 0.05}>
              <div className="py-7">
                <h2 className="font-display text-[19px] font-semibold text-fg">
                  {section.title}
                </h2>
                {section.body.map((paragraph, j) => (
                  <p
                    key={j}
                    className="mt-2.5 text-[15px] leading-relaxed text-cream/66"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8">
            <p className="text-[13.5px] text-cream/50">
              ¿Dudas sobre este documento? Escríbenos:
            </p>
            <a
              href={`mailto:${LEGAL_HOLDER.email}`}
              className="mt-1 inline-block text-[15px] font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              {LEGAL_HOLDER.email}
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
