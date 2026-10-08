"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck, IconPlay } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const DemoVideoModal = dynamic(() => import("@/components/DemoVideoModal"), {
  ssr: false,
});

// Where each trail runs on the floor, as a share of its width. They sit on
// grid lines (the floor is 160% of the section and the grid is 72px), so at
// desktop width they read as orders travelling along the lines.
const TRAILS = [
  { left: "37.5%", delay: "0s" },
  { left: "46.875%", delay: "-1.7s" },
  { left: "53.125%", delay: "-3.4s" },
  { left: "62.5%", delay: "-5.1s" },
  { left: "31.25%", delay: "-2.6s", duration: "8.5s" },
  { left: "68.75%", delay: "-6.2s", duration: "8.5s" },
];

// Negative delays spread the four tickets along the pass from the first
// frame, instead of all of them queuing off-screen on load.
const TICKET_DELAYS = ["-1s", "-4.5s", "-8s", "-11.5s"];

/**
 * Hero, B design: centred headline that resolves word by word, the two
 * actions, and below them the kitchen pass — a glass rail where tickets
 * cross Mesa → Cocina → Listo on a loop — over a slow perspective floor.
 *
 * The copy is the same as before (h1, the h2 tagline, the subheadline, the
 * CTA note, the proof list); only the arrangement and the motion changed.
 * The 48-hour offer card that used to sit beside the copy now has its own
 * section further down (LandingOffer), with everything it said.
 */
export default function LandingHero() {
  const { t } = useLanguage();
  const hero = t.hero;
  const pass = t.landingB.pass;
  const [demoOpen, setDemoOpen] = useState(false);

  // The headline resolves one word at a time; the accent and the tail keep
  // their own colours. Delays are computed so the cascade reads in order
  // whatever the language's word count.
  const words = hero.headlineWords;
  const step = 0.09;

  return (
    <section className="relative isolate overflow-hidden pb-24 pt-32 text-center sm:pt-36 lg:pb-28 lg:pt-40">
      <HeroBackground />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <p className="lb-rise inline-flex items-center gap-2.5 rounded-full border border-cream/10 bg-cream/[0.06] px-3.5 py-1.5 text-[13px] text-cream/80 backdrop-blur-xl">
          <span className="lb-pulse h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden />
          {hero.badge}
        </p>

        <h1 className="mx-auto mt-7 max-w-5xl font-display text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.05em] text-balance text-fg sm:text-6xl lg:text-[5.4rem]">
          {words.map((word, i) => (
            // whitespace-pre keeps the real space inside the span, so the
            // accessible name and copy-paste read as words, not one blob.
            <span
              key={i}
              className="lb-word whitespace-pre"
              style={{ animationDelay: `${0.08 + i * step}s` }}
            >
              {`${word} `}
            </span>
          ))}
          <span
            className="lb-word text-accent-icon"
            style={{ animationDelay: `${0.08 + words.length * step}s` }}
          >
            {hero.headlineAccent}
          </span>{" "}
          {/* The tail gets its own line: a block wrapper, because the word
              animation needs the inner span to stay inline-block. */}
          <span className="mt-2 block text-[0.62em] tracking-[-0.035em] text-cream/45">
            <span
              className="lb-word"
              style={{ animationDelay: `${0.2 + (words.length + 1) * step}s` }}
            >
              {hero.headlineTail}
            </span>
          </span>
        </h1>

        {/* What FoodFlow *is*, in the words a search uses — kept as the h2. */}
        <h2
          className="lb-rise mx-auto mt-7 max-w-2xl text-pretty font-display text-[18px] font-medium leading-snug tracking-[-0.015em] text-cream/80 sm:text-[20px]"
          style={{ animationDelay: "0.75s" }}
        >
          {hero.tagline}
        </h2>
        <p
          className="lb-rise mx-auto mt-3.5 max-w-xl text-pretty text-[16px] leading-relaxed text-cream/60"
          style={{ animationDelay: "0.82s" }}
        >
          {hero.subheadline}
        </p>

        <div
          className="lb-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "0.9s" }}
        >
          <Button
            href="#contacto"
            size="lg"
            className="w-full rounded-full! sm:w-auto"
            icon={
              <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            }
          >
            {hero.ctaPrimary}
          </Button>
          <Button
            type="button"
            onClick={() => setDemoOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={demoOpen}
            variant="secondary"
            size="lg"
            className="w-full rounded-full! sm:w-auto"
            icon={<IconPlay className="h-4 w-4 opacity-70" />}
          >
            {hero.ctaSecondary}
          </Button>
        </div>

        <p className="lb-rise mt-4 text-[13px] text-cream/55" style={{ animationDelay: "0.95s" }}>
          {hero.ctaNote}
        </p>

        <ul
          className="lb-rise mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-cream/60"
          style={{ animationDelay: "1s" }}
        >
          {hero.proof.map((p, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <IconCheck className="h-3.5 w-3.5 text-accent-icon" />
              {p}
            </li>
          ))}
        </ul>

        <KitchenPass pass={pass} />
      </div>

      {demoOpen && <DemoVideoModal onClose={() => setDemoOpen(false)} />}
    </section>
  );
}

/** Drifting light, the perspective floor and its trails. Decorative only. */
function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="lb-orb1 absolute left-[8%] top-10 h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,51,0.16),transparent)] blur-[40px]" />
      <div className="lb-orb2 absolute right-[6%] top-32 h-[460px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(176,98,60,0.18),transparent)] blur-[46px]" />
      <div className="lb-glow absolute left-1/2 -translate-x-1/2 top-[calc(100%-640px)] h-[520px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,51,0.34),rgba(255,90,51,0.07)_60%,transparent)] blur-[30px]" />

      <div
        className="lb-floor absolute -left-[30%] -right-[30%] top-[calc(100%-560px)] h-[900px]"
        style={{ perspective: "900px", perspectiveOrigin: "50% 0%" }}
      >
        <div className="absolute inset-0" style={{ transformOrigin: "50% 0%", transform: "rotateX(66deg)" }}>
          <div className="lb-gridflow absolute inset-0" />
          {TRAILS.map((trail, i) => (
            <span
              key={i}
              className="lb-trail"
              style={{ left: trail.left, animationDelay: trail.delay, animationDuration: trail.duration }}
            />
          ))}
        </div>
      </div>
      <div className="lb-horizon absolute inset-x-[15%] top-[calc(100%-560px)] h-px bg-[linear-gradient(90deg,transparent,rgba(255,90,51,0.55),transparent)]" />
    </div>
  );
}

