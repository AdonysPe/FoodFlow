"use client";

import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Placeholder brand marks. Each is a small geometric glyph + wordmark so the
 * row reads like real logos instead of grey rectangles. Swap the `glyph` and
 * `name` for customer logos when you have them. Names are proper nouns, so
 * they stay the same across languages.
 */
const BRANDS = [
  { name: "Nordvik", glyph: "hex" },
  { name: "Casa Lume", glyph: "circle" },
  { name: "Tanto", glyph: "square" },
  { name: "Verdegris", glyph: "leaf" },
  { name: "Bru & Co", glyph: "bean" },
  { name: "Kioku", glyph: "arc" },
  { name: "Saltbank", glyph: "wave" },
  { name: "Osteria 9", glyph: "circle" },
];

export default function SocialProof() {
  const { t } = useLanguage();
  const loop = [...BRANDS, ...BRANDS];

  return (
    <section className="relative border-y border-white/[0.06] bg-ink-950 py-14 sm:py-16">
      <Container>
        <Reveal>
          <p className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-white/30">
            {t.socialProof.trust}
          </p>
        </Reveal>
      </Container>

      {/* marquee */}
      <div className="relative mt-9 overflow-hidden fade-edges">
        <div className="flex w-max animate-marquee items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
          {loop.map((b, i) => (
            <BrandMark key={`${b.name}-${i}`} {...b} />
          ))}
        </div>
      </div>

      <Container>
        <div className="mt-14 grid gap-8 border-t border-white/[0.06] pt-10 sm:grid-cols-3">
          {t.socialProof.stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="text-center sm:text-left">
              <p className="font-display text-3xl font-bold tracking-[-0.03em] text-gradient sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/40">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function BrandMark({ name, glyph }) {
  return (
    <div className="group flex shrink-0 items-center gap-2.5 text-white/35 transition-colors duration-300 hover:text-white/75">
      <Glyph kind={glyph} />
      <span className="font-display whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em]">
        {name}
      </span>
    </div>
  );
}

function Glyph({ kind }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    "aria-hidden": true,
  };

  switch (kind) {
    case "hex":
      return (
        <svg {...common}>
          <path d="M10 2.2 17 6.1v7.8L10 17.8 3 13.9V6.1L10 2.2Z" />
        </svg>
      );
    case "square":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="14" height="14" rx="3.5" />
          <path d="M7.5 10h5" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M16.5 3.5c0 7-4.5 11-9.5 11-2 0-3.5-1-3.5-1S4.5 3.5 16.5 3.5Z" />
          <path d="M3.5 16.5 10 10" />
        </svg>
      );
    case "bean":
      return (
        <svg {...common}>
          <ellipse cx="10" cy="10" rx="5" ry="7.2" transform="rotate(35 10 10)" />
          <path d="M7.6 13.2c1.6-2.6 3.2-4.2 5.4-5.6" />
        </svg>
      );
    case "arc":
      return (
        <svg {...common}>
          <path d="M3.2 15a6.8 6.8 0 0 1 13.6 0" />
          <path d="M3.2 15h13.6" />
        </svg>
      );
    case "wave":
      return (
        <svg {...common}>
          <path d="M2.5 12c2-3 4-3 6 0s4 3 6 0 3-1.5 3-1.5" />
          <path d="M2.5 7.5c2-3 4-3 6 0" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
          <circle cx="10" cy="10" r="2.6" />
        </svg>
      );
  }
}
