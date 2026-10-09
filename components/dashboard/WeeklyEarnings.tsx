"use client";

import { formatCurrency } from "@/lib/format";

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
 * What the venue took home, week by week, design B. Columns rather than a
 * line: weeks are discrete buckets an owner compares against each other, and
 * the amount sits on top of each bar so nothing has to be guessed off an
 * axis. The current week is the vermilion one.
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
  const delta = current && base > 0 ? ((current.value - base) / base) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      {/* eight columns do not fit a phone, so the row scrolls instead of
          squeezing the labels into two letters */}
      <div className="lbd-an-weeks-scroll">
        <div className="lbd-an-weeks">
          {weeks.map((week, i) => (
            <div key={week.label} className="lbd-an-week">
              <span className="lbd-mono" style={{ color: week.isCurrent ? "#ff7a57" : "#a39b90" }}>
                {week.value > 0 ? shortMoney(week.value) : "—"}
              </span>
              <div className="lbd-an-week-col">
                <div
                  className="lbd-an-grow"
                  title={`${week.label} · ${formatCurrency(week.value)} · ${week.orders} pedidos`}
                  style={{ height: `${Math.max(2, (week.value / max) * 100)}%`, background: week.isCurrent ? "#ff5a33" : "#3a302b", animationDelay: `${0.2 + i * 0.06}s` }}
                />
              </div>
              <span style={{ color: week.isCurrent ? "#f3efe6" : "#8a8278" }}>{week.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lbd-an-weeks-foot">
        <span>
          Esta semana
          {partial && <span style={{ color: "#8a8278" }}> · día {daysElapsed} de 7</span>}
        </span>
        <strong className="lbd-display">{formatCurrency(current?.value ?? 0)}</strong>
        {delta !== null && (
          <span style={{ color: delta >= 0 ? "#3ddc97" : "#ff7a57", fontWeight: 550 }}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}% {partial ? "vs. la anterior a la misma altura" : "vs. la anterior"}
          </span>
        )}
        {!hasSales && <span style={{ color: "#8a8278" }}>Aún sin ventas registradas en estas semanas.</span>}
      </div>
    </div>
  );
}
