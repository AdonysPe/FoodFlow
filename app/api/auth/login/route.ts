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
    const previousFailures =
      user.loginLockedUntil && user.loginLockedUntil <= now ? 0 : user.failedLoginAttempts;
    const nextFailures = previousFailures + 1;
    const shouldLock = nextFailures >= LOCK_AFTER_FAILURES;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextFailures,
        loginLockedUntil: shouldLock ? new Date(Date.now() + LOCK_MS) : null,
      },
    });
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
