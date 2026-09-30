import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkBucket, readS3Config } from "@/lib/storage/s3";
import { sessionSecretStatus } from "@/lib/auth/session";
import { hasBearer } from "@/lib/security/bearer";
import { readCulqiConfig, readCulqiKeys, readWebhookSecret, subscriptionsEnabled } from "@/lib/subscriptions/config";
import { foodflowRuc } from "@/lib/subscriptions/ruc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The subscription code reads columns that only exist after migrations
// 20260929120000, 20260929121000 and 20260930120000. Build does not run
// migrations, so a deploy that lands before them breaks every dashboard
// request: this is the check to run right after a deploy (and what an uptime
// monitor should watch). No customer data, only counts.
async function subscriptionsCheck() {
  const columns = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'Restaurant' AND column_name IN ('billing_source', 'access_until')
  `;
  const tables = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM information_schema.tables
    WHERE table_name IN ('Subscription', 'SubscriptionCheckout', 'SubscriptionWebhookEvent',
                         'SubscriptionTransition', 'SubscriptionPayment')
  `;
  const schemaReady = (columns[0]?.n ?? 0) === 2 && (tables[0]?.n ?? 0) === 5;

  const keys = readCulqiKeys();
  const config = readCulqiConfig({ requireEnabled: false });
  const base = {
    schema: schemaReady ? "ok" : "missing",
    enabled: subscriptionsEnabled(),
    keys: keys.ok ? "ok" : keys.reason,
    mode: keys.ok ? keys.keys.mode : null,
    plans: config.ok ? "ok" : "incomplete",
    webhookSecret: readWebhookSecret() ? "ok" : "missing",
    // Live mode is refused without it, so "missing" here is what keeps real
    // charges impossible while FoodFlow's RUC is still being issued.
    fiscalId: foodflowRuc() ? "ok" : "missing",
  };
  if (!schemaReady) return { status: "error", ...base, failedEvents: null, needsReview: null };

  const [failedEvents, needsReview] = await Promise.all([
    prisma.subscriptionWebhookEvent.count({ where: { status: "failed" } }),
    prisma.subscription.count({ where: { needsReview: true } }),
  ]);
  return {
    status: failedEvents > 0 || needsReview > 0 ? "attention" : "ok",
    ...base,
    failedEvents,
    needsReview,
  };
}

type MigrationRow = {
  migrationName: string;
  finishedAt: Date;
};

// A monitor may ask "is it up?"; only the operator (the same bearer secret the
// crons use) may ask "how is it configured?". The detail — database size,
// which migration ran last, payment-key mode, how many restaurants have OSE
// credentials, whether the session key is shared — is a map for an attacker.
function reply(request: Request, body: Record<string, unknown>, init: ResponseInit) {
  const detailed = hasBearer(request, process.env.CRON_SECRET);
  return NextResponse.json(detailed ? body : { status: body.status }, init);
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    const databaseRows = await prisma.$queryRaw<Array<{ sizeBytes: string }>>`
      SELECT pg_database_size(current_database())::text AS "sizeBytes"
    `;

    const migrations = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name AS "migrationName", finished_at AS "finishedAt"
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;

    const oseSettings = await prisma.receiptSettings.findMany({
      where: { oseProvider: { not: null } },
      select: { restaurantId: true, oseProvider: true },
    });
    const oseCredentials = oseSettings.length
      ? await prisma.billingCredentials.findMany({
          where: { restaurantId: { in: oseSettings.map((row) => row.restaurantId) } },
          select: { restaurantId: true, lastTestAt: true, lastTestOk: true },
        })
      : [];
    const credentialByRestaurant = new Map(
      oseCredentials.map((row) => [row.restaurantId, row] as const)
    );
    const failedOseTests = oseSettings.filter(
      (row) => credentialByRestaurant.get(row.restaurantId)?.lastTestOk === false
    ).length;
    const untestedOse = oseSettings.filter(
      (row) => credentialByRestaurant.get(row.restaurantId)?.lastTestOk == null
    ).length;
    const lastOseTestAt = oseCredentials
      .map((row) => row.lastTestAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const [pendingBackups, completedBackups] = await Promise.all([
      prisma.cdr.count({
        where: { estado: { in: ["ACEPTADO", "RECHAZADO"] }, backupUrl: null },
      }),
      prisma.cdr.count({ where: { backupUrl: { not: null } } }),
    ]);
    const storageConfig = readS3Config();
    const storageProbe = storageConfig ? await checkBucket(storageConfig) : null;

    const subscriptions = await subscriptionsCheck().catch(() => ({ status: "error", schema: "unknown" }));
    const lastMigration = migrations[0] ?? null;
    const oseStatus =
      oseSettings.length === 0
        ? "not_configured"
        : failedOseTests > 0
          ? "error"
          : untestedOse > 0
            ? "untested"
            : "ok";
    const storageStatus = !storageConfig
      ? "not_configured"
      : storageProbe?.ok
        ? "ok"
        : "error";
    const status =
      !lastMigration || oseStatus === "error" || storageStatus === "error" || subscriptions.status === "error"
        ? "degraded"
        : "ok";

    return reply(
      request,
      {
        status,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        checks: {
          database: {
            status: "ok",
            sizeBytes: Number(databaseRows[0]?.sizeBytes ?? 0),
          },
          ose: {
            status: oseStatus,
            configuredRestaurants: oseSettings.length,
            failedTests: failedOseTests,
            untested: untestedOse,
            lastTestAt: lastOseTestAt?.toISOString() ?? null,
          },
          storage: {
            status: storageStatus,
            capacity: storageConfig ? "elastic" : null,
            pendingBackups,
            completedBackups,
            latencyMs: storageProbe?.latencyMs ?? null,
          },
          subscriptions,
          auth: { sessionSecret: sessionSecretStatus() },
          migration: lastMigration
            ? {
                status: "ok",
                name: lastMigration.migrationName,
                executedAt: lastMigration.finishedAt.toISOString(),
              }
            : { status: "missing", name: null, executedAt: null },
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return reply(
      request,
      {
        status: "error",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        checks: {
          database: { status: "error" },
          ose: { status: "unknown" },
          storage: { status: "unknown" },
          migration: { status: "unknown" },
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
