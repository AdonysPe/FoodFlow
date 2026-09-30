// What an owner can do to a subscription that exists: cancel it, preview a
// plan change, and change plans. Plus the replacement a scheduled downgrade
// triggers when its date arrives (run by maintenance).
//
// Rules (approved, docs/SUSCRIPCIONES-CONTRATO.md §6):
// - Cancel: stops the renewal at Culqi now (Culqi cancellation is immediate
//   and irreversible); access continues until the end of the period paid.
// - Upgrade: immediate, no proration. A new subscription on the saved card,
//   charged now at the new price; the new plan opens when that first charge is
//   confirmed, and the old subscription is then retired. During the trial it
//   ends the trial.
// - Downgrade: at the end of the paid period. The current renewal is stopped
//   at Culqi right away (irreversible); on the date, a subscription on the
//   lower plan is created on the same card.
//
// Server only.

import { Prisma, type Plan, type Subscription } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  FEATURES,
  PLAN_MAX_USERS,
  PLAN_MONTHLY_NET_CENTS,
  planAllows,
  type FeatureValue,
  type PlanValue,
} from "@/lib/plans";
import { rateLimit } from "@/lib/security/rateLimit";
import { readCulqiConfig, type CulqiConfig } from "@/lib/subscriptions/config";
import {
  cancelSubscriptionInputSchema,
  changePlanInputSchema,
  previewPlanChangeInputSchema,
  type CancelSubscriptionOutput,
  type ChangePlanOutput,
  type PlanChangePreview,
  type SubscriptionResult,
} from "@/lib/subscriptions/contract";
import {
  accessUntilOf,
  loadLocked,
  markCancelledByOwner,
  scheduleDowngrade,
  type LifecycleContext,
} from "@/lib/subscriptions/lifecycle";
import { SUBSCRIPTION_TERMS_VERSION, priceFor } from "@/lib/subscriptions/pricing";
import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
import { adapterFor, fail, lifecycleAdapter, logSubscription } from "@/lib/subscriptions/runtime";
import type { SubscriptionActor } from "@/lib/subscriptions/service";

const CHANGEABLE: Subscription["status"][] = ["trialing", "active"];
const CANCELLABLE: Subscription["status"][] = ["trialing", "active", "past_due"];

/** The subscription that decides this restaurant's plan right now. */
export async function currentSubscription(
  restaurantId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Subscription | null> {
  return db.subscription.findFirst({
    where: { restaurantId, activatedAt: { not: null }, endedAt: null },
    orderBy: { activatedAt: "desc" },
  });
}

type OwnerCheck =
  | { ok: true; restaurant: NonNullable<SubscriptionActor["restaurant"]> }
  | { ok: false; result: SubscriptionResult<never> };

function ownerOf(actor: SubscriptionActor, restaurantId: string): OwnerCheck {
  if (!actor.isOwner) return { ok: false, result: fail("forbidden_not_owner") };
  const restaurant = actor.restaurant;
  if (!restaurant || restaurant.id !== restaurantId || restaurant.ownerId !== actor.user.id) {
    return { ok: false, result: fail("restaurant_mismatch") };
  }
  return { ok: true, restaurant };
}

async function changeInFlight(restaurantId: string, sub: Subscription): Promise<boolean> {
  if (sub.pendingPlan) return true;
  const busy = await prisma.subscriptionCheckout.findFirst({
    where: { restaurantId, status: "processing" },
    select: { id: true },
  });
  return busy != null;
}

// ---------------------------------------------------------------- cancel

export async function cancelSubscription(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<CancelSubscriptionOutput>> {
  const parsed = cancelSubscriptionInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const owner = ownerOf(actor, parsed.data.restaurantId);
  if (!owner.ok) return owner.result;
  const { restaurant } = owner;

  if (restaurant.billingSource === "manual") return fail("manual_subscription");

  const limit = await rateLimit("subscription-manage", actor.user.id, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return fail("rate_limited");

  const sub = await currentSubscription(restaurant.id);
  if (!sub) return fail("no_active_subscription");
  if (sub.status === "cancelled") return fail("already_canceled");
  if (!CANCELLABLE.includes(sub.status)) return fail("no_active_subscription");
  const processing = await prisma.subscriptionCheckout.findFirst({
    where: { restaurantId: restaurant.id, status: "processing" },
    select: { id: true },
  });
  if (processing) return fail("change_pending");

  // A scheduled downgrade already stopped the renewal at Culqi: cancelling
  // now only drops the scheduled switch.
  if (!sub.pendingPlan && sub.providerSubscriptionId) {
    const adapter = lifecycleAdapter();
    if (!adapter) return fail("provider_misconfigured");
    try {
      await adapter.cancelSubscription(sub.providerSubscriptionId);
    } catch (error) {
      logSubscription("error", "cancel.provider_failed", { subscriptionId: sub.id, error: String(error) });
      return fail("provider_unavailable");
    }
  }

  const ctx: LifecycleContext = { now: new Date(), actor: { id: actor.user.id, email: actor.user.email } };
  const cancelled = await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, sub.id);
    if (!locked) throw new Error("subscription vanished");
    return markCancelledByOwner(tx, locked, parsed.data.reason ?? null, ctx);
  });

  logSubscription("info", "cancel.done", { subscriptionId: sub.id, restaurantId: restaurant.id });
  const until = accessUntilOf(cancelled);
  return {
    ok: true,
    data: {
      status: cancelled.status,
      cancelAtPeriodEnd: true,
      accessUntil: until && until.getTime() > ctx.now.getTime() ? until.toISOString() : null,
    },
  };
}

