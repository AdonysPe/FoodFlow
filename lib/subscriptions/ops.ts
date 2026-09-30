// Operating the subscriptions without touching the database by hand: see what
// is stuck, run the same reconciliation the cron runs for one subscription,
// replay a stored event, close a review, repair a drifted restaurant.
//
// Every write here goes through the lifecycle (or a transition row), so it
// leaves the same audit trail as the payment path.
//
// Server only.

import { prisma } from "@/lib/db/prisma";
import type { PlanValue } from "@/lib/plans";
import { readCulqiConfig, readCulqiKeys, readWebhookSecret, subscriptionsEnabled } from "@/lib/subscriptions/config";
import type {
  OpsActionOutput,
  OpsDriftRow,
  OpsEventRow,
  OpsResult,
  OpsSubscriptionRow,
  SubscriptionOpsOverview,
} from "@/lib/subscriptions/opsContract";
import { accessUntilOf, loadLocked, projectRestaurant } from "@/lib/subscriptions/lifecycle";
import { reconcileSubscription } from "@/lib/subscriptions/reconcile";
import { lifecycleAdapter, logSubscription, safeError } from "@/lib/subscriptions/runtime";
import type { BillingStatusValue } from "@/lib/subscriptions/entitlement";
import { processStoredEvent } from "@/lib/subscriptions/webhooks";

type Actor = { id: string; email: string };
const LIST = 20;
const STUCK_AFTER_MS = 60 * 60 * 1000;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

// --------------------------------------------------------------- drift

type SubRow = NonNullable<Awaited<ReturnType<typeof prisma.subscription.findFirst>>>;

/** What the restaurant row should say, given the subscription that speaks for it. */
export async function findDrift(limit = LIST): Promise<OpsDriftRow[]> {
  const restaurants = await prisma.restaurant.findMany({
    where: { billingSource: "provider" },
    select: { id: true, name: true, plan: true, billingStatus: true, accessUntil: true },
    take: 500,
  });
  const drift: OpsDriftRow[] = [];
  for (const r of restaurants) {
    const speaker = (await prisma.subscription.findFirst({
      where: { restaurantId: r.id, activatedAt: { not: null }, endedAt: null },
      orderBy: { activatedAt: "desc" },
    })) as SubRow | null;
    const actual = {
      plan: r.plan as PlanValue,
      status: r.billingStatus as BillingStatusValue,
      accessUntil: iso(r.accessUntil),
    };
    if (!speaker) {
      // A provider-managed venue with no live subscription: it ends by its
      // dates, so this is only worth a look if the dates say it is still open.
      const stillOpen = r.accessUntil == null || r.accessUntil.getTime() > Date.now();
      if (stillOpen && r.billingStatus !== "cancelled") {
        drift.push({ restaurantId: r.id, restaurantName: r.name, subscriptionId: null, expected: null, actual });
      }
      continue;
    }
    const until = accessUntilOf(speaker);
    const expected = {
      plan: speaker.plan as PlanValue,
      status: speaker.status as BillingStatusValue,
      accessUntil: iso(until),
    };
    if (expected.plan !== actual.plan || expected.status !== actual.status || expected.accessUntil !== actual.accessUntil) {
      drift.push({ restaurantId: r.id, restaurantName: r.name, subscriptionId: speaker.id, expected, actual });
    }
    if (drift.length >= limit) break;
  }
  return drift;
}

/** Re-project the restaurants that drifted. Idempotent. Returns how many were repaired. */
export async function repairDrift(now: Date = new Date()): Promise<number> {
  const drifted = await findDrift(100);
  let repaired = 0;
  for (const row of drifted) {
    if (!row.subscriptionId) continue;
    await prisma.$transaction(async (tx) => {
      const locked = await loadLocked(tx, row.subscriptionId!);
      if (locked) await projectRestaurant(tx, locked, "maintenance.reprojected", { now });
    });
    repaired++;
  }
  return repaired;
}

// ------------------------------------------------------------ overview

function toRow(
  sub: SubRow,
  reason: string | null
): OpsSubscriptionRow {
  return {
    subscriptionId: sub.id,
    restaurantId: sub.restaurantId,
    restaurantName: sub.restaurantName,
    plan: sub.plan as PlanValue,
    status: sub.status as BillingStatusValue,
    reason,
    createdAt: sub.createdAt.toISOString(),
    hasProviderSubscription: sub.providerSubscriptionId != null,
  };
}

