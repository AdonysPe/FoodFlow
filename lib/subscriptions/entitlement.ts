// The one place that decides what a restaurant may use, from what it bought
// (`plan`) AND whether that is paid (`billingStatus`, `billingSource`,
// `accessUntil`).
//
// Pure: no database, no env. The server wraps it in lib/subscriptions/access.ts
// (which supplies `now` and the enforcement flag); the dashboard can import it
// to explain a locked screen without re-deriving the rules.
//
// THE RULE THAT SHAPES EVERYTHING BELOW: a failure on our side or the
// provider's must never lock out a venue that paid. Access ends because a date
// we already stored has passed — never because an expected webhook did not
// arrive. A late renewal lands in the grace period, not in a locked screen.

import { planAllows, type FeatureValue, type PlanValue } from "@/lib/plans";
import { GRACE_DAYS } from "@/lib/subscriptions/pricing";

export const BILLING_STATUSES = [
  "pending",
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
export type BillingStatusValue = (typeof BILLING_STATUSES)[number];

export const BILLING_SOURCES = ["none", "manual", "provider"] as const;
export type BillingSourceValue = (typeof BILLING_SOURCES)[number];

export type AccessMode = "full" | "grace" | "locked";

export type EntitlementReason =
  // full
  | "manual"
  | "not_enforced"
  | "trialing"
  | "active"
  | "canceled_until_period_end"
  // grace
  | "renewal_pending"
  | "payment_overdue"
  // locked
  | "not_subscribed"
  | "pending_confirmation"
  | "grace_expired"
  | "suspended"
  | "canceled"
  | "grant_expired";

export type EntitlementInput = {
  plan: PlanValue;
  billingStatus: BillingStatusValue;
  billingSource: BillingSourceValue;
  accessUntil: Date | string | null;
};

export type Entitlement = {
  mode: AccessMode;
  /** The plan whose modules are open right now; null when locked. */
  effectivePlan: PlanValue | null;
  reason: EntitlementReason;
  /** When the current mode ends, if it has an end. */
  until: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const full = (plan: PlanValue, reason: EntitlementReason, until: Date | null): Entitlement => ({
  mode: "full",
  effectivePlan: plan,
  reason,
  until,
});
const grace = (plan: PlanValue, reason: EntitlementReason, until: Date | null): Entitlement => ({
  mode: "grace",
  effectivePlan: plan,
  reason,
  until,
});
const locked = (reason: EntitlementReason): Entitlement => ({
  mode: "locked",
  effectivePlan: null,
  reason,
  until: null,
});

/**
 * @param enforceUnpaid Whether a venue that never bought or was granted
 *   anything (`billingSource: "none"`) is locked. Off while card subscriptions
 *   are switched off: locking someone out of a checkout they cannot use would
 *   leave them with no way in. Paid and manual venues follow their own dates
 *   whatever this says.
 */
export function resolveEntitlement(
  input: EntitlementInput,
  now: Date,
  { enforceUnpaid }: { enforceUnpaid: boolean }
): Entitlement {
  const { plan, billingStatus: status } = input;
  const until = toDate(input.accessUntil);
  const t = now.getTime();

  if (input.billingSource === "none") {
    return enforceUnpaid ? locked("not_subscribed") : full(plan, "not_enforced", null);
  }

  if (input.billingSource === "manual") {
    if (status === "suspended") return locked("suspended");
    if (status === "cancelled") return locked("canceled");
    if (until && t > until.getTime()) return locked("grant_expired");
    return full(plan, "manual", until);
  }

  // billingSource === "provider"
  switch (status) {
    case "trialing":
    case "active": {
      if (!until || t <= until.getTime()) {
        return full(plan, status === "trialing" ? "trialing" : "active", until);
      }
      // The period ended and the renewal has not been confirmed yet. Could be
      // a late webhook as easily as a failed card, so it is grace, not a lock.
      const graceEnd = new Date(until.getTime() + GRACE_DAYS * DAY_MS);
      return t <= graceEnd.getTime()
        ? grace(plan, "renewal_pending", graceEnd)
        : locked("grace_expired");
    }
    case "past_due": {
      if (!until) return grace(plan, "payment_overdue", null);
      const graceEnd = new Date(until.getTime() + GRACE_DAYS * DAY_MS);
      return t <= graceEnd.getTime()
        ? grace(plan, "payment_overdue", graceEnd)
        : locked("grace_expired");
    }
    case "cancelled":
      // Cancelling stops the renewal, not the month already paid for.
      return until && t <= until.getTime()
        ? full(plan, "canceled_until_period_end", until)
        : locked("canceled");
    case "suspended":
      return locked("suspended");
    case "pending":
    default:
      return locked("pending_confirmation");
  }
}

/** Does this entitlement open this module? */
export function entitlementAllows(entitlement: Entitlement, feature: FeatureValue): boolean {
  return entitlement.effectivePlan != null && planAllows(entitlement.effectivePlan, feature);
}
