"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { callerIpHash } from "@/lib/security/clientHash";
import { logAudit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/actions/auth";

const emailSchema = z.string().trim().toLowerCase().email();
const statusSchema = z.enum(["new", "contacted", "converted"]);

// Well above any honest visitor: this is the chat's "email me instead" escape
// hatch, not a form. Counted over the rows themselves so it survives a cold
// start, keyed by a salted hash of the caller's IP (never the address).
const MAX_LEADS_PER_IP_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

// Public: called from the landing chat widget. Intentionally doesn't leak
// whether the email already exists — it just records interest.
export async function submitLead(rawEmail: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  const ipHash = await callerIpHash();
  const recent = await prisma.clientLead.count({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
  });
  if (recent >= MAX_LEADS_PER_IP_PER_HOUR) {
    return { ok: false, error: "Too many requests. Try again later." };
  }

  const existing = await prisma.clientLead.findFirst({ where: { email } });
  if (!existing) {
    await prisma.clientLead.create({ data: { email, source: "landing", ipHash } });
  }

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/admin/analytics");

  return { ok: true, data: undefined };
}

export async function updateLeadStatus(
  leadId: string,
  rawStatus: string
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const existing = await prisma.clientLead.findUnique({ where: { id: leadId } });

  await prisma.clientLead.update({
    where: { id: leadId },
    data: { status: parsed.data },
  });

  await logAudit({
    action: "lead.status_change",
    actor: { id: admin.id, email: admin.email },
    entity: "ClientLead",
    entityId: leadId,
    before: { status: existing?.status },
    after: { status: parsed.data },
  });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/admin/analytics");

  return { ok: true, data: undefined };
}
