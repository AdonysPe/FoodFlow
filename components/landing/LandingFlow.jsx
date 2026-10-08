"use client";

import Reveal from "@/components/ui/Reveal";
import { IconCheck } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const PHOTOS = ["/demo/carta/ceviche.webp", "/demo/carta/pisco-sour.webp"];

/**
 * "Tres pantallas, un solo pedido": one order (Mesa 07) followed across the
 * guest's phone, the kitchen screen and the owner's dashboard. A single
 * 12-second CSS clock (the `sb` classes in landing-b.css) drives all three,
 * and the stepper above lights the card that is acting. Every figure is a
 * demo figure and the note under the cards says so.
 */
export default function LandingFlow() {
  const { t } = useLanguage();
  const f = t.landingB.flow;

  return (
    <section id="flujo" className="relative scroll-mt-24 overflow-x-clip py-28 sm:py-36">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-ink">{f.eyebrow}</p>
            <h2 className="mt-4 max-w-3xl font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.05em] text-fg sm:text-6xl lg:text-[4.6rem]">
              {f.title}
              <br />
              <span className="text-cream/45">{f.titleMuted}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-md text-[17px] leading-relaxed text-cream/65">{f.description}</p>
          </Reveal>
        </div>

        {/* stepper — hidden on phones, where the cards stack and the order
            of reading already is the order of events */}
        <div aria-hidden className="relative mt-16 hidden h-[70px] md:block">
          <div className="absolute left-[16.66%] right-[16.66%] top-[13px] h-0.5 overflow-hidden rounded-full bg-cream/10">
            <div className="sb sb-fill absolute inset-0 bg-accent-400" />
          </div>
          {f.steps.map((label, i) => (
            <div
              key={i}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-2.5"
              style={{ left: `${16.66 + i * 33.33}%` }}
            >
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-cream/20 bg-ink-900 font-mono text-[12px] font-semibold text-fg">
                <span className={`sb sb-hl${i + 1} absolute -inset-0.5 rounded-full bg-accent-400 shadow-[0_0_0_6px_rgba(255,90,51,0.16)]`} />
                <span className="relative">{i + 1}</span>
              </span>
              <span className="whitespace-nowrap text-[13px] text-cream/65">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:mt-6 md:grid-cols-3">
          <StoryCard card={f.cards[0]} index={1}>
            <PhoneScreen phone={f.phone} />
          </StoryCard>
          <StoryCard card={f.cards[1]} index={2}>
            <KitchenScreen kitchen={f.kitchen} />
          </StoryCard>
          <StoryCard card={f.cards[2]} index={3}>
            <PanelScreen panel={f.panel} />
          </StoryCard>
        </div>

        <p className="mt-5 text-center text-[12px] text-cream/50">{f.note}</p>
      </div>
    </section>
  );
}

function StoryCard({ card, index, children }) {
  return (
    <Reveal delay={0.06 * index} className="h-full">
      <article className="relative flex h-full flex-col gap-6 rounded-[1.75rem] border border-cream/[0.08] bg-ink-900 p-6 sm:p-7">
        {/* the ring that lights while this screen is the one acting */}
        <span
          aria-hidden
          className={`sb sb-hl${index} pointer-events-none absolute -inset-px rounded-[1.75rem] border-[1.5px] border-accent-400 shadow-[0_0_0_6px_rgba(255,90,51,0.07),0_30px_80px_-30px_rgba(255,90,51,0.35)]`}
        />
        <div className="flex min-h-[340px] flex-1">{children}</div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-cream/45">{card.eyebrow}</span>
          <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.03em] text-fg">{card.title}</h3>
          <p className="text-[15px] leading-relaxed text-cream/65">{card.copy}</p>
        </div>
      </article>
    </Reveal>
  );
}

/** The guest's phone: the order, the send button that gets pressed, the toast. */
function PhoneScreen({ phone }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[224px] items-start">
      <div data-theme="dark" className="relative h-[340px] w-full rounded-t-[36px] bg-ink-600 p-2 pb-0">
        <div className="flex h-full flex-col gap-2.5 overflow-hidden rounded-t-[29px] bg-ink-950 px-3.5 pt-5 text-left">
          <span className="text-[11px] text-cream/55">{phone.table} · Casa Ñusta</span>
          <span className="font-display text-[22px] font-semibold tracking-[-0.04em] text-fg">{phone.title}</span>
          {phone.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-[14px] bg-ink-800 p-2">
              <img src={PHOTOS[i]} alt="" className="h-10 w-10 rounded-[10px] object-cover" />
              <span className="flex-1 text-[13px] font-medium text-fg">{item.name}</span>
              <span className="text-[12px] text-cream/55">{item.price}</span>
            </div>
          ))}
          <div className="sb sb-press mb-[18px] mt-auto flex justify-between rounded-[14px] bg-accent-400 px-3.5 py-3 text-[13px] font-semibold text-on-accent">
            <span>{phone.send}</span>
            <span>{phone.total}</span>
          </div>
        </div>
        <div className="sb sb-toast absolute bottom-[76px] left-[22px] right-[22px] flex items-center justify-center gap-1.5 rounded-full bg-cream px-3 py-2 text-[13px] font-semibold text-ink-950 shadow-lift">
          <IconCheck className="h-3.5 w-3.5 text-accent-600" />
          {phone.sent}
        </div>
      </div>
    </div>
  );
}

