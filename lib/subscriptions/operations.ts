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
// - Reactivate: Culqi cancellation is irreversible, so this is a NEW
//   subscription on the saved card. With paid days left it is scheduled for
//   the end of them (nothing charged now, the days are kept); with none left
//   it is charged now.
// - Update the card: a new Culqi token becomes the subscription's card; for a
//   `past_due` one, Culqi retries the charge on its own schedule.
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
import { readCulqiConfig, readCulqiKeys, type CulqiConfig, type CulqiKeys } from "@/lib/subscriptions/config";
import { SITE_URL } from "@/lib/seo";
import {
  cancelReactivationInputSchema,
  cancelSubscriptionInputSchema,
  changePlanInputSchema,
  paymentMethodSessionInputSchema,
  previewPlanChangeInputSchema,
  reactivateSubscriptionInputSchema,
  updatePaymentMethodInputSchema,
  type CancelSubscriptionOutput,
  type ChangePlanOutput,
  type PaymentMethodSessionOutput,
  type PlanChangePreview,
  type SubscriptionResult,
  type UpdatePaymentMethodOutput,
} from "@/lib/subscriptions/contract";
import {
  abandonPlanChange,
  accessUntilOf,
  cancelScheduledSwitch,
  loadLocked,
  markCancelledByOwner,
  scheduleDowngrade,
  scheduleReactivation,
  type LifecycleContext,
} from "@/lib/subscriptions/lifecycle";
import { SUBSCRIPTION_TERMS_VERSION, priceFor } from "@/lib/subscriptions/pricing";
import {
  ProviderRejectedError,
  ProviderUnavailableError,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
import { adapterFor, alertOps, fail, lifecycleAdapter, logSubscription, safeError } from "@/lib/subscriptions/runtime";
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
  // (A scheduled reactivation on a cancelled subscription is dropped with
  // `cancelReactivation`, not here.)
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
      logSubscription("error", "cancel.provider_failed", { subscriptionId: sub.id, error: safeError(error) });
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
        logSubscription("error", "downgrade.stop_failed", { subscriptionId: sub.id, error: safeError(error) });
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
  purpose: "new" | "upgrade" | "downgrade",
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
      await prisma.$transaction(async (tx) => {
        await tx.subscriptionCheckout.update({
          where: { id: checkoutId },
          data: {
            status: "failed",
            lockedUntil: null,
            failureCode: error.providerCode === "card_error" ? "card_declined" : "provider_rejected",
          },
        });
        // A scheduled switch that cannot be charged must not be retried
        // against the card every night: it is dropped, and the owner told.
        if (purpose !== "upgrade") await abandonPlanChange(tx, old.id, { now: who.now });
      });
      if (purpose !== "upgrade") {
        await alertOps("scheduled_switch_failed", { subscriptionId: old.id, purpose, code: error.providerCode });
      }
      logSubscription("warn", `${purpose}.rejected`, { subscriptionId: old.id, code: error.providerCode });
      return error.providerCode === "card_error" ? fail("card_declined") : fail("provider_unavailable");
    }
    if (!(error instanceof ProviderUnavailableError)) throw error;
    outcome = "unknown";
    await alertOps("unknown_outcome", { subscriptionId: old.id, checkoutId, purpose });
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

// ---------------------------------------------------------- reactivation

