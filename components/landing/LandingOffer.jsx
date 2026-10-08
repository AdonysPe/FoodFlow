"use client";

import Reveal from "@/components/ui/Reveal";
import { IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The 48-hour offer, B design. This is everything the old hero card said
 * (t.hero.offer: the three steps, what the spot includes, the price line
 * and the data note), now laid out as two large cards:
 *
 *   - the inverted one is the 48 hours: a timeline that fills 0h → 24h →
 *     48h on a loop, then what the spot includes;
 *   - the dark one is "0%": a small ledger where demo orders land with
 *     S/ 0.00 of commission each, then the price line and the data note.
 *
 * The inverted card uses `bg-cream` + `text-ink-950`: on warm black that is
 * a cream card with dark ink, and on paper the tokens flip into a dark card
 * with light ink — the contrast with its section holds in both themes.
 */
export default function LandingOffer() {
  const { t } = useLanguage();
  const offer = t.hero.offer;
  const ledger = t.landingB.offer.ledger;
  const lastStep = offer.steps.length - 1;

  return (
    <section id="piloto" className="relative scroll-mt-24 overflow-x-clip py-24 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
        {/* ------------------------------------------------ 48 hours */}
        <Reveal className="h-full">
          <article className="flex h-full flex-col gap-6 rounded-[2rem] bg-cream p-8 text-ink-950 sm:p-11">
            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-950/60">{offer.eyebrow}</p>
            <p aria-hidden className="font-display text-[6.5rem] font-semibold leading-[0.82] tracking-[-0.07em] sm:text-[9rem]">
              48<span className="text-accent-600">h</span>
            </p>

            {/* the timeline takes the card's spare height and sits centred in
                it, so the two cards can match heights without leaving a hole */}
            <div className="flex flex-1 flex-col justify-center gap-6 py-4">
            <div className="relative mx-3.5 h-7">
              <div className="absolute inset-x-0 top-[13px] h-0.5 overflow-hidden rounded-full bg-ink-950/15">
                <div className="pv pv-fill absolute inset-0 bg-ink-950" />
              </div>
              {offer.steps.map((step, i) => (
                <span
                  key={i}
                  className={`pv pv-n${i + 1} absolute top-0 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full font-mono text-[10.5px] font-semibold ${
                    i === lastStep ? "bg-accent-600 text-white" : "bg-ink-950 text-cream"
                  }`}
                  style={{ left: `${(i / lastStep) * 100}%` }}
                >
                  {step.time}
                </span>
              ))}
            </div>
            <ol className="grid grid-cols-3 gap-3 text-[14px] leading-snug">
              {offer.steps.map((step, i) => (
                <li
                  key={i}
                  className={`font-semibold ${i === 1 ? "text-center" : i === lastStep ? "text-right" : ""}`}
                >
                  {step.title}
                </li>
              ))}
            </ol>
            </div>

            <div className="border-t border-ink-950/15 pt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-950/60">{offer.includedLabel}</p>
              <ul className="mt-3.5 space-y-2.5">
                {offer.included.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-[14.5px] leading-snug text-ink-950/85">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </Reveal>

        {/* ------------------------------------------------ 0 % */}
        <Reveal delay={0.08} className="h-full">
          <article className="flex h-full flex-col gap-6 rounded-[2rem] border border-cream/[0.08] bg-ink-900 p-8 sm:p-11">
            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-cream/50">{ledger.eyebrow}</p>
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-display text-[6.5rem] font-semibold leading-[0.82] tracking-[-0.07em] text-fg sm:text-[9rem]">
                0<span className="text-accent-icon">%</span>
              </span>
              <span className="text-[17px] text-cream/65">{ledger.zero}</span>
            </p>

            <div aria-hidden className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 border-b border-cream/[0.08] pb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-cream/45">
                <span>{ledger.head[0]}</span>
                <span>{ledger.head[1]}</span>
                <span className="text-right">{ledger.head[2]}</span>
              </div>
              {ledger.rows.map((row, i) => (
                <div
                  key={i}
                  className={`lg lg-r${i + 1} grid grid-cols-[1fr_auto_1fr] gap-3 border-b border-cream/[0.06] py-2.5 text-[15px]`}
                >
                  <span className="text-fg">{row.label}</span>
                  <span className="font-mono text-cream/45">{ledger.fee}</span>
                  <span className="text-right font-semibold text-fg">{row.amount}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between pt-3">
                <span className="text-[14px] text-cream/55">{ledger.totalLabel}</span>
                <span className="grid justify-items-end font-display text-[30px] font-semibold tracking-[-0.04em] text-fg">
                  {ledger.totals.map((total, i) => (
                    <span key={i} className={`lg lg-t${i + 1} col-start-1 row-start-1`}>
                      {total}
                    </span>
                  ))}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream/[0.08]">
                <div className="lg lg-bar h-full rounded-full bg-accent-400" />
              </div>
              <span className="mt-1 text-[12px] text-cream/45">{ledger.note}</span>
            </div>

            <div className="mt-auto border-t border-cream/[0.08] pt-5">
              <p className="font-display text-[1.5rem] font-semibold tracking-[-0.03em] text-fg">{offer.priceTitle}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-cream/65">{offer.priceCopy}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-cream/50">{offer.dataNote}</p>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
