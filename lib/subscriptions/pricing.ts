// What a plan costs, in céntimos, and the terms that go with it.
//
// Pure and free of server imports so the plan picker can show exactly the
// numbers the server will charge. The server never takes an amount from the
// browser: it calls `priceFor` itself when it opens a checkout and freezes the
// result on the checkout row.

import { PLAN_MONTHLY_NET_CENTS, type PlanValue } from "@/lib/plans";

/** IGV, 18 %, in basis points. The public prices are "+ IGV". */
export const IGV_RATE_BPS = 1800;

/** Free trial on the first card subscription of a restaurant. */
export const TRIAL_DAYS = 7;

/** Full access kept after a renewal fails, while the provider retries. */
export const GRACE_DAYS = 7;

export const SUBSCRIPTION_CURRENCY = "PEN" as const;

/** Bumped whenever the subscription terms the owner accepts change. */
export const SUBSCRIPTION_TERMS_VERSION = "2026-09-29";

export type PriceSummary = {
  currency: typeof SUBSCRIPTION_CURRENCY;
  interval: "month";
  /** Price before IGV — the figure on the public site. */
  netCents: number;
  igvCents: number;
  /** What the card is charged each month. */
  grossCents: number;
  igvRateBps: number;
  discountBps: number;
};

/**
 * Monthly price of a plan. IGV is rounded to the céntimo once, on the
 * discounted net, so net + IGV always equals the gross charged.
 */
export function priceFor(plan: PlanValue, discountBps = 0): PriceSummary {
  if (!Number.isInteger(discountBps) || discountBps < 0 || discountBps >= 10_000) {
    throw new Error("discountBps fuera de rango");
  }
  const list = PLAN_MONTHLY_NET_CENTS[plan];
  const netCents = Math.round((list * (10_000 - discountBps)) / 10_000);
  const igvCents = Math.round((netCents * IGV_RATE_BPS) / 10_000);
  return {
    currency: SUBSCRIPTION_CURRENCY,
    interval: "month",
    netCents,
    igvCents,
    grossCents: netCents + igvCents,
    igvRateBps: IGV_RATE_BPS,
    discountBps,
  };
}

/** "S/ 81.42" — for server-side messages; the UI formats on its own. */
export function formatSoles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}
