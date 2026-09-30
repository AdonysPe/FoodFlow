// Server wrapper around the entitlement rules: supplies the clock and the
// enforcement switch, so every gate in the app asks the same question the same
// way. Use this — never `planAllows(restaurant.plan, …)` — wherever access to
// a module is decided.
//
// Server only (reads the environment).

import type { FeatureValue, PlanValue } from "@/lib/plans";
import { subscriptionsEnabled } from "@/lib/subscriptions/config";
import {
  entitlementAllows,
  resolveEntitlement,
  type BillingSourceValue,
  type BillingStatusValue,
  type Entitlement,
} from "@/lib/subscriptions/entitlement";

/** The Restaurant columns the decision needs. Select all four. */
export type EntitlementColumns = {
  plan: string;
  billingStatus: string;
  billingSource?: string | null;
  accessUntil?: Date | null;
};

export const ENTITLEMENT_SELECT = {
  plan: true,
  billingStatus: true,
  billingSource: true,
  accessUntil: true,
} as const;

export function restaurantEntitlement(
  restaurant: EntitlementColumns,
  now: Date = new Date()
): Entitlement {
  return resolveEntitlement(
    {
      plan: restaurant.plan as PlanValue,
      billingStatus: restaurant.billingStatus as BillingStatusValue,
      billingSource: (restaurant.billingSource ?? "none") as BillingSourceValue,
      accessUntil: restaurant.accessUntil ?? null,
    },
    now,
    { enforceUnpaid: subscriptionsEnabled() }
  );
}

export function restaurantCanUse(
  restaurant: EntitlementColumns,
  feature: FeatureValue,
  now: Date = new Date()
): boolean {
  return entitlementAllows(restaurantEntitlement(restaurant, now), feature);
}

/**
 * A card subscription that still decides this venue's plan — the thing a
 * manual grant must not overwrite. Past its access (and grace) it no longer
 * counts: an admin may then grant by hand again.
 */
export function hasLiveProviderSubscription(
  restaurant: EntitlementColumns,
  now: Date = new Date()
): boolean {
  return (
    restaurant.billingSource === "provider" &&
    restaurantEntitlement(restaurant, now).mode !== "locked"
  );
}
