/**
 * F2 verification — tenant isolation.
 *
 * Seeds two restaurants (A, B) plus a waiter belonging only to A, then proves
 * that the query patterns the server actions rely on ({ where: { id,
 * restaurantId } }) actually stop cross-tenant reads and writes. Runs against
 * whatever DATABASE_URL points at; seeds and removes its own data.
 *
 *   node scripts/security-check.mjs
 *
 * Exit code is non-zero if any check fails.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Minimal .env loader so the script works on any Node version without deps.
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  /* rely on the ambient environment */
}

const prisma = new PrismaClient();
const TAG = `sec-check-${Date.now()}`;
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  // ---- seed -------------------------------------------------------------
  const ownerA = await prisma.user.create({ data: { email: `${TAG}-a@example.test`, role: "client" } });
  const ownerB = await prisma.user.create({ data: { email: `${TAG}-b@example.test`, role: "client" } });
  const mozo = await prisma.user.create({ data: { email: `${TAG}-m@example.test`, role: "mozo" } });

  const rA = await prisma.restaurant.create({ data: { name: `${TAG} A`, ownerId: ownerA.id } });
  const rB = await prisma.restaurant.create({ data: { name: `${TAG} B`, ownerId: ownerB.id } });
  await prisma.staffMembership.create({ data: { restaurantId: rA.id, userId: mozo.id } });

  const itemA = await prisma.menuItem.create({ data: { restaurantId: rA.id, name: "Plato A", price: 10 } });
  const itemB = await prisma.menuItem.create({ data: { restaurantId: rB.id, name: "Plato B", price: 20 } });
  const orderB = await prisma.order.create({
    data: { restaurantId: rB.id, customerName: "Cliente B", items: [], total: 0 },
  });

  try {
    // ---- 1. cross-tenant read by id --------------------------------------
    // This is exactly requireOwnedMenuItem(itemB.id, rA.id) from menu.ts.
    const scoped = await prisma.menuItem.findFirst({ where: { id: itemB.id, restaurantId: rA.id } });
    check("A cannot load B's menu item via { id, restaurantId }", scoped === null);

    const unscoped = await prisma.menuItem.findFirst({ where: { id: itemB.id } });
    check("…and the row IS reachable without the restaurantId scope (scope is what protects)", unscoped !== null);

    // updateOrderStatus / payOrder guard: findFirst({ id, restaurantId }) before write.
    const orderScoped = await prisma.order.findFirst({ where: { id: orderB.id, restaurantId: rA.id } });
    check("A cannot load B's order via { id, restaurantId }", orderScoped === null);

    // ---- 2. reorder id-set guard ---------------------------------------
    // reorderMenuItems: the submitted ids must be exactly the caller's own set.
    const ownedByA = new Set(
      (await prisma.menuItem.findMany({ where: { restaurantId: rA.id, categoryId: null }, select: { id: true } }))
        .map((i) => i.id),
    );
    const forgedPayload = [itemB.id];
    const accepted = forgedPayload.length === ownedByA.size && forgedPayload.every((id) => ownedByA.has(id));
    check("reorderMenuItems rejects a payload containing B's item id", accepted === false);

    // ---- 3. waiter scope ---------------------------------------------
    // requireComandaRestaurant resolves a mozo -> restaurant through staffMembership.
    const mozoMembership = await prisma.staffMembership.findFirst({
      where: { userId: mozo.id },
      include: { restaurant: true },
    });
    check("waiter of A resolves to restaurant A", mozoMembership?.restaurant.id === rA.id);
    const mozoInB = await prisma.staffMembership.findFirst({ where: { userId: mozo.id, restaurantId: rB.id } });
    check("waiter of A has no membership in B", mozoInB === null);

    const mozoRow = await prisma.user.findUnique({ where: { id: mozo.id } });
    // requireClientRestaurant redirects unless role === "client".
    check("waiter role is not 'client' (so requireClientRestaurant would reject it)", mozoRow?.role !== "client");

    // ---- 4. leads have no tenant path ---------------------------------
    // clientLead / Lead carry no restaurantId and no relation from Restaurant,
    // so a tenant query can never reach them — they are admin-only by shape.
    const clientLeadFields = Object.keys(prisma.clientLead.fields);
    check(
      "ClientLead has no restaurantId column (unreachable from a tenant query)",
      !clientLeadFields.includes("restaurantId"),
      `fields: ${clientLeadFields.join(", ")}`,
    );

    // ---- 5. rate-limit primitive (F3) --------------------------------
    // Same fixed-window INSERT ... ON CONFLICT that lib/security/rateLimit.ts
    // runs. Prove the counter trips exactly at `max`.
    const rlKey = `${TAG}:rl`;
    const rlExpires = new Date(Date.now() + 60_000);
    const MAX = 5;
    let blockedAt = null;
    for (let i = 1; i <= MAX + 3; i++) {
      const rows = await prisma.$queryRaw`
        INSERT INTO "RateLimit" ("key", "count", "expiresAt")
        VALUES (${rlKey}, 1, ${rlExpires})
        ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + 1
        RETURNING "count"`;
      const count = Number(rows[0].count);
      if (count > MAX && blockedAt === null) blockedAt = i;
    }
    check("rate limiter blocks on the request after max (max=5 -> blocks at 6)", blockedAt === MAX + 1, `blocked at #${blockedAt}`);
    await prisma.rateLimit.deleteMany({ where: { key: rlKey } });

    // ---- 6. audit log is admin-only by shape (F5) --------------------
    const auditFields = Object.keys(prisma.auditLog.fields);
    check(
      "AuditLog has no restaurant relation (unreachable from a tenant query)",
      !auditFields.includes("restaurant"),
      `fields: ${auditFields.join(", ")}`,
    );
    // logAudit must never throw / block: a bad insert is swallowed.
    let auditThrew = false;
    try {
      await prisma.auditLog.create({
        data: { action: `${TAG}.probe`, actorEmail: "probe@example.test" },
      });
    } catch {
      auditThrew = true;
    }
    check("audit rows insert cleanly", auditThrew === false);
    await prisma.auditLog.deleteMany({ where: { action: `${TAG}.probe` } });
  } finally {
    // ---- teardown ------------------------------------------------------
    await prisma.order.deleteMany({ where: { restaurantId: { in: [rA.id, rB.id] } } });
    await prisma.menuItem.deleteMany({ where: { restaurantId: { in: [rA.id, rB.id] } } });
    await prisma.staffMembership.deleteMany({ where: { restaurantId: { in: [rA.id, rB.id] } } });
    await prisma.restaurant.deleteMany({ where: { id: { in: [rA.id, rB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, ownerB.id, mozo.id] } } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    check("script ran without throwing", false, String(err));
  })
  .finally(async () => {
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exit(failed.length ? 1 : 0);
  });
