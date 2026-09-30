// Server-to-server reconciliation: ask Culqi directly what a subscription is
// and apply it through the lifecycle. This is the path that does not depend on
// a webhook arriving — the status poll of the checkout panel and the daily
// maintenance both come through here.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import {
  applyChargeFailed,
  applyChargeSucceeded,
  applyProviderState,
  loadLocked,
  type LifecycleContext,
  type LifecycleOutcome,
} from "@/lib/subscriptions/lifecycle";
import {
  ProviderUnavailableError,
  type ProviderSubscriptionState,
  type SubscriptionProviderAdapter,
} from "@/lib/subscriptions/provider";
import { alertOps, lifecycleAdapter, logSubscription, safeError } from "@/lib/subscriptions/runtime";

/** A creation with a lost response is given this long to show up at Culqi. */
const LOST_CREATION_WINDOW_MS = 60 * 60 * 1000;
/** The checkout panel polls every few seconds; Culqi is asked at most this often. */
const RECONCILE_THROTTLE_MS = 10 * 1000;

/**
 * Stop subscriptions at the provider after a transaction decided they must
 * stop (replaced by a plan change, first charge failed). Best-effort: a
 * failure is logged and the daily maintenance retries anything with
 * `providerCanceledAt` still empty.
 */
export async function stopAtProvider(
  adapter: SubscriptionProviderAdapter,
  subscriptionIds: string[],
  now: Date = new Date()
): Promise<void> {
  for (const id of subscriptionIds) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true, providerSubscriptionId: true, providerCanceledAt: true },
    });
    if (!sub?.providerSubscriptionId || sub.providerCanceledAt) continue;
    try {
      await adapter.cancelSubscription(sub.providerSubscriptionId);
      await prisma.subscription.update({ where: { id }, data: { providerCanceledAt: now } });
      logSubscription("info", "provider.stopped", { subscriptionId: id });
    } catch (error) {
      // Still charging at the provider while we consider it over: the next
      // renewal could bill the card twice. Someone must look before then.
      await alertOps("provider_stop_failed", { subscriptionId: id, error: safeError(error) });
    }
  }
}

export async function reconcileSubscription(
  adapter: SubscriptionProviderAdapter,
  subscriptionId: string,
  now: Date = new Date()
): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.endedAt) return "skip";

  let state: ProviderSubscriptionState | null = null;

  if (!sub.providerSubscriptionId) {
    // The creation call timed out: find out whether Culqi created it.
    if (!sub.providerCardId) return "skip";
    state = await adapter.findSubscription({
      planId: sub.providerPlanId,
      cardId: sub.providerCardId,
      createdAfter: sub.createdAt,
    });
    if (state) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { providerSubscriptionId: state.id },
      });
      logSubscription("info", "reconcile.found_lost_creation", { subscriptionId: sub.id });
    } else if (now.getTime() - sub.createdAt.getTime() > LOST_CREATION_WINDOW_MS) {
      await endNeverCreated(sub.id, now);
      return "not_created";
    } else {
      return "waiting";
    }
  } else {
    state = await adapter.getSubscription(sub.providerSubscriptionId);
    if (!state) {
      if (!sub.activatedAt && now.getTime() - sub.createdAt.getTime() > LOST_CREATION_WINDOW_MS) {
        await endNeverCreated(sub.id, now);
        return "not_created";
      }
      return "missing_at_provider";
    }
  }

  const ctx: LifecycleContext = { now };
  const outcome: LifecycleOutcome = await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, sub.id);
    if (!locked || locked.endedAt) return { changed: false, cancelAtProvider: [], note: "skip" };
    return applyProviderState(tx, locked, state!, ctx);
  });
  await stopAtProvider(adapter, outcome.cancelAtProvider, now);
  if (outcome.review) await alertOps("review_needed", { subscriptionId: sub.id, reason: outcome.review });

  // The webhook may never have arrived: read the charges themselves. Without
  // this, a paid renewal whose event was lost would leave a paying customer to
  // run out of access.
  const applied = await reconcileCharges(adapter, sub.id, state, now);
  return applied > 0 ? `${outcome.note}+charges:${applied}` : outcome.note;
}

