import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkBucket, readS3Config } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MigrationRow = {
  migrationName: string;
  finishedAt: Date;
};

export async function GET() {
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
      !lastMigration || oseStatus === "error" || storageStatus === "error"
        ? "degraded"
        : "ok";

    return NextResponse.json(
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
    return NextResponse.json(
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
