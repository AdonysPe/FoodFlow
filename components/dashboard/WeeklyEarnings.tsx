"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { EASE } from "@/lib/motion";

export type WeekBucket = {
  /** Short range, e.g. "18–24 ago". */
  label: string;
  value: number;
  orders: number;
  isCurrent: boolean;
};

function shortMoney(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

/**
 * What the venue took home, week by week. Columns rather than a line: weeks
 * are discrete buckets an owner compares against each other, not a continuous
 * curve, and the amount sits on top of each bar so nothing has to be guessed
 * off an axis.
 */
export default function WeeklyEarnings({
  weeks,
  daysElapsed,
  previousToDate,
}: {
  weeks: WeekBucket[];
  /** Days the current week has actually had, 1–7. */
  daysElapsed: number;
  /** The previous week counted only over those same days. */
  previousToDate: number;
}) {
  const max = Math.max(...weeks.map((w) => w.value), 1);
  const hasSales = weeks.some((w) => w.value > 0);

  const current = weeks[weeks.length - 1];
  const partial = daysElapsed < 7;
  // A week that is two days old always "falls" against a full one, so the
  // comparison is against the same stretch of the week before.
  const base = partial ? previousToDate : (weeks[weeks.length - 2]?.value ?? 0);
  const delta =
    current && base > 0 ? ((current.value - base) / base) * 100 : null;

  return (
    <div>
      {/* eight columns do not fit a phone, so the row scrolls instead of
          squeezing the labels into two letters */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-[520px] items-end gap-2 sm:min-w-0">
          {weeks.map((week, i) => {
            const heightPct = Math.max(2, (week.value / max) * 100);
            return (
              <div key={week.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    week.isCurrent ? "text-accent-300" : "text-white/55"
                  }`}
                >
                  {week.value > 0 ? shortMoney(week.value) : "—"}
                </span>

                <div className="flex h-32 w-full items-end sm:h-36">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                    title={`${week.label} · ${formatCurrency(week.value)} · ${week.orders} pedidos`}
                    className={`w-full rounded-t-lg ${
                      week.isCurrent
                        ? "bg-linear-to-t from-accent-600 to-accent-400"
                        : "bg-linear-to-t from-white/[0.06] to-white/[0.16]"
                    }`}
                  />
                </div>

                <span
                  className={`w-full truncate text-center text-[10.5px] ${
                    week.isCurrent ? "font-medium text-white/70" : "text-white/35"
                  }`}
                >
                  {week.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-white/[0.06] pt-4">
        <span className="text-[12.5px] text-white/45">
          Esta semana
          {partial && (
            <span className="ml-1.5 text-white/30">· día {daysElapsed} de 7</span>
          )}
        </span>
        <span className="font-display text-[19px] font-bold tabular-nums text-white">
          {formatCurrency(current?.value ?? 0)}
        </span>
        {delta !== null && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${
              delta >= 0 ? "bg-mint/12 text-mint" : "bg-accent-400/12 text-accent-200"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%{" "}
            {partial ? "vs. la anterior a la misma altura" : "vs. la anterior"}
          </span>
        )}
        {!hasSales && (
          <span className="text-[12.5px] text-white/35">
            Aún sin ventas registradas en estas semanas.
          </span>
        )}
      </div>
    </div>
  );
}
