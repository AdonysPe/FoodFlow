"use server";

// Platform admin only: operate the subscriptions without touching the database
// by hand. Types in lib/subscriptions/opsContract.ts; logic in
// lib/subscriptions/ops.ts. `requirePlatformAdmin` throws for anyone else
// (a restaurant owner or manager included), before any read or write.

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import {
  abandonPending,
  getOpsOverview,
  reconcileNow,
  reprocessEvent,
  repairRestaurant,
  resolveReview,
} from "@/lib/subscriptions/ops";
import {
  opsEventInputSchema,
  opsSubscriptionInputSchema,
  resolveReviewInputSchema,
  type OpsActionOutput,
  type OpsEventInput,
  type OpsResult,
  type OpsSubscriptionInput,
  type ResolveReviewInput,
  type SubscriptionOpsOverview,
} from "@/lib/subscriptions/opsContract";

const invalid: OpsResult<never> = { ok: false, error: "Datos no válidos." };

function done<T>(result: OpsResult<T>): OpsResult<T> {
  if (result.ok) revalidatePath("/dashboard/admin/restaurants");
  return result;
}

/** What is stuck, failed or drifted, and how the deployment is configured. */
export async function getSubscriptionOps(): Promise<OpsResult<SubscriptionOpsOverview>> {
  await requirePlatformAdmin();
  return { ok: true, data: await getOpsOverview() };
}

/** Ask Culqi about one subscription and apply what it says (what the cron does, on demand). */
export async function reconcileSubscriptionNow(input: OpsSubscriptionInput): Promise<OpsResult<OpsActionOutput>> {
  await requirePlatformAdmin();
  const parsed = opsSubscriptionInputSchema.safeParse(input);
  return parsed.success ? done(await reconcileNow(parsed.data.subscriptionId)) : invalid;
}

/** Replay a stored webhook event that failed. */
export async function reprocessSubscriptionEvent(input: OpsEventInput): Promise<OpsResult<OpsActionOutput>> {
  await requirePlatformAdmin();
  const parsed = opsEventInputSchema.safeParse(input);
  return parsed.success ? done(await reprocessEvent(parsed.data.eventId)) : invalid;
}

/** Close a `needsReview` flag (a refund, an amount mismatch…), with a note that stays in the trail. */
export async function resolveSubscriptionReview(input: ResolveReviewInput): Promise<OpsResult<OpsActionOutput>> {
  const admin = await requirePlatformAdmin();
  const parsed = resolveReviewInputSchema.safeParse(input);
  return parsed.success
    ? done(await resolveReview(parsed.data.subscriptionId, parsed.data.note, { id: admin.id, email: admin.email }))
    : invalid;
}

/** Close a subscription that never confirmed (after checking with Culqi that it was not paid). */
export async function abandonPendingSubscription(input: OpsSubscriptionInput): Promise<OpsResult<OpsActionOutput>> {
  const admin = await requirePlatformAdmin();
  const parsed = opsSubscriptionInputSchema.safeParse(input);
  return parsed.success
    ? done(await abandonPending(parsed.data.subscriptionId, { id: admin.id, email: admin.email }))
    : invalid;
}

/** Copy a subscription's plan, status and access onto its restaurant again. */
export async function repairSubscriptionProjection(input: OpsSubscriptionInput): Promise<OpsResult<OpsActionOutput>> {
  const admin = await requirePlatformAdmin();
  const parsed = opsSubscriptionInputSchema.safeParse(input);
  return parsed.success
    ? done(await repairRestaurant(parsed.data.subscriptionId, { id: admin.id, email: admin.email }))
    : invalid;
}
