import { createHash } from "node:crypto";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCsrf } from "@/lib/auth/csrf";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/auth/otp";
import { sendPasswordResetOTP } from "@/lib/email/mailer";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const schema = z.object({ email: z.email().trim().toLowerCase().max(255) }).strict();
const genericResponse = () =>
  NextResponse.json(
    { ok: true, data: { message: "Si el correo existe, recibirás un código de 6 dígitos." } },
    { headers: { "Cache-Control": "no-store" } }
  );

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { ok: false, code: "csrf_failed", error: "Solicitud no válida." },
      { status: 403 }
    );
  }

  const ipLimit = await rateLimit("password-reset-ip", await callerIpHash(), {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Escribe un correo válido." },
      { status: 400 }
    );
  }

  const email = parsed.data.email;
  const emailKey = createHash("sha256").update(email).digest("hex");
  const emailLimit = await rateLimit("password-reset-email", emailKey, {
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!emailLimit.ok) return genericResponse();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return genericResponse();

  const code = generateOtp();
  const verificationCode = hashOtp(code);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode,
      verificationCodeExpiresAt: otpExpiryDate(),
      passwordResetAttempts: 0,
    },
  });

  try {
    await sendPasswordResetOTP(email, code);
  } catch {
    await prisma.user.updateMany({
      where: { id: user.id, verificationCode },
      data: { verificationCode: null, verificationCodeExpiresAt: null },
    });
  }

  return genericResponse();
}