/** The glass rail with the tickets crossing it. */
function KitchenPass({ pass }) {
  return (
    <div
      role="img"
      aria-label={pass.aria}
      className="lb-rise relative mx-auto mt-16 h-[300px] max-w-6xl overflow-hidden rounded-[2rem] border border-cream/10 bg-cream/[0.045] shadow-panel backdrop-blur-2xl sm:mt-20"
      style={{ animationDelay: "1.05s" }}
    >
      <div className="absolute inset-x-0 top-6 grid grid-cols-3 font-mono text-[11px] uppercase tracking-[0.1em] text-cream/45">
        {pass.stages.map((stage, i) => (
          <span
            key={i}
            className={`${i > 0 ? "border-l border-cream/[0.08]" : ""} ${i === 2 ? "text-accent-ink" : ""}`}
          >
            {stage}
          </span>
        ))}
      </div>
      <span aria-hidden className="absolute bottom-6 left-1/3 top-14 w-px bg-cream/[0.08]" />
      <span aria-hidden className="absolute bottom-6 left-2/3 top-14 w-px bg-cream/[0.08]" />

      <div className="lb-draw absolute inset-x-10 top-1/2 -mt-px h-0.5">
        <svg width="100%" height="2" preserveAspectRatio="none" aria-hidden className="block">
          <line
            className="lb-dash"
            x1="0"
            y1="1"
            x2="100%"
            y2="1"
            stroke="var(--rule)"
            strokeWidth="2"
            strokeDasharray="12 12"
          />
        </svg>
      </div>

      {pass.tickets.map((ticket, i) => (
        <div key={i} className="lb-ticket" style={{ animationDelay: TICKET_DELAYS[i] }}>
          <div className="flex w-[220px] flex-col gap-1.5 rounded-2xl bg-cream px-4 py-3.5 text-left text-ink-950 shadow-lift">
            <div className="flex items-center justify-between font-mono text-[13px] font-semibold uppercase">
              <span>{ticket.label}</span>
              <span
                className="lb-state h-2.5 w-2.5 rounded-full bg-accent-400"
                style={{ animationDelay: TICKET_DELAYS[i] }}
              />
            </div>
            {ticket.lines.map((line, j) => (
              <span key={j} className={`text-[14px] ${j > 0 && line.startsWith("—") ? "opacity-60" : ""}`}>
                {line}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-5 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12px] text-cream/50">
        {pass.legend.map((label, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                i === 0 ? "bg-faint" : i === 1 ? "bg-ink-600 ring-1 ring-cream/40" : "bg-accent-400"
              }`}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
