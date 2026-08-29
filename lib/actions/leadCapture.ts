"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { leadScore, normalizeWhatsApp } from "@/lib/leads/validation";

/**
 * Result codes, not sentences: the landing runs in two languages and the
 * copy belongs to the dictionary. The client maps the code to its text.
 */
export type LeadResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "rate_limited" | "server" };

/** Three saved leads per address per hour is far above any honest visitor. */
const MAX_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

const schema = z.object({
  nombre: z.string().trim().min(2).max(60),
  restaurante: z.string().trim().min(2).max(80),
  whatsapp: z
    .string()
    .transform(normalizeWhatsApp)
    .refine((v) => /^9\d{8}$/.test(v), "Peru mobile, 9 digits"),
  email: z
    .union([z.literal(""), z.string().trim().max(120).email()])
    .optional()
    .transform((v) => (v ? v : undefined)),
  source: z.enum(["web_form", "calculadora", "whatsapp"]),
  perdidaMensual: z.number().int().min(0).max(10_000_000).nullish(),
  perdidaAnual: z.number().int().min(0).max(100_000_000).nullish(),
  // Honeypot: a field no human ever sees, so anything in it is a bot.
  website: z.string().max(200).optional(),
});

export type LeadInput = z.input<typeof schema>;

/**
 * A salted hash of the caller's address.
 *
 * The counting has to survive a cold start — an in-memory map does not, and
 * under `next dev` it is wiped between requests — so the window is counted
 * over the rows themselves. Hashing means the table never holds an IP, and
 * without AUTH_SECRET the hash cannot be reversed by whoever reads the data.
 */
async function callerHash(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (h.get("x-real-ip") ?? "unknown");
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? "foodflow"}:${ip}`)
    .digest("hex");
}

export async function submitLeadCapture(input: LeadInput): Promise<LeadResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const data = parsed.data;

  // A filled honeypot gets the answer a person gets: the bot learns nothing
  // from the response, and nothing reaches the table.
  if (data.website && data.website.trim() !== "") return { ok: true };

  const ipHash = await callerHash();
  const perdidaAnual = data.perdidaAnual ?? null;

  try {
    const recent = await prisma.lead.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
    });
    if (recent >= MAX_PER_HOUR) return { ok: false, code: "rate_limited" };

    await prisma.lead.create({
      data: {
        nombre: data.nombre,
        restaurante: data.restaurante,
        whatsapp: data.whatsapp,
        email: data.email ?? null,
        source: data.source,
        perdidaMensual: data.perdidaMensual ?? null,
        perdidaAnual,
        score: leadScore(perdidaAnual),
        status: "nuevo",
        ipHash,
      },
    });
  } catch {
    return { ok: false, code: "server" };
  }

  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/admin/overview");

  return { ok: true };
}
