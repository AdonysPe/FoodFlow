// Daily subscription maintenance, run by Vercel Cron. It is the safety net
// under the webhook: everything here also happens on the normal path, this
// catches what a lost delivery, a timeout or a crash left behind.
//
//   1. expire checkouts nobody finished
//   2. retry webhook events that failed (Culqi or our DB was down)
//   3. ask Culqi about subscriptions still waiting for confirmation
//   4. stop at Culqi what we decided to stop but could not reach
//   5. start the scheduled downgrades that reached their date
//   6. mark `suspended` what ran out of grace; close finished cancellations
//
// Bounded per run so it fits a serverless function. Server only.

import { prisma } from "@/lib/db/prisma";
import type { JobReport } from "@/lib/billing/jobs";
import { readCulqiConfig } from "@/lib/subscriptions/config";
import { endIfExpired, loadLocked, suspendIfGraceOver } from "@/lib/subscriptions/lifecycle";
import { startReplacement } from "@/lib/subscriptions/operations";
import { GRACE_DAYS } from "@/lib/subscriptions/pricing";
import { reconcileSubscription, stopAtProvider } from "@/lib/subscriptions/reconcile";
import { adapterFor, lifecycleAdapter, logSubscription } from "@/lib/subscriptions/runtime";
import { processStoredEvent } from "@/lib/subscriptions/webhooks";

const BATCH = 50;
const MAX_EVENT_ATTEMPTS = 8;

export async function runSubscriptionMaintenance(now: Date = new Date()): Promise<JobReport> {
  const started = Date.now();
  const report: JobReport = {
    job: "subscriptions.maintenance",
    scanned: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    ms: 0,
    notes: [],
  };
  const done = () => ({ ...report, ms: Date.now() - started });

  // 1. Checkouts left open. No provider call needed.
  const expired = await prisma.subscriptionCheckout.updateMany({
    where: { status: { in: ["created", "requires_action"] }, expiresAt: { lt: now } },
    data: { status: "expired", lockedUntil: null },
  });
  if (expired.count) report.notes.push(`checkouts vencidos: ${expired.count}`);

  const adapter = lifecycleAdapter();
  if (!adapter) {
    report.notes.push("sin llaves de Culqi: solo se vencieron checkouts");
    return done();
  }

  const step = async (label: string, run: () => Promise<unknown>) => {
    report.scanned++;
    try {
      await run();
      report.processed++;
    } catch (error) {
      report.failed++;
      logSubscription("error", "maintenance.step_failed", { step: label, error: String(error).slice(0, 200) });
    }
  };

  // 2. Failed events, oldest first.
  const events = await prisma.subscriptionWebhookEvent.findMany({
    where: {
      attempts: { lt: MAX_EVENT_ATTEMPTS },
      OR: [
        { status: "failed" },
        { status: "received", receivedAt: { lt: new Date(now.getTime() - 5 * 60 * 1000) } },
        { status: "processing", lockedUntil: { lt: now } },
      ],
    },
    orderBy: { receivedAt: "asc" },
    take: BATCH,
    select: { id: true },
  });
  for (const event of events) {
    await step("event", async () => {
      const result = await processStoredEvent(event.id, now);
      if (result === "retry" || result === "error") throw new Error(result);
    });
  }

  // 3. Waiting for confirmation (includes creations whose response was lost).
  const waiting = await prisma.subscription.findMany({
    where: { activatedAt: null, endedAt: null },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true },
  });
  for (const sub of waiting) await step("reconcile", () => reconcileSubscription(adapter, sub.id, now));

  // 4. Decided to stop, not yet stopped at Culqi.
  const toStop = await prisma.subscription.findMany({
    where: {
      providerSubscriptionId: { not: null },
      providerCanceledAt: null,
      OR: [{ endedAt: { not: null } }, { status: "cancelled" }],
    },
    take: BATCH,
    select: { id: true },
  });
  if (toStop.length) await step("stop", () => stopAtProvider(adapter, toStop.map((s) => s.id), now));

  // 5. Downgrades that reached their date. Needs the plan ids even while new
  //    checkouts are switched off: these venues are already customers.
  const due = await prisma.subscription.findMany({
    where: { pendingPlan: { not: null }, pendingPlanEffectiveAt: { lte: now }, endedAt: null },
    take: BATCH,
  });
  if (due.length) {
    const read = readCulqiConfig({ requireEnabled: false });
    if (!read.ok) {
      report.notes.push("bajadas de plan pendientes sin planes de Culqi configurados");
      report.skipped += due.length;
    } else {
      for (const sub of due) {
        await step("downgrade", async () => {
          const result = await startReplacement(adapterFor(read.config), read.config, sub, sub.pendingPlan!, "downgrade", {
            idempotencyKey: crypto.randomUUID(),
            userId: sub.ownerId,
            userEmail: sub.ownerEmail,
            now,
          });
          if (!result.ok && result.code !== "change_pending") throw new Error(result.code);
        });
      }
    }
  }

  // 6. Status housekeeping. Access itself is already decided by dates.
  const housekeeping = await prisma.subscription.findMany({
    where: { endedAt: null, activatedAt: { not: null }, status: { in: ["past_due", "cancelled"] } },
    take: BATCH * 2,
    select: { id: true },
  });
  for (const { id } of housekeeping) {
    await step("housekeeping", () =>
      prisma.$transaction(async (tx) => {
        const locked = await loadLocked(tx, id);
        if (!locked) return;
        const ctx = { now };
        if (!(await suspendIfGraceOver(tx, locked, GRACE_DAYS, ctx))) await endIfExpired(tx, locked, ctx);
      })
    );
  }

  return done();
}
