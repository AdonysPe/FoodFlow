import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { maxOtpAttempts, verifyOtpHash } from "@/lib/auth/otp";
import { clearSessionCookie } from "@/lib/auth/session";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

const schema = z
  .object({
    email: z.email().trim().toLowerCase().max(255),
    code: z.string().trim().regex(/^\d{6}$/),
    password: passwordSchema,
  })
  .strict();

const invalidCode = () =>
  NextResponse.json(
    { ok: false, code: "invalid_code", error: "Código inválido o vencido." },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { ok: false, code: "csrf_failed", error: "Solicitud no válida." },
      { status: 403 }
    );
  }

  const limit = await rateLimit("password-reset-verify-ip", await callerIpHash(), {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Solicita un código nuevo." },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 400 }
    );
  }

  const { email, code, password } = parsed.data;
  const now = new Date();

  // One attempt is spent BEFORE the code is looked at, in a single statement.
  // Reading the counter, comparing, then writing "read + 1" let guesses sent
  // together all read 0 and all write 1, so a burst was counted as one try and
  // the three-attempt cap could be outrun. Postgres locks the row for the
  // statement and a second concurrent UPDATE re-checks the WHERE against the
  // first one's result, so at most `maxOtpAttempts()` guesses ever get past
  // here per code, however many arrive at once (same idea as the login lock).
  const reserved = await prisma.$queryRaw<{ id: string; code: string; attempts: number }[]>`
    UPDATE "User"
    SET "password_reset_attempts" = "password_reset_attempts" + 1
    WHERE "email" = ${email}
      AND "verification_code" IS NOT NULL
      AND "verification_code_expires_at" > ${now}
      AND "password_reset_attempts" < ${maxOtpAttempts()}
    RETURNING "id", "verification_code" AS "code", "password_reset_attempts" AS "attempts"
  `;
  const attempt = reserved[0];
  if (!attempt) return invalidCode();

  if (!verifyOtpHash(code, attempt.code)) {
    // The last attempt is gone: retire the code instead of leaving it around.
    if (Number(attempt.attempts) >= maxOtpAttempts()) {
      await prisma.user.updateMany({
        where: { id: attempt.id, verificationCode: attempt.code },
        data: { verificationCode: null, verificationCodeExpiresAt: null },
      });
    }
    return invalidCode();
  }

  const passwordHash = await hashPassword(password);
  const updated = await prisma.user.updateMany({
    where: { id: attempt.id, verificationCode: attempt.code },
    data: {
      passwordHash,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetAt: now,
      passwordResetAttempts: 0,
      requiresPasswordSetup: false,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  if (updated.count !== 1) return invalidCode();

  await clearSessionCookie();
  await logAudit({
    action: "auth.password_reset",
    actor: { id: attempt.id, email },
  });
  return NextResponse.json(
    { ok: true, data: { message: "Contraseña actualizada." } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