// ---------------------------------------------------------- plan change

function lostFeatures(from: PlanValue, to: PlanValue): FeatureValue[] {
  return FEATURES.filter((feature) => planAllows(from, feature) && !planAllows(to, feature));
}

async function buildPreview(
  restaurantId: string,
  sub: Subscription,
  targetPlan: PlanValue,
  now: Date
): Promise<PlanChangePreview> {
  const direction =
    PLAN_MONTHLY_NET_CENTS[targetPlan] > PLAN_MONTHLY_NET_CENTS[sub.plan] ? "upgrade" : "downgrade";
  const blockers: PlanChangePreview["blockers"] = [];
  if (direction === "downgrade" && Number.isFinite(PLAN_MAX_USERS[targetPlan])) {
    const staff = await prisma.staffMembership.count({ where: { restaurantId } });
    const max = PLAN_MAX_USERS[targetPlan];
    // The owner counts against the cap.
    if (staff + 1 > max) blockers.push({ code: "staff_over_limit", current: staff + 1, max });
  }
  const periodEnd = accessUntilOf(sub) ?? now;
  return {
    currentPlan: sub.plan,
    targetPlan,
    direction,
    effectiveAt: (direction === "upgrade" ? now : periodEnd).toISOString(),
    chargeNow: direction === "upgrade" ? priceFor(targetPlan) : null,
    newPrice: priceFor(targetPlan),
    endsTrial: direction === "upgrade" && sub.status === "trialing",
    irreversible: direction === "downgrade",
    losesFeatures: lostFeatures(sub.plan, targetPlan),
    blockers,
  };
}

type Changeable =
  | { ok: true; restaurant: NonNullable<SubscriptionActor["restaurant"]>; sub: Subscription }
  | { ok: false; result: SubscriptionResult<never> };

async function changeableSubscription(
  actor: SubscriptionActor,
  restaurantId: string,
  targetPlan: PlanValue
): Promise<Changeable> {
  const owner = ownerOf(actor, restaurantId);
  if (!owner.ok) return owner;
  if (owner.restaurant.billingSource === "manual") return { ok: false, result: fail("manual_subscription") };
  const sub = await currentSubscription(restaurantId);
  if (!sub || !CHANGEABLE.includes(sub.status)) return { ok: false, result: fail("no_active_subscription") };
  if (sub.plan === targetPlan) return { ok: false, result: fail("same_plan") };
  if (await changeInFlight(restaurantId, sub)) return { ok: false, result: fail("change_pending") };
  return { ok: true, restaurant: owner.restaurant, sub };
}

