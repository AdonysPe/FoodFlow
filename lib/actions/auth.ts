"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { sendOTP } from "@/lib/email/mailer";
import { checkOtpRequestRateLimit } from "@/lib/auth/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
import {
  generateOtp,
  hashOtp,
  maxOtpAttempts,
  otpExpiryDate,
  verifyOtpHash,
} from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logAudit } from "@/lib/audit/log";

const emailSchema = z.string().trim().toLowerCase().email();
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requestOtp(rawEmail: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Escribe un correo válido." };
  const email = parsed.data;

  // Per-IP cap first: stops one host from requesting codes for many different
  // victim addresses (email bombing). Generous enough for a whole restaurant
  // team logging in from the same venue Wi-Fi. Per-email cap still applies below.
  const ipLimit = await rateLimit("otp-ip", await callerIpHash(), {
    max: 15,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.ok) {
    return { ok: false, error: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos." };
  }

  const emailLimit = await checkOtpRequestRateLimit(email);
  if (!emailLimit.ok) return { ok: false, error: emailLimit.reason };

  const code = generateOtp();

  // Invalidate any still-pending codes so only the newest one is usable.
  await prisma.oTPCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.oTPCode.create({
    data: { email, code: hashOtp(code), expiresAt: otpExpiryDate() },
  });

  // Outside production, always print the code to the server console. Handy for
  // local testing (e.g. logging in as a mozo whose address can't receive mail
  // through the email provider's sandbox).
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(`\n🔑  [dev] Código de acceso para ${email}: ${code}\n`);
  }

  try {
    await sendOTP(email, code);
  } catch (err) {
    // Most commonly: SMTP env vars aren't set on the deploy target (a local
    // .env never ships to production — they must be added in the hosting
    // platform's dashboard). Surface a specific, actionable message instead
    // of letting this bubble up as a generic client-side "connection issue".
    console.error("Failed to send OTP email:", err);
    // In dev the code is already in the console above — let the flow continue
    // to the code screen instead of dead-ending on a delivery error.
    if (isDev) return { ok: true, data: undefined };
    return {
      ok: false,
      error: "No pudimos enviar el código ahora. Puede que el envío de correos no esté configurado.",
    };
  }

  return { ok: true, data: undefined };
}

export async function verifyOtp(
  rawEmail: string,
  rawCode: string
): Promise<ActionResult<{ role: "admin" | "client" | "mozo" }>> {
  const emailParsed = emailSchema.safeParse(rawEmail);
  const codeParsed = codeSchema.safeParse(rawCode);
  if (!emailParsed.success || !codeParsed.success) {
    return { ok: false, error: "Escribe un correo válido y el código de 6 dígitos." };
  }
  const email = emailParsed.data;
  const code = codeParsed.data;

  const otp = await prisma.oTPCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "Ese código expiró. Pide uno nuevo." };
  }

  if (otp.attempts >= maxOtpAttempts()) {
    return { ok: false, error: "Demasiados intentos fallidos. Pide un código nuevo." };
  }

  if (!verifyOtpHash(code, otp.code)) {
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Código incorrecto. Inténtalo de nuevo." };
  }

  await prisma.oTPCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  // The admin allow-list always wins. Otherwise keep whatever role the account
  // already has — a mozo added by an owner must stay a mozo across logins —
  // and default a brand-new account to client.
  const existing = await prisma.user.findUnique({ where: { email } });
  const role = adminEmails().includes(email)
    ? "admin"
    : existing?.role === "mozo"
      ? "mozo"
      : "client";
  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  });

  const token = await createSessionToken({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  await logAudit({
    action: "auth.login",
    actor: { id: user.id, email: user.email },
    after: { role: user.role },
  });

  return { ok: true, data: { role: user.role } };
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) {
    await logAudit({ action: "auth.logout", actor: { id: user.id, email: user.email } });
  }
}
