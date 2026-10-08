"use client";

import Reveal, { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { IconAnalytics, IconKitchen, IconMenuBook, IconOrders } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { scaleIn } from "@/lib/motion";

// Paired with t.features.items by index, like the original section.
const ICONS = [IconOrders, IconKitchen, IconMenuBook, IconAnalytics];
const VISUALS = [QueueVisual, KitchenVisual, MenuVisual, NumbersVisual];

/**
 * "Qué incluye", B design. Same four items and footnote as before; each
 * tile now carries a small moving picture of the thing it promises, drawn
 * from the product (a queue filling, a ticket going ready, a price change
 * reaching every table, the day's bars rising).
 */
export default function LandingFeatures() {
  const { t } = useLanguage();
  const f = t.features;
  const tiles = t.landingB.tiles;

  return (
    <section id="features" className="relative scroll-mt-24 overflow-x-clip py-28 sm:py-32">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-ink">{f.eyebrow}</p>
          <h2 className="mt-4 max-w-3xl font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.05em] text-fg sm:text-6xl lg:text-[4.2rem]">
            {f.title}
          </h2>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-cream/65">{f.description}</p>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2">
          {f.items.map((item, i) => {
            const Icon = ICONS[i];
            const Visual = VISUALS[i];
            return (
              // Index key: the title is translated, and keying on it would
              // remount the tile on every language toggle.
              <RevealItem key={i} variants={scaleIn}>
                <article className="flex h-full flex-col gap-6 rounded-[1.75rem] border border-cream/[0.08] bg-ink-900 p-6 transition-colors duration-500 hover:border-accent-400/35 sm:p-8">
                  <div className="flex min-h-[200px] items-center justify-center rounded-[1.25rem] border border-cream/[0.06] bg-ink-950 p-5">
                    <Visual tiles={tiles} />
                  </div>
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cream/10 bg-cream/[0.04] text-accent-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-fg">{item.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-cream/65">{item.copy}</p>
                    </div>
                  </div>
                </article>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal delay={0.1}>
          <p className="mt-8 text-[14px] text-cream/55">{f.footnote}</p>
        </Reveal>
      </div>
    </section>
  );
}

/** Three channels, one queue: tickets slot in one after another. */
function QueueVisual({ tiles }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2.5">
      {tiles.queue.map((row, i) => (
        <div
          key={i}
          className="ft ft-q flex items-center gap-3 rounded-xl border border-cream/[0.08] bg-ink-800 px-3.5 py-3"
          style={{ animationDelay: `${i * 0.9}s` }}
        >
          <span className="font-mono text-[12px] text-cream/45">{String(i + 1).padStart(2, "0")}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              i === 0 ? "bg-accent-400 text-on-accent" : "bg-cream/[0.08] text-cream/80"
            }`}
          >
            {row.channel}
          </span>
          <span className="flex-1 truncate text-[13px] text-fg">{row.detail}</span>
        </div>
      ))}
    </div>
  );
}

/** A ticket on the kitchen screen: the timer fills, then it flips to ready. */
function KitchenVisual({ tiles }) {
  const k = tiles.kitchen;
  return (
    <div className="flex w-full max-w-xs flex-col gap-2.5 rounded-2xl border-t-[3px] border-accent-400 bg-ink-800 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[15px] font-semibold uppercase text-fg">{k.ticket}</span>
        <span className="grid justify-items-end text-[12px] font-semibold">
          <span className="ft ft-cook col-start-1 row-start-1 rounded-full border border-cream/25 px-2 py-0.5 text-fg">
            {k.cooking}
          </span>
          <span className="ft ft-ready col-start-1 row-start-1 rounded-full bg-accent-400 px-2 py-0.5 text-on-accent">
            {k.ready}
          </span>
        </span>
      </div>
      {k.lines.map((line, i) => (
        <span key={i} className="text-[14px] text-fg">
          {line}
        </span>
      ))}
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream/[0.08]">
        <div className="ft ft-timer h-full rounded-full bg-cream" />
      </div>
    </div>
  );
}

/** One price change in the panel reaches every table's menu. */
function MenuVisual({ tiles }) {
  const m = tiles.menu;
  const price = (
    <span className="grid font-semibold">
      <span className="ft ft-old col-start-1 row-start-1">{m.oldPrice}</span>
      <span className="ft ft-new col-start-1 row-start-1 text-accent-ink">{m.newPrice}</span>
    </span>
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border border-accent-400/35 bg-ink-800 px-3.5 py-2.5">
        <span className="flex-1 text-[13px] text-cream/65">{m.edit}</span>
        <span className="text-[15px] text-fg">{price}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {m.tables.map((table, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-xl bg-ink-800 p-2.5">
            <span className="font-mono text-[10px] uppercase text-cream/50">{table}</span>
            <span className="truncate text-[12px] text-fg">{m.dish}</span>
            <span className="text-[13px] text-fg">{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The day's numbers: the bars rise, the peak hour in vermilion. */
function NumbersVisual({ tiles }) {
  const n = tiles.numbers;
  const bars = [30, 52, 40, 64, 88, 100, 70, 36];
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-cream/55">{n.label}</span>
        <span className="font-display text-[26px] font-semibold tracking-[-0.04em] text-fg">{n.value}</span>
      </div>
      <div className="flex h-[110px] items-end gap-2">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`ft ft-bar flex-1 rounded-md ${h === 100 ? "bg-accent-400" : "bg-cream/[0.12]"}`}
            style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
}