/** The kitchen screen: the ticket drops in and goes Nuevo → En preparación → Listo. */
function KitchenScreen({ kitchen }) {
  return (
    <div
      data-theme="dark"
      className="flex w-full flex-col gap-3 overflow-hidden rounded-[20px] border border-cream/[0.08] bg-ink-950 p-4 text-left"
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-cream/55">
        <span>{kitchen.label}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="lb-pulse h-1.5 w-1.5 rounded-full bg-accent-400" />
          {kitchen.live}
        </span>
      </div>
      <div className="sb sb-ticket flex flex-col gap-2 rounded-[14px] border-t-[3px] border-accent-400 bg-ink-700 p-3.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[16px] font-semibold uppercase text-fg">{kitchen.ticket}</span>
          <span className="grid justify-items-end text-[12px] font-semibold">
            <span className="sb sb-s1 col-start-1 row-start-1 px-2 py-1 text-accent-ink">{kitchen.states[0]}</span>
            <span className="sb sb-s2 col-start-1 row-start-1 rounded-full border border-cream/25 px-2 py-1 text-fg">
              {kitchen.states[1]}
            </span>
            <span className="sb sb-s3 col-start-1 row-start-1 rounded-full bg-accent-400 px-2 py-1 text-on-accent">
              {kitchen.states[2]}
            </span>
          </span>
        </div>
        <span className="text-[12px] text-cream/55">{kitchen.source}</span>
        {kitchen.lines.map((line, i) => (
          <span key={i} className="text-[15px] text-fg">
            {line}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-ink-800 p-3.5 opacity-55">
        <div className="flex justify-between font-mono text-[14px] font-semibold uppercase text-fg">
          <span>{kitchen.other}</span>
          <span className="font-medium text-cream/55">06:12</span>
        </div>
        <span className="text-[14px] text-fg">{kitchen.otherLine}</span>
      </div>
    </div>
  );
}

/** The owner's dashboard: the sale lands, the chart ticks up, the table frees. */
function PanelScreen({ panel }) {
  const tables = [
    { n: "02", busy: true },
    { n: "05", busy: false },
    { n: "07", seven: true },
    { n: "09", busy: true },
    { n: "11", busy: true },
  ];

  return (
    <div
      data-theme="dark"
      className="flex w-full flex-col gap-3.5 overflow-hidden rounded-[20px] border border-cream/[0.08] bg-ink-950 p-4 text-left"
    >
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-cream/55">
        <span>{panel.label}</span>
        <span>{panel.demo}</span>
      </div>

      <div className="flex flex-1 flex-wrap gap-4">
        <div className="flex min-w-0 flex-[1_1_180px] flex-col justify-center gap-3">
          <span className="text-[13px] text-cream/55">{panel.sales}</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid font-display text-[40px] font-semibold leading-none tracking-[-0.05em] text-fg">
              <span className="sb sb-n1 col-start-1 row-start-1">{panel.before}</span>
              <span className="sb sb-n2 col-start-1 row-start-1">{panel.after}</span>
            </span>
            <span className="sb sb-plus rounded-full bg-mint/[0.12] px-2 py-1 text-[13px] font-semibold text-mint-ink">
              {panel.plus}
            </span>
          </div>
          <div className="flex gap-2">
            {tables.map((table) => (
              <span
                key={table.n}
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border font-mono text-[11px] font-semibold ${
                  table.seven
                    ? "sb sb-t7"
                    : table.busy
                      ? "border-cream bg-cream text-ink-950"
                      : "border-cream/20 text-cream/55"
                }`}
              >
                {table.n}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-[1.3_1_200px] flex-col gap-2 rounded-[14px] bg-ink-800 p-3">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-cream/45">
            <span>{panel.byHour}</span>
            <span>{panel.today}</span>
          </div>
          <div className="relative h-16">
            <svg viewBox="0 0 200 64" preserveAspectRatio="none" className="block h-16 w-full overflow-visible" aria-hidden>
              <path d="M0,58 L20,54 L40,46 L60,50 L80,38 L100,42 L120,28 L140,32 L160,22 L180,26 L180,64 L0,64 Z" fill="rgb(243 239 230 / 0.05)" />
              <path
                d="M0,58 L20,54 L40,46 L60,50 L80,38 L100,42 L120,28 L140,32 L160,22 L180,26"
                fill="none"
                stroke="rgb(243 239 230 / 0.45)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <path className="sb sb-seg" d="M180,26 L200,10" fill="none" stroke="#ff5a33" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="sb sb-dot absolute -right-1 top-1.5 h-[9px] w-[9px] rounded-full bg-accent-400 shadow-[0_0_0_4px_rgba(255,90,51,0.25)]" />
          </div>
          <span className="mt-0.5 text-[11px] text-cream/45">{panel.recent}</span>
          <div className="sb sb-paid flex justify-between rounded-lg bg-mint/10 px-2 py-1.5 text-[12px]">
            <span className="text-fg">{panel.newest.label}</span>
            <span className="font-semibold text-mint-ink">{panel.newest.amount}</span>
          </div>
          {panel.others.map((row, i) => (
            <div key={i} className="flex justify-between px-2 py-1.5 text-[12px]">
              <span className="text-cream/70">{row.label}</span>
              <span className="text-fg">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sb sb-paid mt-auto flex items-center gap-2.5 rounded-[14px] bg-ink-800 px-3.5 py-3 text-[14px] text-fg">
        <IconCheck className="h-4 w-4 text-mint-ink" />
        <span className="flex-1">{panel.paid}</span>
        <span className="text-cream/55">S/ 60</span>
      </div>
    </div>
  );
}
