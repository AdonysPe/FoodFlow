import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCsrf } from "@/lib/auth/csrf";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

const LOCK_AFTER_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = "$2b$10$C6UzMDM.H6dfI/f/IKcEe.5hMMK3hjlZSSmhkSssxSZbxwdpwq9q6";

const schema = z
  .object({
    email: z.email().trim().toLowerCase().max(255),
    password: z.string().min(1).max(72),
  })
  .strict();

const invalidCredentials = () =>
  NextResponse.json(
    { ok: false, code: "invalid_credentials", error: "Correo o contraseña incorrectos." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { ok: false, code: "csrf_failed", error: "Solicitud no válida." },
      { status: 403 }
    );
  }

  const limit = await rateLimit("login-ip", await callerIpHash(), {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, code: "rate_limited", error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidCredentials();
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return invalidCredentials();
  }

  const now = new Date();
  if (user.loginLockedUntil && user.loginLockedUntil > now) {
    return NextResponse.json(
      { ok: false, code: "account_locked", error: "Cuenta bloqueada durante 15 minutos." },
      { status: 429 }
    );
  }

  if (!user.passwordHash || user.requiresPasswordSetup) {
    return NextResponse.json(
      {
        ok: false,
        code: "password_setup_required",
        error: "Debes crear tu contraseña antes de ingresar.",
      },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    // A single atomic UPDATE, not a read-then-write: two concurrent wrong
    // guesses must not both compute "next = 1" from the same stale count and
    // silently undercount each other, which would let a burst of requests
    // outrun the 5-attempt lock. Postgres locks the row for the statement's
    // duration, so a second concurrent UPDATE for the same id waits and then
    // re-evaluates the CTE against the first one's committed result — the
    // same guarantee lib/security/rateLimit.ts's INSERT ... ON CONFLICT
    // already relies on, just expressed as an UPDATE ... FROM here.
    const rows = await prisma.$queryRaw<
      { failedLoginAttempts: number; loginLockedUntil: Date | null }[]
    >`
      WITH current AS (
        SELECT
          id,
          CASE
            WHEN "login_locked_until" IS NOT NULL AND "login_locked_until" <= NOW() THEN 0
            ELSE "failed_login_attempts"
          END AS prev_failures,
          ("login_locked_until" IS NOT NULL AND "login_locked_until" > NOW()) AS currently_locked
        FROM "User"
        WHERE id = ${user.id}
      )
      UPDATE "User" u SET
        "failed_login_attempts" = CASE
          WHEN c.currently_locked THEN u."failed_login_attempts"
          WHEN c.prev_failures + 1 >= ${LOCK_AFTER_FAILURES} THEN 0
          ELSE c.prev_failures + 1
        END,
        "login_locked_until" = CASE
          WHEN c.currently_locked THEN u."login_locked_until"
          WHEN c.prev_failures + 1 >= ${LOCK_AFTER_FAILURES} THEN NOW() + (${LOCK_MS} * INTERVAL '1 millisecond')
          ELSE NULL
        END
      FROM current c
      WHERE u.id = c.id
      RETURNING
        u."failed_login_attempts" AS "failedLoginAttempts",
        u."login_locked_until" AS "loginLockedUntil"
    `;
    const updated = rows[0];
    const shouldLock =
      updated?.loginLockedUntil != null && updated.loginLockedUntil > new Date();
    return shouldLock
      ? NextResponse.json(
          { ok: false, code: "account_locked", error: "Cuenta bloqueada durante 15 minutos." },
          { status: 429 }
        )
      : invalidCredentials();
  }

  const activeUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  const token = await createSessionToken({
    sub: activeUser.id,
    email: activeUser.email,
    role: activeUser.role,
    sessionVersion: activeUser.sessionVersion,
  });
  await setSessionCookie(token);
  await logAudit({
    action: "auth.login",
    actor: { id: activeUser.id, email: activeUser.email },
    after: { role: activeUser.role },
  });

  return NextResponse.json(
    { ok: true, data: { role: activeUser.role } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
