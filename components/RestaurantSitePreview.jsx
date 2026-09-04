"use client";

import { motion } from "framer-motion";
import { IconChat } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EASE, viewportOnce } from "@/lib/motion";

const ITEM_EMOJI = ["🍔", "🥓", "🥗"];

/**
 * A phone-framed mock of the customer-facing site FoodFlow can build
 * alongside the dashboard: menu, table reservation, an order bar and a
 * WhatsApp ordering button. Built from DOM, not a screenshot, so it reads
 * crisply at any size and switches language with the rest of the page.
 *
 * Demo content only — "Burger House" is a placeholder business.
 */
export default function RestaurantSitePreview({ className = "" }) {
  const { t } = useLanguage();
  const d = t.customSite.demo;

  return (
    // Same as the dashboard preview: the phone shows the customer's own
    // site, so it keeps its dark UI whatever the page around it is doing.
    <div data-theme="dark" className={`relative mx-auto w-full max-w-[300px] text-cream/86 ${className}`}>
      {/* phone bezel */}
      <div className="relative overflow-hidden rounded-[2.75rem] border border-white/[0.12] bg-ink-950 p-2.5 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.95)]">
        <div className="relative overflow-hidden rounded-[2.1rem] border border-white/[0.08] bg-ink-900">
          {/* notch */}
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />

          {/* address bar */}
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-ink-950/70 px-4 pb-2 pt-8">
            <LockIcon />
            <span className="truncate text-[9.5px] text-white/35">{d.browserUrl}</span>
          </div>

          {/* hero */}
          <div className="relative overflow-hidden bg-linear-to-b from-[#3a1508] via-[#1c0f0a] to-ink-900 px-5 pb-6 pt-7 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(255,146,64,0.35),transparent_70%)]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative text-[40px] leading-none"
              aria-hidden
            >
              🍔
            </motion.div>
            <p className="relative mt-2 font-display text-[15px] font-bold tracking-[-0.01em] text-white">
              {d.brand}
            </p>
            <p className="relative mt-1 text-[10.5px] leading-snug text-white/55">
              {d.tagline}
            </p>
            <p className="relative mt-1.5 text-[9.5px] font-medium text-accent-300">
              {d.rating}
            </p>

            <div className="relative mt-4 flex gap-2">
              <span className="flex-1 rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-2 py-2 text-[10.5px] font-semibold text-ink-950">
                {d.ctaMenu}
              </span>
              <span className="flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-2 text-[10.5px] font-semibold text-white">
                {d.ctaReserve}
              </span>
            </div>
          </div>

          {/* menu */}
          <div className="px-4 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {d.menuLabel}
            </p>
            <div className="mt-2 space-y-1.5">
              {d.items.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.1 + i * 0.08 }}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {ITEM_EMOJI[i]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/80">
                    {item.name}
                  </span>
                  <span className="text-[10.5px] font-semibold text-white/50">
                    {item.price}
                  </span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400/15 text-[11px] font-bold text-accent-300">
                    +
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* reservation */}
          <div className="mt-4 px-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold text-white/70">{d.reserveLabel}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[d.reserveFields.date, d.reserveFields.time, d.reserveFields.guests].map(
                  (label) => (
                    <span
                      key={label}
                      className="truncate rounded-md border border-white/[0.08] bg-ink-950/60 px-1.5 py-1.5 text-center text-[8.5px] text-white/45"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
              <span className="mt-2 block rounded-md bg-white/[0.08] py-1.5 text-center text-[9.5px] font-semibold text-white">
                {d.reserveButton}
              </span>
            </div>
          </div>

          {/* order bar */}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.07] bg-ink-950/80 px-4 py-3">
            <span className="text-[9.5px] text-white/45">{d.orderBar}</span>
            <span className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[10px] font-semibold text-ink-950">
              {d.orderButton}
            </span>
          </div>

          {/* home indicator */}
          <div className="flex justify-center py-2.5">
            <span className="h-1 w-20 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* floating WhatsApp button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
        className="absolute -right-3 bottom-16 flex items-center gap-2"
      >
        <span className="hidden whitespace-nowrap rounded-full border border-white/10 bg-ink-900/90 px-3 py-1.5 text-[10.5px] font-medium text-white/70 shadow-lg backdrop-blur-xl sm:inline-block">
          {d.whatsappCta}
        </span>
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-[0_12px_28px_-8px_rgba(37,211,102,0.7)]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
          <IconChat className="relative h-5 w-5 text-white" />
        </span>
      </motion.div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="8" height="10" viewBox="0 0 10 12" fill="none" aria-hidden>
      <rect x="1" y="5" width="8" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.1" className="text-white/35" />
      <path d="M3 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.1" className="text-white/35" />
    </svg>
  );
}
