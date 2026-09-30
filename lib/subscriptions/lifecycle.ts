// The subscription state machine. The ONLY code that moves a restaurant's
// plan, billing status or paid access because of a payment.
//
// Every function runs inside the caller's transaction, on a subscription row
// the caller has locked (`loadLocked`), and is fed facts the server obtained
// from the provider itself — a re-read event, a re-read subscription — never
// a webhook body or anything the browser said.
//
// RULES (approved 2026-09-29, docs/SUSCRIPCIONES-CONTRATO.md §6):
// - Trial: 7 days, card up front, one per restaurant. Access ends at the
//   trial end we computed, never later than the approved length.
// - A paid charge opens the period until the provider's next billing date
//   (or one month). Access only ever moves forward: a late or duplicated
//   event cannot shorten it.
// - A failed renewal is `past_due`; access continues through GRACE_DAYS
//   (computed from dates by entitlement.ts, not by this file).
// - A first charge that fails ends the attempt: nothing was ever granted.
// - Cancelling keeps the period already paid.
// - Refunds, charges after the end and unknown amounts are flagged for a
//   person (`needsReview`); access never changes on its own for them.
//
// Server only.

import type { BillingStatus, Plan, Prisma, Subscription } from "@prisma/client";
import type { ProviderSubscriptionState } from "@/lib/subscriptions/provider";
import type { ChargeFacts } from "@/lib/subscriptions/events";

type Tx = Prisma.TransactionClient;

export type LifecycleContext = {
  now: Date;
  eventId?: string | null;
  actor?: { id: string; email: string } | null;
};

