"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ActionResult } from "@/lib/actions/auth";

const emailSchema = z.string().trim().toLowerCase().email();
const statusSchema = z.enum(["new", "contacted", "converted"]);

// Public: called from the landing page CTA form. Intentionally doesn't leak
// whether the email already exists — it just records interest.
export async function submitLead(rawEmail: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data;

  const existing = await prisma.clientLead.findFirst({ where: { email } });
  if (!existing) {
    await prisma.clientLead.create({ data: { email, source: "landing" } });
  }

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/admin/analytics");

  return { ok: true, data: undefined };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}

export async function updateLeadStatus(
  leadId: string,
  rawStatus: string
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  await prisma.clientLead.update({
    where: { id: leadId },
    data: { status: parsed.data },
  });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/admin/analytics");

  return { ok: true, data: undefined };
}