/** The subscription that holds the saved card: the newest one that ever activated. */
export async function cardHolder(
  restaurantId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Subscription | null> {
  return db.subscription.findFirst({
    where: { restaurantId, activatedAt: { not: null } },
    orderBy: { activatedAt: "desc" },
  });
}

export async function reactivateSubscription(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<ChangePlanOutput>> {
  const parsed = reactivateSubscriptionInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const { restaurantId, idempotencyKey } = parsed.data;
  const owner = ownerOf(actor, restaurantId);
  if (!owner.ok) return owner.result;
  if (owner.restaurant.billingSource === "manual") return fail("manual_subscription");

  // A retry of a reactivation already started returns what it started.
  const previous = await prisma.subscriptionCheckout.findUnique({
    where: { restaurantId_idempotencyKey: { restaurantId, idempotencyKey } },
  });
  if (previous) return { ok: true, data: { kind: "checkout", checkoutId: previous.id, status: previous.status } };

  const sub = await cardHolder(restaurantId);
  if (!sub) return fail("no_active_subscription");
  if (sub.status !== "cancelled" && sub.status !== "suspended") return fail("not_reactivable");
  if (!sub.providerCardId) return fail("no_payment_method");
  if (sub.pendingPlan) return fail("change_pending");
  const processing = await prisma.subscriptionCheckout.findFirst({
    where: { restaurantId, status: "processing" },
    select: { id: true },
  });
  if (processing) return fail("change_pending");

  const limit = await rateLimit("subscription-manage", actor.user.id, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return fail("rate_limited");

  // Needs the plan catalogue at Culqi, so it follows the checkout switch.
  const read = readCulqiConfig();
  if (!read.ok) {
    if (read.reason === "misconfigured") logSubscription("error", "config.invalid", { problems: read.problems });
    return fail(read.reason === "disabled" ? "subscriptions_disabled" : "provider_misconfigured");
  }

  const now = new Date();
  const ctx: LifecycleContext = { now, actor: { id: actor.user.id, email: actor.user.email } };
  const until = accessUntilOf(sub);

  if (sub.status === "cancelled" && !sub.endedAt && until && until.getTime() > now.getTime()) {
    await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, sub.id);
      if (!locked) throw new Error("subscription vanished");
      await scheduleReactivation(tx, locked, until, ctx);
    });
    logSubscription("info", "reactivation.scheduled", { subscriptionId: sub.id });
    return { ok: true, data: { kind: "scheduled", effectiveAt: until.toISOString() } };
  }

  const result = await startReplacement(adapterFor(read.config), read.config, sub, sub.plan, "new", {
    idempotencyKey,
    userId: actor.user.id,
    userEmail: actor.user.email,
    now,
  });
  if (!result.ok) return result;
  return { ok: true, data: { kind: "checkout", checkoutId: result.data.checkoutId, status: result.data.status } };
}

export async function cancelReactivation(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<{ accessUntil: string | null }>> {
  const parsed = cancelReactivationInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const owner = ownerOf(actor, parsed.data.restaurantId);
  if (!owner.ok) return owner.result;

  const sub = await cardHolder(parsed.data.restaurantId);
  if (!sub || sub.status !== "cancelled" || !sub.pendingPlan || sub.endedAt) return fail("no_active_subscription");

  const ctx: LifecycleContext = { now: new Date(), actor: { id: actor.user.id, email: actor.user.email } };
  const cleared = await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, sub.id);
    if (!locked || !locked.pendingPlan) return null;
    return cancelScheduledSwitch(tx, locked, ctx);
  });
  const until = accessUntilOf(cleared ?? sub);
  return { ok: true, data: { accessUntil: until && until.getTime() > ctx.now.getTime() ? until.toISOString() : null } };
}

// -------------------------------------------------------- payment method

function cardKeys(): { ok: true; keys: CulqiKeys } | { ok: false; result: SubscriptionResult<never> } {
  const read = readCulqiKeys();
  if (read.ok) return { ok: true, keys: read.keys };
  if (read.reason === "misconfigured") logSubscription("error", "keys.invalid", { problems: read.problems });
  return {
    ok: false,
    result: fail<never>(read.reason === "absent" ? "subscriptions_disabled" : "provider_misconfigured"),
  };
}

async function cardSubscription(actor: SubscriptionActor, restaurantId: string) {
  const owner = ownerOf(actor, restaurantId);
  if (!owner.ok) return { ok: false as const, result: owner.result };
  if (owner.restaurant.billingSource === "manual") {
    return { ok: false as const, result: fail<never>("manual_subscription") };
  }
  const sub = await cardHolder(restaurantId);
  if (!sub || !sub.providerCustomerId) {
    return { ok: false as const, result: fail<never>("no_active_subscription") };
  }
  return { ok: true as const, sub };
}

