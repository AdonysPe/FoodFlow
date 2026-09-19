// Grant — or revoke — the platform administrator role.
//
//   node scripts/grant-platform-admin.mjs                      # the default account
//   node scripts/grant-platform-admin.mjs otra@persona.com     # someone else
//   node scripts/grant-platform-admin.mjs otra@persona.com --revoke
//   node scripts/grant-platform-admin.mjs --list               # who has it today
//
// Safe to run as many times as you like: granting a role somebody already has
// changes nothing and says so.
//
// WHY A SCRIPT AND NOT JUST THE MIGRATION. The migration can only act on
// accounts that exist when it runs, and on a fresh database nobody has signed
// up yet. This is the command that finishes the job afterwards — and the one
// way to hand the role to a second operator later without writing SQL by hand.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** The account the platform ships owned by. */
const DEFAULT_EMAIL = "adonispereda1@gmail.com";

const PLATFORM_ADMIN = "platform_admin";
/** What a revoked operator becomes. Never a role with any platform power. */
const REVOKED_ROLE = "restaurant_owner";

/** Same normalization the migration uses, so both find the same row. */
function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function list() {
  const admins = await prisma.user.findMany({
    where: { role: PLATFORM_ADMIN },
    select: { email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.warn("[platform-admin] nadie tiene el rol todavía.");
    return;
  }

  console.info(`[platform-admin] ${admins.length} cuenta(s) con el rol:`);
  for (const admin of admins) {
    console.info(`  · ${admin.email}`);
  }
}

async function apply(email, revoke) {
  const user = await prisma.user.findFirst({
    // The stored column is already unique and lowercased on every write path,
    // but an account created before that was true could still carry a capital.
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    // Not an error: the usual case is running this before the person has
    // signed up. Exit 0 so a deploy pipeline is not broken by it.
    console.warn(
      `[platform-admin] no existe ninguna cuenta con ${email}.\n` +
        "           El rol NO se asignó a nadie más. Crea la cuenta (registro normal)\n" +
        "           y vuelve a ejecutar este comando."
    );
    return;
  }

  const target = revoke ? REVOKED_ROLE : PLATFORM_ADMIN;

  if (user.role === target) {
    console.info(`[platform-admin] ${user.email} ya tiene el rol "${target}". Sin cambios.`);
    return;
  }

  if (revoke && user.role !== PLATFORM_ADMIN) {
    console.warn(
      `[platform-admin] ${user.email} no es platform_admin (es "${user.role}"). Sin cambios.`
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: target,
      // Invalidates every session this account already has. Middleware routes
      // on the role inside the JWT, so without this the change would not be
      // visible until the token expired — and, on a revoke, the old token
      // would keep opening the admin panel for up to seven days.
      sessionVersion: { increment: 1 },
    },
  });

  console.info(
    `[platform-admin] ${user.email}: "${user.role}" → "${target}".\n` +
      "           Sus sesiones abiertas quedaron invalidadas: tiene que volver a entrar."
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    await list();
    return;
  }

  const revoke = args.includes("--revoke");
  const email = normalizeEmail(args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_EMAIL);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error(`"${email}" no parece un correo válido.`);
  }

  await apply(email, revoke);
}

main()
  .catch((error) => {
    console.error("[platform-admin] falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
