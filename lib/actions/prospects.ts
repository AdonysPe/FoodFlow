"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/actions/auth";
import { placesKey } from "@/lib/prospecting/places";
import { DISTRICTS, queriesFor, type Segment } from "@/lib/prospecting/searches";
import { syncOsmDistricts, syncQueries, syncSheet, type SyncResult } from "@/lib/prospecting/sync";
import { sheetConfig } from "@/lib/prospecting/sheet";
import { MAX_TOUCHES, TEMPLATE_KEYS, type Variant } from "@/lib/prospecting/message";

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

/** "Importar hoja ahora": the agent's sheet, read once, outside the cron. */
export async function importSheetNow(): Promise<ActionResult<SyncResult>> {
  const admin = await requirePlatformAdmin();
  if (!sheetConfig()) return { ok: false, error: "La hoja no está configurada en el servidor." };

  const result = await syncSheet();

  await logAudit({
    action: "prospects.search",
    actor: { id: admin.id, email: admin.email },
    entity: "Prospect",
    after: { source: "sheet", created: result.created, updated: result.updated, errors: result.errors.length },
  });

  revalidatePath(PAGE);
  if (result.errors.length > 0 && result.found === 0) return { ok: false, error: result.errors[0] };
  return { ok: true, data: result };
}

const variantSchema = z.enum(["agente", "A", "B"]);

/**
 * The admin tapped "Enviar por WhatsApp": the chat opened with the draft in
 * it. Sending happens in WhatsApp, out of our sight, so this records the
 * intent — one more touch, now — which is what schedules the follow-up. The
 * first message also records which version went out.
 */
export async function recordProspectMessage(prospectId: string, rawVariant?: string): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const existing = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!existing) return { ok: false, error: "Prospecto no encontrado." };
  if (existing.status !== "nuevo" && existing.status !== "contactado") {
    return { ok: false, error: "Este prospecto ya no está en la secuencia de mensajes." };
  }
  if (existing.touches >= MAX_TOUCHES) return { ok: false, error: "Ya se enviaron los tres mensajes." };

  const variant = variantSchema.safeParse(rawVariant);
  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      status: "contactado",
      touches: { increment: 1 },
      lastTouchAt: new Date(),
      ...(existing.touches === 0 && variant.success ? { variant: variant.data satisfies Variant } : {}),
    },
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

const templatesSchema = z.record(z.string(), z.string().max(2000));

/**
 * The editable WhatsApp templates. A blank field goes back to the default,
 * which is a deleted row — the table only ever holds what was changed.
 */
export async function saveProspectTemplates(raw: Record<string, string>): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = templatesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Algún mensaje es demasiado largo (máximo 2000 caracteres)." };

  const entries = TEMPLATE_KEYS.map((key) => [key, (parsed.data[key] ?? "").trim()] as const);
  await prisma.$transaction(
    entries.map(([key, body]) =>
      body ? prisma.prospectTemplate.upsert({ where: { key }, create: { key, body }, update: { body } }) : prisma.prospectTemplate.deleteMany({ where: { key } })
    )
  );

  await logAudit({
    action: "prospects.templates",
    actor: { id: admin.id, email: admin.email },
    entity: "ProspectTemplate",
    after: { changed: entries.filter(([, body]) => body).map(([key]) => key) },
  });

  revalidatePath(PAGE);
  return { ok: true, data: undefined };
}