/** What Culqi Checkout needs to collect a new card, in the same shape as a purchase. */
export async function startPaymentMethodUpdate(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<PaymentMethodSessionOutput>> {
  const parsed = paymentMethodSessionInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const found = await cardSubscription(actor, parsed.data.restaurantId);
  if (!found.ok) return found.result;
  const keys = cardKeys();
  if (!keys.ok) return keys.result;

  return {
    ok: true,
    data: {
      card: { brand: found.sub.cardBrand, last4: found.sub.cardLast4 },
      next: {
        type: "culqi_checkout",
        publicKey: keys.keys.publicKey,
        settings: {
          title: "FoodFlow · Actualizar tarjeta",
          currency: "PEN",
          amount: found.sub.grossAmountCents,
        },
        paymentMethods: { tarjeta: true },
        threeDSReturnUrl: new URL("/dashboard/app/configuracion", SITE_URL).toString(),
      },
    },
  };
}

export async function updatePaymentMethod(
  actor: SubscriptionActor,
  rawInput: unknown
): Promise<SubscriptionResult<UpdatePaymentMethodOutput>> {
  const parsed = updatePaymentMethodInputSchema.safeParse(rawInput);
  if (!parsed.success) return fail("invalid_input");
  const { restaurantId, tokenId, authentication3DS } = parsed.data;

  const found = await cardSubscription(actor, restaurantId);
  if (!found.ok) return found.result;
  const { sub } = found;
  const keys = cardKeys();
  if (!keys.ok) return keys.result;
  // A token from the other mode can only be a mistake (or a probe).
  if (!tokenId.startsWith(`tkn_${keys.keys.mode}_`)) return fail("invalid_input");

  const limit = await rateLimit("subscription-card", actor.user.id, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return fail("rate_limited");

  const adapter = adapterFor(keys.keys);
  const metadata = { restaurant_id: restaurantId, subscription_id: sub.id };

  let card: { cardId: string; brand: string | null; last4: string | null };
  try {
    const saved = await adapter.saveCard({
      customerId: sub.providerCustomerId!,
      tokenId,
      authentication3DS,
      metadata,
    });
    if (saved.kind === "requires_3ds") {
      return {
        ok: true,
        data: {
          status: "requires_action",
          threeDS: {
            email: actor.user.email,
            totalAmount: sub.grossAmountCents,
            returnUrl: new URL("/dashboard/app/configuracion", SITE_URL).toString(),
          },
        },
      };
    }
    if (saved.kind === "declined") {
      logSubscription("warn", "card_update.declined", { subscriptionId: sub.id, code: saved.code });
      return fail("card_declined", saved.userMessage ?? undefined);
    }
    card = saved;
  } catch (error) {
    logSubscription("error", "card_update.save_failed", { subscriptionId: sub.id, error: safeError(error) });
    if (error instanceof ProviderRejectedError) return fail("card_declined", "No pudimos guardar la tarjeta. Vuelve a ingresarla.");
    return fail("provider_unavailable");
  }

  // Point the live provider subscription at the new card. A cancelled or
  // ended one has nothing to update; it only gains the card for a reactivation.
  const live = !!sub.providerSubscriptionId && !sub.providerCanceledAt && !sub.endedAt;
  if (live) {
    try {
      await adapter.updateSubscriptionCard(sub.providerSubscriptionId!, card.cardId);
    } catch (error) {
      logSubscription("error", "card_update.provider_failed", { subscriptionId: sub.id, error: safeError(error) });
      return fail("provider_unavailable");
    }
  }

  const ctx: LifecycleContext = { now: new Date(), actor: { id: actor.user.id, email: actor.user.email } };
  await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, sub.id);
    if (!locked) throw new Error("subscription vanished");
    // The saved card follows every subscription of this venue that can still
    // charge or take over (the current one and a pending replacement).
    await tx.subscription.updateMany({
      where: { restaurantId, endedAt: null },
      data: { providerCardId: card.cardId, cardBrand: card.brand, cardLast4: card.last4 },
    });
    if (locked.endedAt) {
      await tx.subscription.update({
        where: { id: locked.id },
        data: { providerCardId: card.cardId, cardBrand: card.brand, cardLast4: card.last4 },
      });
    }
    await tx.subscriptionTransition.create({
      data: {
        restaurantId,
        subscriptionId: sub.id,
        fromStatus: locked.status,
        toStatus: locked.status,
        fromSource: "provider",
        toSource: "provider",
        fromPlan: locked.plan,
        toPlan: locked.plan,
        reason: "owner.card_updated",
        actorUserId: ctx.actor?.id ?? null,
        actorEmail: ctx.actor?.email ?? null,
      },
    });
  });

  logSubscription("info", "card_update.done", { subscriptionId: sub.id });
  return {
    ok: true,
    data: {
      status: "updated",
      card: { brand: card.brand, last4: card.last4 },
      willRetryCharge: sub.status === "past_due",
    },
  };
}
