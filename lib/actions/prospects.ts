"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/actions/auth";
import { placesKey } from "@/lib/prospecting/places";
import { DISTRICTS, queriesFor, type Segment } from "@/lib/prospecting/searches";
import { syncOsmDistricts, syncQueries, type SyncResult } from "@/lib/prospecting/sync";
import { MAX_TOUCHES } from "@/lib/prospecting/message";

const PAGE = "/dashboard/admin/prospeccion";

const searchSchema = z.object({
  source: z.enum(["osm", "google"]),
  district: z.enum(DISTRICTS as [string, ...string[]]),
  segment: z.enum(["mesas", "cafe", "delivery", "menu"]),
});

/**
 * "Buscar ahora", from either source:
 * - OpenStreetMap: the whole district in one free request; the kind of venue
 *   is read off each place, so `segment` is ignored.
 * - Google: one district × one kind of venue, all three pages of each term.
 *   At most 9 billed requests (mesas has three terms), so a stray double
 *   click costs cents.
 */
export async function searchProspectsNow(source: string, district: string, segment: string): Promise<ActionResult<SyncResult>> {
  const admin = await requirePlatformAdmin();

  const parsed = searchSchema.safeParse({ source, district, segment });
  if (!parsed.success) return { ok: false, error: "Elige una fuente, un distrito y un tipo de local." };
  if (parsed.data.source === "google" && !placesKey()) return { ok: false, error: "Falta la clave GOOGLE_PLACES_API_KEY en el servidor." };

  const result =
    parsed.data.source === "osm"
      ? await syncOsmDistricts([parsed.data.district])
      : await syncQueries(queriesFor(parsed.data.district, parsed.data.segment as Segment), 3);

  await logAudit({
    action: "prospects.search",
    actor: { id: admin.id, email: admin.email },
    entity: "Prospect",
    after: { ...parsed.data, created: result.created, updated: result.updated, requests: result.requests, errors: result.errors.length },
  });

  revalidatePath(PAGE);
  if (result.errors.length > 0 && result.found === 0) return { ok: false, error: result.errors[0] };
  return { ok: true, data: result };
}

/**
 * The admin tapped "Enviar por WhatsApp": the chat opened with the draft in
 * it. Sending happens in WhatsApp, out of our sight, so this records the
 * intent — one more touch, now — which is what schedules the follow-up.
 */
export async function recordProspectMessage(prospectId: string): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const existing = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!existing) return { ok: false, error: "Prospecto no encontrado." };
  if (existing.status !== "nuevo" && existing.status !== "contactado") {
    return { ok: false, error: "Este prospecto ya no está en la secuencia de mensajes." };
  }
  if (existing.touches >= MAX_TOUCHES) return { ok: false, error: "Ya se enviaron los tres mensajes." };

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: "contactado", touches: { increment: 1 }, lastTouchAt: new Date() },
  });

  await logAudit({
    action: "prospect.message",
    actor: { id: admin.id, email: admin.email },
    entity: "Prospect",
    entityId: prospectId,
    before: { status: existing.status, touches: existing.touches },
    after: { status: "contactado", touches: existing.touches + 1 },
  });

  revalidatePath(PAGE);
  return { ok: true, data: undefined };
}

const statusSchema = z.enum(["nuevo", "contactado", "respondio", "cliente", "descartado"]);

export async function updateProspectStatus(prospectId: string, rawStatus: string): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Estado inválido." };

  const existing = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!existing) return { ok: false, error: "Prospecto no encontrado." };

  await prisma.prospect.update({ where: { id: prospectId }, data: { status: parsed.data } });

  await logAudit({
    action: "prospect.status_change",
    actor: { id: admin.id, email: admin.email },
    entity: "Prospect",
    entityId: prospectId,
    before: { status: existing.status },
    after: { status: parsed.data },
  });

  revalidatePath(PAGE);
  return { ok: true, data: undefined };
}
