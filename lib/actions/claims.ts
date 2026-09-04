"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Virtual complaints book (Libro de Reclamaciones) — the record every supplier
 * selling to consumers in Peru has to keep.
 *
 * Two rules shape this file. The entry must be stored before anything else can
 * fail, because an unrecorded complaint is the violation. And the consumer must
 * walk away with a correlative number: it is their proof that the clock started.
 */
export type ClaimResult =
  | { ok: true; code: string; date: string }
  | { ok: false; code: "invalid" | "rate_limited" | "server" };

/**
 * Generous on purpose. This limiter exists to stop a script, not a person
 * having a bad day — turning away a real complaint is the worse failure.
 */
const MAX_PER_HOUR = 5;

const schema = z.object({
  nombre: z.string().trim().min(3).max(80),
  // DNI is 8 digits; carné de extranjería runs longer, so the field accepts
  // both rather than turning away a foreign resident.
  dni: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => /^[0-9A-Za-z]{8,12}$/.test(v), "Documento no válido"),
  telefono: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 6 && v.length <= 15, "Teléfono no válido"),
  email: z.string().trim().max(120).email(),
  direccion: z.string().trim().min(5).max(180),
  kind: z.enum(["reclamo", "queja"]),
  detalle: z.string().trim().min(20).max(3000),
  pedido: z
    .union([z.literal(""), z.string().trim().max(1500)])
    .optional()
    .transform((v) => (v ? v : undefined)),
  // Honeypot: invisible to a person, so anything in it is a bot.
  website: z.string().max(200).optional(),
});

export type ClaimInput = z.input<typeof schema>;

/**
 * `LR-2026-000012`. Counted per calendar year so the sequence stays short and
 * readable over the phone; the unique index is the real guarantee, and a
 * collision (two people submitting in the same instant) just retries.
 */
async function nextCode(): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const count = await prisma.claim.count({ where: { createdAt: { gte: yearStart } } });
  return `LR-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function submitClaim(input: ClaimInput): Promise<ClaimResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const data = parsed.data;

  // A filled honeypot gets the same shape of answer a person gets, with a
  // code that leads nowhere — the bot learns nothing and nothing is stored.
  if (data.website && data.website.trim() !== "") {
    return { ok: true, code: "LR-0000-000000", date: new Date().toISOString() };
  }

  const ipHash = await callerIpHash();
  const limit = await rateLimit("claims-ip", ipHash, {
    max: MAX_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return { ok: false, code: "rate_limited" };

  // Retry only the correlative: two submissions in the same second can land on
  // the same count, and the unique index is what catches it.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const claim = await prisma.claim.create({
        data: {
          code: await nextCode(),
          nombre: data.nombre,
          dni: data.dni.toUpperCase(),
          telefono: data.telefono,
          email: data.email.toLowerCase(),
          direccion: data.direccion,
          kind: data.kind,
          detalle: data.detalle,
          pedido: data.pedido ?? null,
          ipHash,
        },
      });
      return { ok: true, code: claim.code, date: claim.createdAt.toISOString() };
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!collision) return { ok: false, code: "server" };
    }
  }

  return { ok: false, code: "server" };
}