/** How many unrecorded charges one reconciliation looks at. */
const MAX_CHARGES_PER_RUN = 10;

/**
 * Verify, one by one, the charges the provider lists on a subscription that
 * we have not recorded, and apply the ones whose outcome is unambiguous. Each
 * charge is fetched from the provider's API — the listing alone never moves
 * anything — and payments are unique by charge id, so re-running is harmless.
 * Returns how many charges were applied.
 */
export async function reconcileCharges(
  adapter: SubscriptionProviderAdapter,
  subscriptionId: string,
  state: ProviderSubscriptionState,
  now: Date = new Date()
): Promise<number> {
  if (state.chargeIds.length === 0) return 0;
  const known = await prisma.subscriptionPayment.findMany({
    where: { provider: "culqi", providerPaymentId: { in: state.chargeIds } },
    select: { providerPaymentId: true },
  });
  const seen = new Set(known.map((p) => p.providerPaymentId));
  const unknown = state.chargeIds.filter((id) => !seen.has(id)).slice(0, MAX_CHARGES_PER_RUN);
  if (unknown.length === 0) return 0;

  const charges = [];
  for (const id of unknown) {
    const charge = await adapter.getCharge(id);
    if (charge && charge.outcome !== "unknown") charges.push(charge);
    else logSubscription("warn", "reconcile.charge_unreadable", { subscriptionId, chargeId: id });
  }
  charges.sort(
    (a, b) => (a.facts.occurredAt?.getTime() ?? 0) - (b.facts.occurredAt?.getTime() ?? 0)
  );

  let applied = 0;
  for (const charge of charges) {
    const outcome: LifecycleOutcome = await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, subscriptionId);
      if (!locked) return { changed: false, cancelAtProvider: [], note: "gone" };
      const ctx: LifecycleContext = { now };
      return charge.outcome === "succeeded"
        ? applyChargeSucceeded(tx, locked, charge.facts, state, ctx)
        : applyChargeFailed(tx, locked, charge.facts, ctx);
    });
    if (outcome.changed) applied++;
    await stopAtProvider(adapter, outcome.cancelAtProvider, now);
    if (outcome.review) await alertOps("review_needed", { subscriptionId, reason: outcome.review });
  }
  if (applied > 0) logSubscription("info", "reconcile.charges_applied", { subscriptionId, applied });
  return applied;
}

async function endNeverCreated(subscriptionId: string, now: Date) {
  await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, subscriptionId);
    if (!locked || locked.endedAt || locked.activatedAt) return;
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: "cancelled", endedAt: now },
    });
    await tx.subscriptionCheckout.updateMany({
      where: { subscriptionId, status: "processing" },
      data: { status: "failed", failureCode: "not_created", lockedUntil: null },
    });
  });
  logSubscription("warn", "reconcile.not_created", { subscriptionId });
}

/**
 * On-demand reconciliation for a checkout the owner is watching. Throttled
 * per checkout, silent on failure: the poll must never error because Culqi is
 * slow — the status simply stays `processing` until the next try.
 */
export async function reconcileCheckout(checkoutId: string, now: Date = new Date()): Promise<void> {
  const claim = await prisma.subscriptionCheckout.updateMany({
    where: {
      id: checkoutId,
      status: "processing",
      subscriptionId: { not: null },
      OR: [{ lastReconciledAt: null }, { lastReconciledAt: { lt: new Date(now.getTime() - RECONCILE_THROTTLE_MS) } }],
    },
    data: { lastReconciledAt: now },
  });
  if (claim.count === 0) return;

  const checkout = await prisma.subscriptionCheckout.findUnique({
    where: { id: checkoutId },
    select: { subscriptionId: true },
  });
  const adapter = lifecycleAdapter();
  if (!checkout?.subscriptionId || !adapter) return;

  try {
    const note = await reconcileSubscription(adapter, checkout.subscriptionId, now);
    logSubscription("info", "reconcile.checkout", { checkoutId, note });
  } catch (error) {
    logSubscription(error instanceof ProviderUnavailableError ? "warn" : "error", "reconcile.checkout_failed", {
      checkoutId,
      error: safeError(error),
    });
  }
}