export async function previewPlanChange(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<PlanChangePreview>> {
  const parsed = previewPlanChangeInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const found = await changeableSubscription(actor, parsed.data.restaurantId, parsed.data.targetPlan);
  if (!found.ok) return found.result;
  return { ok: true, data: await buildPreview(found.restaurant.id, found.sub, parsed.data.targetPlan, new Date()) };
}

export async function changeSubscriptionPlan(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<ChangePlanOutput>> {
  const parsed = changePlanInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const { restaurantId, targetPlan, idempotencyKey } = parsed.data;
  const owner = ownerOf(actor, restaurantId);
  if (!owner.ok) return owner.result;

  // A retry of a change already started returns what it started.
  const previous = await prisma.subscriptionCheckout.findUnique({
    where: { restaurantId_idempotencyKey: { restaurantId, idempotencyKey } },
  });
  if (previous) {
    if (previous.plan !== targetPlan) return fail("idempotency_conflict");
    return { ok: true, data: { kind: "checkout", checkoutId: previous.id, status: previous.status } };
  }

  const found = await changeableSubscription(actor, restaurantId, targetPlan);
  if (!found.ok) return found.result;
  const { sub } = found;

  const limit = await rateLimit("subscription-manage", actor.user.id, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return fail("rate_limited");

  const now = new Date();
  const preview = await buildPreview(restaurantId, sub, targetPlan, now);
  if (preview.blockers.length > 0) return fail("downgrade_blocked");
  const ctx: LifecycleContext = { now, actor: { id: actor.user.id, email: actor.user.email } };

  if (preview.direction === "downgrade") {
    const adapter = lifecycleAdapter();
    if (!adapter) return fail("provider_misconfigured");
    if (sub.providerSubscriptionId) {
      try {
        await adapter.cancelSubscription(sub.providerSubscriptionId);
      } catch (error) {
        logSubscription("error", "downgrade.stop_failed", { subscriptionId: sub.id, error: String(error) });
        return fail("provider_unavailable");
      }
    }
    const effectiveAt = new Date(preview.effectiveAt);
    await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, sub.id);
      if (!locked) throw new Error("subscription vanished");
      await scheduleDowngrade(tx, locked, targetPlan, effectiveAt, ctx);
    });
    logSubscription("info", "downgrade.scheduled", { subscriptionId: sub.id, targetPlan });
    return { ok: true, data: { kind: "scheduled", effectiveAt: preview.effectiveAt } };
  }

  // Upgrade: needs the plan catalogue at Culqi, so it follows the checkout switch.
  const read = readCulqiConfig();
  if (!read.ok) {
    if (read.reason === "misconfigured") logSubscription("error", "config.invalid", { problems: read.problems });
    return fail(read.reason === "disabled" ? "subscriptions_disabled" : "provider_misconfigured");
  }
  const result = await startReplacement(adapterFor(read.config), read.config, sub, targetPlan, "upgrade", {
    idempotencyKey,
    userId: actor.user.id,
    userEmail: actor.user.email,
    now,
  });
  if (!result.ok) return result;
  return { ok: true, data: { kind: "checkout", checkoutId: result.data.checkoutId, status: result.data.status } };
}

// ------------------------------------------------------ replacement

class Busy extends Error {}

/**
 * Create the subscription that replaces `old` on `plan`, on the card already
 * saved at the provider. The new one starts `pending` and takes over only when
 * its first charge is confirmed (lifecycle.activate retires the old one).
 */
