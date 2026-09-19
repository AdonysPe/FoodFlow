"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { callerIpHash } from "@/lib/security/clientHash";
import { logAudit } from "@/lib/audit/log";
import { leadScore, normalizeWhatsApp } from "@/lib/leads/validation";
import type { ActionResult } from "@/lib/actions/auth";

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
  // Ley 29733 puts the burden of proving consent on us, so the box has to be
  // ticked for the row to exist at all — a lead without it is not a lead we
  // are allowed to contact.
  consent: z.literal(true),
  perdidaMensual: z.number().int().min(0).max(10_000_000).nullish(),
  perdidaAnual: z.number().int().min(0).max(100_000_000).nullish(),
  // Honeypot: a field no human ever sees, so anything in it is a bot.
  website: z.string().max(200).optional(),
});

export type LeadInput = z.input<typeof schema>;

export async function submitLeadCapture(input: LeadInput): Promise<LeadResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const data = parsed.data;

  // A filled honeypot gets the answer a person gets: the bot learns nothing
  // from the response, and nothing reaches the table.
  if (data.website && data.website.trim() !== "") return { ok: true };

  const ipHash = await callerIpHash();
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
        // The moment the box was ticked — what we would show if anyone ever
        // asks us to prove this person agreed to be contacted.
        consentAt: new Date(),
        ipHash,
      },
    });
  } catch {
    return { ok: false, code: "server" };
  }

  revalidatePath("/dashboard/admin/contactos");
  revalidatePath("/dashboard/admin/overview");

  return { ok: true };
}

// The by-hand pipeline the operator works the funnel through. Spanish on
// purpose — the values are read straight off the admin table.
const pipelineSchema = z.enum([
  "nuevo",
  "contactado",
  "cita",
  "cliente",
  "archivado",
]);

/**
 * Admin-only: move a form lead along the pipeline from the Contactos table.
 * Mirrors `updateLeadStatus` (the ClientLead one) — guarded, audited, and it
 * revalidates every page that shows a lead count.
 */
export async function updateLeadPipeline(
  leadId: string,
  rawStatus: string
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = pipelineSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Estado inválido." };

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) return { ok: false, error: "Contacto no encontrado." };

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: parsed.data },
  });

  await logAudit({
    action: "lead.status_change",
    actor: { id: admin.id, email: admin.email },
    entity: "Lead",
    entityId: leadId,
    before: { status: existing.status },
    after: { status: parsed.data },
  });

  revalidatePath("/dashboard/admin/contactos");
  revalidatePath("/dashboard/admin/overview");

  return { ok: true, data: undefined };
}
