// Server-to-server reconciliation: ask Culqi directly what a subscription is
// and apply it through the lifecycle. This is the path that does not depend on
// a webhook arriving — the status poll of the checkout panel and the daily
// maintenance both come through here.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import {
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
import { lifecycleAdapter, logSubscription } from "@/lib/subscriptions/runtime";

/** A creation with a lost response is given this long to show up at Culqi. */
const LOST_CREATION_WINDOW_MS = 60 * 60 * 1000;
/** The checkout panel polls every few seconds; Culqi is asked at most this often. */
const RECONCILE_THROTTLE_MS = 15 * 1000;

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
      logSubscription("error", "provider.stop_failed", { subscriptionId: id, error: String(error) });
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
  return outcome.note;
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
      error: String(error),
    });
  }
}
