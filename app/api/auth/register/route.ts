import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
import { seedDefaultCategories } from "@/lib/menu/seedCategories";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

const schema = z
  .object({
    restaurant_name: z.string().trim().min(2).max(80),
    email: z.email().trim().toLowerCase().max(255),
    password: passwordSchema,
    // Server-side belt-and-suspenders: the checkbox already blocks submit on
    // the client, but a bypassed client (or a direct API call) must not be
    // able to create an account without it. Ley 29733 puts the burden of
    // proving consent on us — see User.consentAt.
    consent: z
      .boolean()
      .refine((v) => v === true, "Debes aceptar los Términos y la Política de Privacidad."),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { ok: false, code: "csrf_failed", error: "Solicitud no válida." },
      { status: 403 }
    );
  }

  const limit = await rateLimit("register-ip", await callerIpHash(), {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." },
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

  const { restaurant_name, email, password } = parsed.data;
  const consentAt = new Date();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { ok: false, code: "email_exists", error: "Ese correo ya está registrado." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          role: "restaurant_owner",
          passwordHash,
          requiresPasswordSetup: false,
          sessionVersion: 1,
          consentAt,
        },
      });
      const restaurant = await tx.restaurant.create({
        data: { name: restaurant_name, ownerId: user.id },
      });
      await seedDefaultCategories(tx, restaurant.id);
      return { user, restaurant };
    });

    const token = await createSessionToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      sessionVersion: result.user.sessionVersion,
      restaurantId: result.restaurant.id,
    });
    await setSessionCookie(token);
    await logAudit({
      action: "auth.register",
      actor: { id: result.user.id, email: result.user.email },
      entity: "Restaurant",
      entityId: result.restaurant.id,
      restaurantId: result.restaurant.id,
    });

    return NextResponse.json(
      { ok: true, data: { role: result.user.role } },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { ok: false, code: "email_exists", error: "Ese correo ya está registrado." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "No pudimos crear la cuenta." },
      { status: 500 }
    );
  }
}
