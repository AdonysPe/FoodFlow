// Types for the platform admin's subscription operations. Safe to import from
// a client component: types and zod schemas only.
//
// Everything here is admin-only (`requirePlatformAdmin`). There is no screen
// for it yet: this is the contract one would be built on. Until then the same
// work can be triggered with the daily cron route (see docs/SUSCRIPCIONES-OPERACION.md).

import { z } from "zod";
import type { BillingStatusValue } from "@/lib/subscriptions/entitlement";
import type { PlanValue } from "@/lib/plans";

export type OpsKeyMode = "off" | "test" | "live";

export type OpsEventRow = {
  id: string;
  providerEventId: string;
  type: string;
  status: "received" | "processing" | "processed" | "ignored" | "failed";
  attempts: number;
  /** Machine code only: never a payload. */
  error: string | null;
  subscriptionId: string | null;
  receivedAt: string;
};

export type OpsSubscriptionRow = {
  subscriptionId: string;
  restaurantId: string | null;
  restaurantName: string;
  plan: PlanValue;
  status: BillingStatusValue;
  reason: string | null;
  createdAt: string;
  hasProviderSubscription: boolean;
};

export type OpsDriftRow = {
  restaurantId: string;
  restaurantName: string;
  subscriptionId: string | null;
  expected: { plan: PlanValue; status: BillingStatusValue; accessUntil: string | null } | null;
  actual: { plan: PlanValue; status: BillingStatusValue; accessUntil: string | null };
};

export type SubscriptionOpsOverview = {
  environment: string;
  checkoutEnabled: boolean;
  keys: "ok" | "absent" | "misconfigured";
  mode: OpsKeyMode;
  webhookSecretConfigured: boolean;
  /** Plan ids for the six Culqi plans are all present and well formed. */
  plansConfigured: boolean;
  counts: {
    failedEvents: number;
    needsReview: number;
    stuckPending: number;
    notStoppedAtProvider: number;
    drift: number;
  };
  failedEvents: OpsEventRow[];
  needsReview: OpsSubscriptionRow[];
  stuckPending: OpsSubscriptionRow[];
  notStoppedAtProvider: OpsSubscriptionRow[];
  drift: OpsDriftRow[];
};

export const opsSubscriptionInputSchema = z.object({ subscriptionId: z.string().cuid() }).strict();
export type OpsSubscriptionInput = z.input<typeof opsSubscriptionInputSchema>;

export const opsEventInputSchema = z.object({ eventId: z.string().cuid() }).strict();
export type OpsEventInput = z.input<typeof opsEventInputSchema>;

export const resolveReviewInputSchema = z
  .object({ subscriptionId: z.string().cuid(), note: z.string().trim().min(3).max(300) })
  .strict();
export type ResolveReviewInput = z.input<typeof resolveReviewInputSchema>;

export type OpsResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type OpsActionOutput = {
  /** Machine note describing what happened, e.g. "trial_started", "no_change". */
  note: string;
};