export async function startReplacement(
  adapter: SubscriptionProviderAdapter,
  config: CulqiConfig,
  old: Subscription,
  plan: Plan,
  purpose: "upgrade" | "downgrade",
  who: { idempotencyKey: string; userId: string; userEmail: string; now: Date }
): Promise<SubscriptionResult<{ checkoutId: string; status: "processing" | "failed" }>> {
  if (!old.restaurantId || !old.providerCardId) return fail("no_active_subscription");
  const restaurantId = old.restaurantId;
  const price = priceFor(plan);
  const providerPlanId = config.planIds[plan].regular;
  const template = await prisma.subscriptionCheckout.findFirst({
    where: { subscriptionId: old.id },
    orderBy: { createdAt: "desc" },
  });

  let checkoutId: string;
  try {
    checkoutId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Restaurant" WHERE "id" = ${restaurantId} FOR UPDATE`;
      const busy = await tx.subscriptionCheckout.findFirst({
        where: { restaurantId, status: "processing" },
        select: { id: true },
      });
      const replacing = await tx.subscription.findFirst({
        where: { replacesSubscriptionId: old.id, endedAt: null },
        select: { id: true },
      });
      if (busy || replacing) throw new Busy();
      const row = await tx.subscriptionCheckout.create({
        data: {
          restaurantId,
          userId: who.userId,
          userEmail: who.userEmail,
          idempotencyKey: who.idempotencyKey,
          status: "processing",
          purpose,
          plan,
          provider: old.provider,
          providerPlanId,
          withTrial: false,
          trialDays: 0,
          currency: price.currency,
          netAmountCents: price.netCents,
          igvAmountCents: price.igvCents,
          grossAmountCents: price.grossCents,
          igvRateBps: price.igvRateBps,
          discountBps: price.discountBps,
          customerFirstName: template?.customerFirstName ?? "-",
          customerLastName: template?.customerLastName ?? "-",
          customerPhone: template?.customerPhone ?? "-",
          customerAddress: template?.customerAddress ?? "-",
          customerCity: template?.customerCity ?? "-",
          billingDocType: template?.billingDocType ?? "boleta",
          billingRuc: template?.billingRuc ?? null,
          billingLegalName: template?.billingLegalName ?? null,
          returnPath: template?.returnPath ?? "/dashboard/app/configuracion",
          termsAcceptedAt: who.now,
          termsVersion: SUBSCRIPTION_TERMS_VERSION,
          lockedUntil: new Date(who.now.getTime() + 90_000),
          expiresAt: new Date(who.now.getTime() + 30 * 60 * 1000),
        },
      });
      return row.id;
    });
  } catch (error) {
    if (error instanceof Busy) return fail("change_pending");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("change_pending");
    }
    throw error;
  }

  let providerSubscriptionId: string | null = null;
  let outcome: "created" | "unknown" = "created";
  try {
    const created = await adapter.createSubscription({
      cardId: old.providerCardId,
      planId: providerPlanId,
      metadata: { restaurant_id: restaurantId, checkout_id: checkoutId, replaces: old.id },
    });
    providerSubscriptionId = created.subscriptionId;
  } catch (error) {
    if (error instanceof ProviderRejectedError) {
      await prisma.subscriptionCheckout.update({
        where: { id: checkoutId },
        data: {
          status: "failed",
          lockedUntil: null,
          failureCode: error.providerCode === "card_error" ? "card_declined" : "provider_rejected",
        },
      });
      logSubscription("warn", `${purpose}.rejected`, { subscriptionId: old.id, code: error.providerCode });
      return error.providerCode === "card_error" ? fail("card_declined") : fail("provider_unavailable");
    }
    if (!(error instanceof ProviderUnavailableError)) throw error;
    outcome = "unknown";
    logSubscription("error", `${purpose}.unknown_outcome`, { subscriptionId: old.id });
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.subscription.create({
      data: {
        restaurantId,
        restaurantName: old.restaurantName,
        ownerId: old.ownerId,
        ownerEmail: old.ownerEmail,
        provider: old.provider,
        providerCustomerId: old.providerCustomerId,
        providerCardId: old.providerCardId,
        providerSubscriptionId,
        providerPlanId,
        plan,
        status: "pending",
        currency: price.currency,
        netAmountCents: price.netCents,
        igvAmountCents: price.igvCents,
        grossAmountCents: price.grossCents,
        igvRateBps: price.igvRateBps,
        discountBps: price.discountBps,
        trialDays: 0,
        cardBrand: old.cardBrand,
        cardLast4: old.cardLast4,
        replacesSubscriptionId: old.id,
      },
    });
    await tx.subscriptionCheckout.update({
      where: { id: checkoutId },
      data: {
        subscriptionId: created.id,
        lockedUntil: null,
        failureCode: outcome === "unknown" ? "unknown_outcome" : null,
      },
    });
  });

  logSubscription("info", `${purpose}.started`, { subscriptionId: old.id, checkoutId, outcome });
  return { ok: true, data: { checkoutId, status: "processing" } };
}