export type LifecycleOutcome = {
  /** Something about the subscription changed. */
  changed: boolean;
  /** Our Subscription ids to stop at the provider after the commit. */
  cancelAtProvider: string[];
  /** A short machine note for the event log. */
  note: string;
  /** Set when a person has to look at this subscription (it is flagged in the row). */
  review?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Calendar months in UTC, clamped: Jan 31 + 1 month = Feb 28/29. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

function later(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

/** Until when this subscription pays for access. */
export function accessUntilOf(sub: Pick<Subscription, "status" | "trialEndsAt" | "currentPeriodEnd">): Date | null {
  if (sub.status === "trialing") return sub.trialEndsAt;
  return later(sub.currentPeriodEnd, sub.trialEndsAt);
}

/** Lock and read a subscription inside the transaction. */
export async function loadLocked(tx: Tx, subscriptionId: string): Promise<Subscription | null> {
  await tx.$queryRaw`SELECT "id" FROM "Subscription" WHERE "id" = ${subscriptionId} FOR UPDATE`;
  return tx.subscription.findUnique({ where: { id: subscriptionId } });
}

const noop = (note: string): LifecycleOutcome => ({ changed: false, cancelAtProvider: [], note });

// ------------------------------------------------------------ projection

/**
 * Copy the subscription's state onto the restaurant row the guards read — but
 * only if this subscription is the one that speaks for the restaurant: a
 * subscription replaced by a newer activated one (a plan change) stays silent.
 * Writes a SubscriptionTransition in the same transaction.
 */
export async function projectRestaurant(
  tx: Tx,
  sub: Subscription,
  reason: string,
  ctx: LifecycleContext
): Promise<void> {
  if (!sub.restaurantId || !sub.activatedAt) return;

  const newer = await tx.subscription.findFirst({
    where: {
      restaurantId: sub.restaurantId,
      id: { not: sub.id },
      activatedAt: { gt: sub.activatedAt },
    },
    select: { id: true },
  });
  if (newer) return;

  const restaurant = await tx.restaurant.findUnique({
    where: { id: sub.restaurantId },
    select: { plan: true, billingStatus: true, billingSource: true, accessUntil: true },
  });
  if (!restaurant) return;

  const next = {
    plan: sub.plan,
    billingStatus: sub.status,
    billingSource: "provider" as const,
    accessUntil: accessUntilOf(sub),
  };
  const same =
    restaurant.plan === next.plan &&
    restaurant.billingStatus === next.billingStatus &&
    restaurant.billingSource === next.billingSource &&
    (restaurant.accessUntil?.getTime() ?? null) === (next.accessUntil?.getTime() ?? null);
  if (same) return;

  await tx.restaurant.update({ where: { id: sub.restaurantId }, data: next });
  await tx.subscriptionTransition.create({
    data: {
      restaurantId: sub.restaurantId,
      subscriptionId: sub.id,
      fromStatus: restaurant.billingStatus,
      toStatus: next.billingStatus,
      fromSource: restaurant.billingSource,
      toSource: next.billingSource,
      fromPlan: restaurant.plan,
      toPlan: next.plan,
      reason,
      actorUserId: ctx.actor?.id ?? null,
      actorEmail: ctx.actor?.email ?? null,
      eventId: ctx.eventId ?? null,
    },
  });
}

async function settleCheckouts(
  tx: Tx,
  subscriptionId: string,
  status: "completed" | "failed",
  now: Date,
  failureCode: string | null = null
) {
  await tx.subscriptionCheckout.updateMany({
    where: { subscriptionId, status: "processing" },
    data:
      status === "completed"
        ? { status, completedAt: now, failureCode: null, lockedUntil: null }
        : { status, failureCode, lockedUntil: null },
  });
}

async function update(tx: Tx, sub: Subscription, data: Prisma.SubscriptionUpdateInput) {
  return tx.subscription.update({ where: { id: sub.id }, data });
}

// ------------------------------------------------------------ activation

/**
 * First confirmation of a subscription: the trial started, or the first
 * charge was paid. Completes its checkout and, on a plan change, retires the
 * subscription it replaces (which is then stopped at the provider).
 */
async function activate(
  tx: Tx,
  sub: Subscription,
  facts: { status: "trialing" | "active"; trialEndsAt?: Date | null; periodStart?: Date | null; periodEnd?: Date | null },
  reason: string,
  ctx: LifecycleContext
): Promise<LifecycleOutcome> {
  const activated = await update(tx, sub, {
    status: facts.status,
    activatedAt: ctx.now,
    trialEndsAt: facts.trialEndsAt ?? sub.trialEndsAt,
    currentPeriodStart: facts.periodStart ?? sub.currentPeriodStart,
    currentPeriodEnd: facts.periodEnd ?? sub.currentPeriodEnd,
  });
  await settleCheckouts(tx, sub.id, "completed", ctx.now);

  const cancelAtProvider: string[] = [];
  if (sub.replacesSubscriptionId) {
    const old = await loadLocked(tx, sub.replacesSubscriptionId);
    if (old && !old.endedAt) {
      await update(tx, old, {
        status: "cancelled",
        cancelAtPeriodEnd: true,
        canceledAt: old.canceledAt ?? ctx.now,
        endedAt: ctx.now,
        pendingPlan: null,
        pendingPlanEffectiveAt: null,
      });
      if (old.providerSubscriptionId && !old.providerCanceledAt) cancelAtProvider.push(old.id);
    }
  }

  await projectRestaurant(tx, activated, reason, ctx);
  return {
    changed: true,
    cancelAtProvider,
    note: reason,
    review: activated.needsReview ? (activated.reviewReason ?? "review") : undefined,
  };
}

// --------------------------------------------------------------- charges

export async function applyChargeSucceeded(
  tx: Tx,
  sub: Subscription,
  charge: ChargeFacts,
  provider: ProviderSubscriptionState | null,
  ctx: LifecycleContext
): Promise<LifecycleOutcome> {
  const existing = await tx.subscriptionPayment.findUnique({
    where: { provider_providerPaymentId: { provider: sub.provider, providerPaymentId: charge.chargeId } },
  });
  if (existing && existing.status !== "failed") return noop("duplicate_payment");

  const at = charge.occurredAt ?? ctx.now;
  const paymentData = {
    subscriptionId: sub.id,
    restaurantId: sub.restaurantId,
    provider: sub.provider,
    providerPaymentId: charge.chargeId,
    status: "succeeded" as const,
    amountCents: charge.amountCents ?? sub.grossAmountCents,
    currency: charge.currency ?? sub.currency,
    occurredAt: at,
    failureCode: null,
    eventId: ctx.eventId ?? null,
  };
  if (existing) {
    await tx.subscriptionPayment.update({ where: { id: existing.id }, data: paymentData });
  } else {
    await tx.subscriptionPayment.create({ data: paymentData });
  }

  const review: string[] = [];
  if (charge.amountCents != null && charge.amountCents !== sub.grossAmountCents) review.push("amount_mismatch");
  if (charge.currency != null && charge.currency !== sub.currency) review.push("currency_mismatch");

  // The period this charge pays for: to the provider's next billing date when
  // it is ahead of the charge, else one calendar month. Never backwards.
  const next =
    provider?.nextBillingAt && provider.nextBillingAt.getTime() > at.getTime()
      ? provider.nextBillingAt
      : addMonths(at, 1);
  const periodEnd = later(sub.currentPeriodEnd, next)!;
  const lastPaymentAt = later(sub.lastPaymentAt, at);

  if (sub.endedAt) {
    const reason = [...review, "charge_after_end"].join(",");
    await update(tx, sub, { lastPaymentAt, needsReview: true, reviewReason: reason });
    return { changed: true, cancelAtProvider: [], note: "charge_after_end", review: reason };
  }

  const reviewData = review.length ? { needsReview: true, reviewReason: review.join(",") } : {};

  if (!sub.activatedAt) {
    await update(tx, sub, { lastPaymentAt, ...reviewData });
    return activate(
      tx,
      { ...sub, lastPaymentAt },
      { status: "active", periodStart: at, periodEnd },
      "provider.first_payment",
      ctx
    );
  }

  // Cancelled by the owner, yet charged: keep what was paid, flag it.
  const status: BillingStatus = sub.status === "cancelled" ? "cancelled" : "active";
  const renewed = await update(tx, sub, {
    status,
    currentPeriodStart: at,
    currentPeriodEnd: periodEnd,
    lastPaymentAt,
    ...(status === "cancelled"
      ? { needsReview: true, reviewReason: [...review, "charge_after_cancel"].join(",") }
      : reviewData),
  });
  await projectRestaurant(
    tx,
    renewed,
    sub.status === "past_due" ? "provider.recovered" : "provider.renewed",
    ctx
  );
  return {
    changed: true,
    cancelAtProvider: [],
    note: sub.status === "past_due" ? "recovered" : "renewed",
    review: renewed.needsReview ? (renewed.reviewReason ?? "review") : undefined,
  };
}

export async function applyChargeFailed(
  tx: Tx,
  sub: Subscription,
  charge: ChargeFacts,
  ctx: LifecycleContext
): Promise<LifecycleOutcome> {
  const existing = await tx.subscriptionPayment.findUnique({
    where: { provider_providerPaymentId: { provider: sub.provider, providerPaymentId: charge.chargeId } },
  });
  if (existing) return noop("duplicate_payment");

  const at = charge.occurredAt ?? ctx.now;
  await tx.subscriptionPayment.create({
    data: {
      subscriptionId: sub.id,
      restaurantId: sub.restaurantId,
      provider: sub.provider,
      providerPaymentId: charge.chargeId,
      status: "failed",
      amountCents: charge.amountCents ?? sub.grossAmountCents,
      currency: charge.currency ?? sub.currency,
      occurredAt: at,
      failureCode: charge.failureCode?.slice(0, 60) ?? null,
      eventId: ctx.eventId ?? null,
    },
  });

  // Older than the last payment that went through: history, not news.
  if (sub.lastPaymentAt && at.getTime() <= sub.lastPaymentAt.getTime()) return noop("stale_failure");

  if (!sub.activatedAt) {
    // The first charge failed: nothing was ever granted. End the attempt so
    // the owner can try another card, and stop the provider from retrying
    // into a subscription we no longer track.
    await update(tx, sub, { status: "cancelled", canceledAt: ctx.now, endedAt: ctx.now });
    await settleCheckouts(tx, sub.id, "failed", ctx.now, "card_declined");
    if (sub.replacesSubscriptionId) await abandonPlanChange(tx, sub.replacesSubscriptionId, ctx);
    return {
      changed: true,
      cancelAtProvider: sub.providerSubscriptionId && !sub.providerCanceledAt ? [sub.id] : [],
      note: "first_charge_failed",
    };
  }

  if (sub.status === "trialing" || sub.status === "active") {
    const pastDue = await update(tx, sub, { status: "past_due" });
    await projectRestaurant(tx, pastDue, "provider.payment_failed", ctx);
    return { changed: true, cancelAtProvider: [], note: "past_due" };
  }
  return noop("failure_recorded");
}

/**
 * A scheduled switch's replacement could not be charged (a downgrade reaching
 * its date, or a reactivation). The old subscription was already stopped at
 * the provider when the switch was scheduled, so it falls to `past_due`: the
 * owner keeps the grace period to fix the card. A cancelled one (a
 * reactivation that failed) simply stays cancelled.
 */
export async function abandonPlanChange(tx: Tx, oldId: string, ctx: LifecycleContext) {
  const old = await loadLocked(tx, oldId);
  if (!old || old.endedAt || !old.pendingPlan) return;
  if (old.status === "cancelled") {
    await update(tx, old, { pendingPlan: null, pendingPlanEffectiveAt: null });
    return;
  }
  const reverted = await update(tx, old, {
    status: "past_due",
    pendingPlan: null,
    pendingPlanEffectiveAt: null,
  });
  await projectRestaurant(tx, reverted, "provider.plan_change_failed", ctx);
}

export async function applyRefund(
  tx: Tx,
  sub: Subscription,
  charge: ChargeFacts,
  ctx: LifecycleContext
): Promise<LifecycleOutcome> {
  const key = { provider: sub.provider, providerPaymentId: charge.chargeId };
  const existing = await tx.subscriptionPayment.findUnique({ where: { provider_providerPaymentId: key } });
  if (existing?.status === "refunded") return noop("duplicate_refund");
  if (existing) {
    await tx.subscriptionPayment.update({
      where: { id: existing.id },
      data: { status: "refunded", eventId: ctx.eventId ?? existing.eventId },
    });
  } else {
    await tx.subscriptionPayment.create({
      data: {
        ...key,
        subscriptionId: sub.id,
        restaurantId: sub.restaurantId,
        status: "refunded",
        amountCents: charge.amountCents ?? sub.grossAmountCents,
        currency: charge.currency ?? sub.currency,
        occurredAt: charge.occurredAt ?? ctx.now,
        eventId: ctx.eventId ?? null,
      },
    });
  }
  // Refunds are decided by a person (a goodwill refund must not lock the
  // venue; a chargeback might). Flag it, change nothing else.
  await update(tx, sub, { needsReview: true, reviewReason: "refund" });
  return { changed: true, cancelAtProvider: [], note: "refund_flagged", review: "refund" };
}

// --------------------------------------------------- subscription state

/**
 * Align with what the provider says about the subscription itself: the trial
 * started (activation with a free trial), or it was cancelled there.
 */
export async function applyProviderState(
  tx: Tx,
  sub: Subscription,
  state: ProviderSubscriptionState,
  ctx: LifecycleContext
): Promise<LifecycleOutcome> {
  if (sub.endedAt) return noop("already_ended");

  if (state.status === "canceled") {
    if (!sub.activatedAt) {
      await update(tx, sub, {
        status: "cancelled",
        canceledAt: sub.canceledAt ?? ctx.now,
        providerCanceledAt: sub.providerCanceledAt ?? ctx.now,
        endedAt: ctx.now,
      });
      await settleCheckouts(tx, sub.id, "failed", ctx.now, "canceled_at_provider");
      return { changed: true, cancelAtProvider: [], note: "canceled_before_activation" };
    }
    if (sub.pendingPlan) {
      // Stopped on purpose by a scheduled downgrade: keep the status so the
      // paid period and its grace carry the venue to the switch.
      if (sub.providerCanceledAt) return noop("downgrade_pending");
      await update(tx, sub, { providerCanceledAt: ctx.now });
      return { changed: true, cancelAtProvider: [], note: "downgrade_pending" };
    }
    if (sub.status === "cancelled" && sub.providerCanceledAt) return noop("already_cancelled");

    const until = accessUntilOf(sub);
    const cancelled = await update(tx, sub, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
      canceledAt: sub.canceledAt ?? ctx.now,
      providerCanceledAt: sub.providerCanceledAt ?? ctx.now,
      endedAt: until && until.getTime() > ctx.now.getTime() ? null : ctx.now,
    });
    await projectRestaurant(tx, cancelled, "provider.canceled", ctx);
    return { changed: true, cancelAtProvider: [], note: "canceled" };
  }

  if (state.status === "active" && !sub.activatedAt && sub.trialDays > 0) {
    // The trial never runs longer than approved, whatever the plan at the
    // provider says; a shorter one is fine (the first charge then activates).
    const cap = addDays(sub.createdAt, sub.trialDays);
    const trialEndsAt =
      state.trialEndsAt && state.trialEndsAt.getTime() < cap.getTime() ? state.trialEndsAt : cap;

    // Our access never runs past the approved trial, but the card is charged
    // when Culqi says. A plan configured with a longer trial there would lock
    // a venue out (trial + grace) before its first charge even happens: flag
    // it now, while the venue is still on day one.
    let flagged = sub;
    if (state.trialEndsAt && state.trialEndsAt.getTime() > cap.getTime() + DAY_MS) {
      flagged = await update(tx, sub, { needsReview: true, reviewReason: "trial_longer_at_provider" });
    }
    return activate(tx, flagged, { status: "trialing", trialEndsAt }, "provider.trial_started", ctx);
  }

  return noop(state.status === "unknown" ? "provider_status_unknown" : "no_change");
}

// ------------------------------------------------------- owner requests

export async function markCancelledByOwner(
  tx: Tx,
  sub: Subscription,
  reason: string | null,
  ctx: LifecycleContext
): Promise<Subscription> {
  const until = accessUntilOf(sub);
  const cancelled = await update(tx, sub, {
    status: "cancelled",
    cancelAtPeriodEnd: true,
    canceledAt: ctx.now,
    providerCanceledAt: ctx.now,
    pendingPlan: null,
    pendingPlanEffectiveAt: null,
    endedAt: until && until.getTime() > ctx.now.getTime() ? null : ctx.now,
  });
  await projectRestaurant(tx, cancelled, reason ? `owner.cancel:${reason}` : "owner.cancel", ctx);
  return cancelled;
}

export async function scheduleDowngrade(
  tx: Tx,
  sub: Subscription,
  plan: Plan,
  effectiveAt: Date,
  ctx: LifecycleContext
): Promise<Subscription> {
  const scheduled = await update(tx, sub, {
    pendingPlan: plan,
    pendingPlanEffectiveAt: effectiveAt,
    providerCanceledAt: ctx.now,
  });
  if (sub.restaurantId) {
    await tx.subscriptionTransition.create({
      data: {
        restaurantId: sub.restaurantId,
        subscriptionId: sub.id,
        fromStatus: sub.status,
        toStatus: sub.status,
        fromSource: "provider",
        toSource: "provider",
        fromPlan: sub.plan,
        toPlan: plan,
        reason: "owner.downgrade_scheduled",
        actorUserId: ctx.actor?.id ?? null,
        actorEmail: ctx.actor?.email ?? null,
      },
    });
  }
  return scheduled;
}

/**
 * The owner changed their mind about cancelling. Culqi cancellation is
 * irreversible, so "reactivating" means a NEW subscription on the saved card,
 * created when the paid period ends (the same mechanism as a scheduled
 * downgrade). The venue keeps the days it already paid for and is charged
 * from that date; nothing is charged now.
 */
export async function scheduleReactivation(
  tx: Tx,
  sub: Subscription,
  effectiveAt: Date,
  ctx: LifecycleContext
): Promise<Subscription> {
  const scheduled = await update(tx, sub, {
    pendingPlan: sub.plan,
    pendingPlanEffectiveAt: effectiveAt,
  });
  if (sub.restaurantId) {
    await tx.subscriptionTransition.create({
      data: {
        restaurantId: sub.restaurantId,
        subscriptionId: sub.id,
        fromStatus: sub.status,
        toStatus: sub.status,
        fromSource: "provider",
        toSource: "provider",
        fromPlan: sub.plan,
        toPlan: sub.plan,
        reason: "owner.reactivation_scheduled",
        actorUserId: ctx.actor?.id ?? null,
        actorEmail: ctx.actor?.email ?? null,
      },
    });
  }
  return scheduled;
}

/** Undo a scheduled reactivation: the subscription just runs out. */
export async function cancelScheduledSwitch(
  tx: Tx,
  sub: Subscription,
  ctx: LifecycleContext
): Promise<Subscription> {
  const cleared = await update(tx, sub, { pendingPlan: null, pendingPlanEffectiveAt: null });
  if (sub.restaurantId) {
    await tx.subscriptionTransition.create({
      data: {
        restaurantId: sub.restaurantId,
        subscriptionId: sub.id,
        fromStatus: sub.status,
        toStatus: sub.status,
        fromSource: "provider",
        toSource: "provider",
        fromPlan: sub.plan,
        toPlan: sub.plan,
        reason: "owner.reactivation_canceled",
        actorUserId: ctx.actor?.id ?? null,
        actorEmail: ctx.actor?.email ?? null,
      },
    });
  }
  return cleared;
}

/**
 * Maintenance: a renewal still unpaid after the grace period is marked
 * `suspended`. Cosmetic for access — entitlement.ts already locked it by
 * date — but it is what the owner and the admin table read.
 */
export async function suspendIfGraceOver(
  tx: Tx,
  sub: Subscription,
  graceDays: number,
  ctx: LifecycleContext
): Promise<boolean> {
  if (sub.endedAt || sub.status !== "past_due" || sub.pendingPlan) return false;
  const until = accessUntilOf(sub);
  if (!until || addDays(until, graceDays).getTime() > ctx.now.getTime()) return false;
  const suspended = await update(tx, sub, { status: "suspended" });
  await projectRestaurant(tx, suspended, "maintenance.suspended", ctx);
  return true;
}

/** Called by maintenance once a cancelled period is over. */
export async function endIfExpired(tx: Tx, sub: Subscription, ctx: LifecycleContext): Promise<boolean> {
  if (sub.endedAt || sub.status !== "cancelled" || sub.pendingPlan) return false;
  const until = accessUntilOf(sub);
  if (until && until.getTime() > ctx.now.getTime()) return false;
  await update(tx, sub, { endedAt: ctx.now });
  return true;
}
