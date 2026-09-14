"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { IconArrowRight, IconCheck } from "@/components/ui/Icons";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatCurrency, formatSoles } from "@/lib/format";
import { EASE } from "@/lib/motion";

const COMMISSION_MIN = 20;
const COMMISSION_MAX = 35;
const COMMISSION_DEFAULT = 30;

/** Digits only, capped so a stray keypress cannot produce a silly number. */
function toAmount(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  return digits ? Number(digits) : 0;
}

function groupDigits(value) {
  return value > 0 ? value.toLocaleString("es-PE") : "";
}

/**
 * The lead magnet: what delivery apps take, in the visitor's own numbers.
 *
 * The result is live and costs nothing — no name, no email, no sign-up. Only
 * once someone has seen their own figure does the form appear, carrying that
 * figure with it so the first WhatsApp message already has the number in it.
 */
// `as` is forwarded so /calculadora can claim the h1; h2 anywhere else.
export default function Calculator({ as }) {
  const { t } = useLanguage();
  const copy = t.calculator;
  const { openLeadForm } = useLeadCapture();

  const [sales, setSales] = useState(0);
  const [commission, setCommission] = useState(COMMISSION_DEFAULT);
  const [orders, setOrders] = useState(0);

  const uid = useId();
  const salesId = `${uid}-sales`;
  const commissionId = `${uid}-commission`;
  const ordersId = `${uid}-orders`;

  const { monthly, yearly, perOrder } = useMemo(() => {
    const month = sales * (commission / 100);
    return {
      monthly: month,
      yearly: month * 12,
      perOrder: orders > 0 ? month / orders : null,
    };
  }, [sales, commission, orders]);

  const hasResult = sales > 0;
  const fill = ((commission - COMMISSION_MIN) / (COMMISSION_MAX - COMMISSION_MIN)) * 100;

  return (
    <section
      id="calculadora"
      className="relative scroll-mt-24 overflow-x-clip pt-32 pb-20 sm:pt-40 sm:pb-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 -z-10 h-[26rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.1),transparent_65%)] blur-3xl"
      />

      <Container>
        <SectionHeading
          as={as}
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:mt-14 lg:grid-cols-2">
          {/* ------------------------------------------------ your numbers */}
          <Reveal>
            <div className="h-full rounded-3xl border border-cream/10 bg-ink-800/60 p-6 shadow-card sm:p-7">
              <div>
                <label
                  htmlFor={salesId}
                  className="text-[13px] font-semibold text-cream/75"
                >
                  {copy.salesLabel}
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-cream/55">
                    S/
                  </span>
                  <input
                    id={salesId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="12,000"
                    value={groupDigits(sales)}
                    onChange={(e) => setSales(toAmount(e.target.value))}
                    className="h-12 w-full rounded-xl border border-cream/12 bg-ink-950/80 pl-11 pr-3.5 text-[17px] font-semibold text-cream tabular-nums placeholder:font-normal placeholder:text-cream/30 outline-none transition-colors duration-200 focus:border-accent-400/60"
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] text-cream/55">{copy.salesHint}</p>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor={commissionId}
                    className="text-[13px] font-semibold text-cream/75"
                  >
                    {copy.commissionLabel}
                  </label>
                  <output
                    htmlFor={commissionId}
                    className="font-display text-[19px] font-bold tabular-nums text-accent-ink"
                  >
                    {commission}%
                  </output>
                </div>
                <input
                  id={commissionId}
                  type="range"
                  min={COMMISSION_MIN}
                  max={COMMISSION_MAX}
                  step={1}
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  style={{ "--pct": `${fill}%` }}
                  className="range-accent mt-1"
                />
                <div className="flex justify-between text-[11.5px] font-medium text-cream/35">
                  <span>{COMMISSION_MIN}%</span>
                  <span>{COMMISSION_MAX}%</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-cream/55">
                  {copy.commissionHint}
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor={ordersId}
                  className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-cream/75"
                >
                  {copy.ordersLabel}
                  <span className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-cream/55">
                    {copy.ordersOptional}
                  </span>
                </label>
                <input
                  id={ordersId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="320"
                  value={groupDigits(orders)}
                  onChange={(e) => setOrders(toAmount(e.target.value))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-cream/12 bg-ink-950/80 px-3.5 text-[17px] font-semibold text-cream tabular-nums placeholder:font-normal placeholder:text-cream/30 outline-none transition-colors duration-200 focus:border-accent-400/60"
                />
                <p className="mt-1.5 text-[12.5px] text-cream/55">{copy.ordersHint}</p>
              </div>
            </div>
          </Reveal>

          {/* ----------------------------------------------------- the bill */}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-3xl border border-accent-400/35 bg-accent-400/[0.06] p-6 shadow-lift sm:p-7">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/55">
                {copy.resultLabel}
              </p>

              <div className="mt-5 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {hasResult ? (
                    <motion.div
                      key="figures"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      <p className="font-display text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-accent-ink sm:text-[3.1rem]">
                        {formatSoles(monthly)}
                      </p>
                      <p className="mt-1 text-[14px] font-medium text-cream/60">
                        {copy.perMonth}
                      </p>

                      <p className="mt-5 font-display text-[1.6rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-fg sm:text-[1.8rem]">
                        {formatSoles(yearly)}
                      </p>
                      <p className="mt-1 text-[14px] font-medium text-cream/60">
                        {copy.perYear}
                      </p>

                      {perOrder !== null && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="mt-5 text-[13.5px] leading-relaxed text-cream/65"
                        >
                          {/* cents matter here: the whole point is how
                              small a number gets taken from each order */}
                          {copy.perOrder.replace("{amount}", formatCurrency(perOrder))}
                        </motion.p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="text-[15px] leading-relaxed text-cream/55"
                    >
                      {copy.empty}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-7 flex items-start gap-2.5 border-t border-cream/12 pt-5 text-[14.5px] font-semibold leading-snug text-fg">
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" />
                {copy.foodflow}
              </p>

              <Button
                type="button"
                size="lg"
                disabled={!hasResult}
                onClick={() =>
                  openLeadForm({
                    source: "calculadora",
                    loss: { mensual: Math.round(monthly), anual: Math.round(yearly) },
                  })
                }
                className="mt-5 w-full"
                icon={
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                }
              >
                {copy.cta}
              </Button>

              <p className="mt-3 text-center text-[12.5px] text-cream/55">
                {copy.ctaNote}
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[12.5px] leading-relaxed text-cream/55">
            {copy.disclaimer}
          </p>
        </Reveal>

        {/* Someone who just saw their own number is the reader most likely to
            want the breakdown behind it, so the bridge sits right here. */}
        <Reveal delay={0.2}>
          <p className="mt-4 text-center">
            <Link
              href="/comisiones-rappi-pedidosya"
              className="text-[13.5px] text-accent-ink underline decoration-accent-400/40 underline-offset-4 transition-colors hover:text-fg"
            >
              {copy.guideLink}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