export async function getOpsOverview(now: Date = new Date()): Promise<SubscriptionOpsOverview> {
  const keys = readCulqiKeys();
  const config = readCulqiConfig({ requireEnabled: false });

  const [failed, review, stuck, unstopped, drift] = await Promise.all([
    prisma.subscriptionWebhookEvent.findMany({
      where: { status: "failed" },
      orderBy: { receivedAt: "desc" },
      take: LIST,
    }),
    prisma.subscription.findMany({ where: { needsReview: true }, orderBy: { updatedAt: "desc" }, take: LIST }),
    prisma.subscription.findMany({
      where: { activatedAt: null, endedAt: null, createdAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
      orderBy: { createdAt: "asc" },
      take: LIST,
    }),
    prisma.subscription.findMany({
      where: {
        providerSubscriptionId: { not: null },
        providerCanceledAt: null,
        OR: [{ endedAt: { not: null } }, { status: "cancelled" }],
      },
      take: LIST,
    }),
    findDrift(),
  ]);

  const [failedTotal, reviewTotal, stuckTotal, unstoppedTotal] = await Promise.all([
    prisma.subscriptionWebhookEvent.count({ where: { status: "failed" } }),
    prisma.subscription.count({ where: { needsReview: true } }),
    prisma.subscription.count({
      where: { activatedAt: null, endedAt: null, createdAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
    }),
    prisma.subscription.count({
      where: {
        providerSubscriptionId: { not: null },
        providerCanceledAt: null,
        OR: [{ endedAt: { not: null } }, { status: "cancelled" }],
      },
    }),
  ]);

  return {
    environment: process.env.VERCEL_ENV ?? "local",
    checkoutEnabled: subscriptionsEnabled() && config.ok,
    keys: keys.ok ? "ok" : keys.reason,
    mode: !subscriptionsEnabled() && !keys.ok ? "off" : keys.ok ? keys.keys.mode : "off",
    webhookSecretConfigured: readWebhookSecret() != null,
    plansConfigured: config.ok || (config.reason === "misconfigured" && !config.problems.some((p) => /CULQI_PLAN_/.test(p))),
    counts: {
      failedEvents: failedTotal,
      needsReview: reviewTotal,
      stuckPending: stuckTotal,
      notStoppedAtProvider: unstoppedTotal,
      drift: drift.length,
    },
    failedEvents: failed.map(
      (e): OpsEventRow => ({
        id: e.id,
        providerEventId: e.providerEventId,
        type: e.type,
        status: e.status,
        attempts: e.attempts,
        error: e.error,
        subscriptionId: e.subscriptionId,
        receivedAt: e.receivedAt.toISOString(),
      })
    ),
    needsReview: review.map((s) => toRow(s as SubRow, s.reviewReason)),
    stuckPending: stuck.map((s) => toRow(s as SubRow, null)),
    notStoppedAtProvider: unstopped.map((s) => toRow(s as SubRow, null)),
    drift,
  };
}

// ------------------------------------------------------------- actions

const noteOf = (note: string): OpsResult<OpsActionOutput> => ({ ok: true, data: { note } });

export async function reconcileNow(subscriptionId: string): Promise<OpsResult<OpsActionOutput>> {
  const adapter = lifecycleAdapter();
  if (!adapter) return { ok: false, error: "Las llaves de Culqi no están configuradas en este despliegue." };
  try {
    return noteOf(await reconcileSubscription(adapter, subscriptionId));
  } catch (error) {
    logSubscription("error", "ops.reconcile_failed", { subscriptionId, error: safeError(error) });
    return { ok: false, error: "Culqi no respondió. Inténtalo de nuevo en unos minutos." };
  }
}

export async function reprocessEvent(eventId: string): Promise<OpsResult<OpsActionOutput>> {
  const row = await prisma.subscriptionWebhookEvent.findUnique({ where: { id: eventId } });
  if (!row) return { ok: false, error: "No existe ese evento." };
  if (row.status === "processed") return noteOf("already_processed");
  // A replay starts from a clean slate: the cap on automatic attempts is for
  // the cron, not for a person who fixed the cause.
  await prisma.subscriptionWebhookEvent.update({
    where: { id: eventId },
    data: { status: "failed", attempts: 0, lockedUntil: null, error: null },
  });
  return noteOf(await processStoredEvent(eventId));
}

export async function resolveReview(
  subscriptionId: string,
  note: string,
  actor: Actor
): Promise<OpsResult<OpsActionOutput>> {
  const done = await prisma.$transaction(async (tx) => {
    const sub = await loadLocked(tx, subscriptionId);
    if (!sub) return false;
    await tx.subscription.update({ where: { id: subscriptionId }, data: { needsReview: false, reviewReason: null } });
    if (sub.restaurantId) {
      await tx.subscriptionTransition.create({
        data: {
          restaurantId: sub.restaurantId,
          subscriptionId,
          fromStatus: sub.status,
          toStatus: sub.status,
          fromSource: "provider",
          toSource: "provider",
          fromPlan: sub.plan,
          toPlan: sub.plan,
          // The reason it was flagged and the admin's note travel together.
          reason: `admin.review_resolved:${(sub.reviewReason ?? "").slice(0, 60)}:${note}`.slice(0, 240),
          actorUserId: actor.id,
          actorEmail: actor.email,
        },
      });
    }
    return true;
  });
  return done ? noteOf("resolved") : { ok: false, error: "No existe esa suscripción." };
}

/**
 * A subscription that never confirmed and that Culqi does not show as paid:
 * stop it at Culqi and close it, so the owner can try again. Runs the same
 * reconciliation first — if Culqi says it was paid, it is activated instead.
 */
export async function abandonPending(subscriptionId: string, actor: Actor): Promise<OpsResult<OpsActionOutput>> {
  const adapter = lifecycleAdapter();
  if (!adapter) return { ok: false, error: "Las llaves de Culqi no están configuradas en este despliegue." };

  try {
    await reconcileSubscription(adapter, subscriptionId);
  } catch (error) {
    logSubscription("error", "ops.abandon_reconcile_failed", { subscriptionId, error: safeError(error) });
    return { ok: false, error: "Culqi no respondió. No se cerró nada." };
  }

  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return { ok: false, error: "No existe esa suscripción." };
  if (sub.activatedAt) return noteOf("activated_by_reconcile");
  if (sub.endedAt) return noteOf("already_closed");

  if (sub.providerSubscriptionId) {
    try {
      await adapter.cancelSubscription(sub.providerSubscriptionId);
    } catch (error) {
      logSubscription("error", "ops.abandon_stop_failed", { subscriptionId, error: safeError(error) });
      return { ok: false, error: "No pudimos detener la suscripción en Culqi. No se cerró nada." };
    }
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const locked = await loadLocked(tx, subscriptionId);
    if (!locked || locked.activatedAt || locked.endedAt) return;
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: "cancelled", endedAt: now, canceledAt: now, providerCanceledAt: now },
    });
    await tx.subscriptionCheckout.updateMany({
      where: { subscriptionId, status: "processing" },
      data: { status: "failed", failureCode: "abandoned_by_admin", lockedUntil: null },
    });
    if (locked.restaurantId) {
      await tx.subscriptionTransition.create({
        data: {
          restaurantId: locked.restaurantId,
          subscriptionId,
          fromStatus: locked.status,
          toStatus: "cancelled",
          fromSource: null,
          toSource: "provider",
          fromPlan: locked.plan,
          toPlan: locked.plan,
          reason: "admin.abandon_pending",
          actorUserId: actor.id,
          actorEmail: actor.email,
        },
      });
    }
  });
  return noteOf("abandoned");
}

export async function repairRestaurant(subscriptionId: string, actor: Actor): Promise<OpsResult<OpsActionOutput>> {
  const now = new Date();
  const done = await prisma.$transaction(async (tx) => {
    const sub = await loadLocked(tx, subscriptionId);
    if (!sub) return false;
    await projectRestaurant(tx, sub, "admin.reprojected", { now, actor });
    return true;
  });
  return done ? noteOf("reprojected") : { ok: false, error: "No existe esa suscripción." };
}

