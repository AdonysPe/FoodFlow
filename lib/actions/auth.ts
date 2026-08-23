"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { sendOTP } from "@/lib/email/mailer";
import { checkOtpRequestRateLimit } from "@/lib/auth/rateLimit";
import {
  generateOtp,
  hashOtp,
  maxOtpAttempts,
  otpExpiryDate,
  verifyOtpHash,
} from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

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
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  const rateLimit = await checkOtpRequestRateLimit(email);
  if (!rateLimit.ok) return { ok: false, error: rateLimit.reason };

  const code = generateOtp();

  // Invalidate any still-pending codes so only the newest one is usable.
  await prisma.oTPCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.oTPCode.create({
    data: { email, code: hashOtp(code), expiresAt: otpExpiryDate() },
  });

  await sendOTP(email, code);

  return { ok: true, data: undefined };
}

export async function verifyOtp(
  rawEmail: string,
  rawCode: string
): Promise<ActionResult<{ role: "admin" | "client" }>> {
  const emailParsed = emailSchema.safeParse(rawEmail);
  const codeParsed = codeSchema.safeParse(rawCode);
  if (!emailParsed.success || !codeParsed.success) {
    return { ok: false, error: "Enter a valid email and 6-digit code." };
  }
  const email = emailParsed.data;
  const code = codeParsed.data;

  const otp = await prisma.oTPCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "That code has expired. Request a new one." };
  }

  if (otp.attempts >= maxOtpAttempts()) {
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }

  if (!verifyOtpHash(code, otp.code)) {
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  await prisma.oTPCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  const role = adminEmails().includes(email) ? "admin" : "client";
  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  });

  const token = await createSessionToken({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  return { ok: true, data: { role: user.role } };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}
