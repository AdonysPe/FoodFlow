// What the social-media agent found, folded into the `prospects` table.
//
// The agent (scripts/prospecting/agente-redes.md, run every day from Adonis's
// PC) searches Instagram and Facebook for Lima venues, because that is where
// most of them publish their WhatsApp — Google and OpenStreetMap rarely have
// it. It writes a JSON file; `npm run prospects:import` hands it to
// importSocialProspects below.
//
// A venue already in the table — found by OpenStreetMap without a phone, say —
// is enriched in place, never duplicated, and keeps its pipeline (status,
// touches). Only facts it lacked are filled in.
//
// Server/CLI only.

import { z } from "zod";
import type { Prisma, Prospect } from "@prisma/client";
import { isChain, peruMobile, prospectScore, suggestedPlan } from "./score";

const handle = z.string().trim().max(200).nullish();

export const socialItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).nullish(),
  instagram: handle,
  facebook: handle,
  tiktok: handle,
  followers: z.number().int().min(0).nullish(),
  phone: z.string().trim().max(40).nullish(),
  website: z.string().trim().max(300).nullish(),
  category: z.string().trim().max(60).nullish(),
  segment: z.enum(["mesas", "cafe", "delivery", "menu"]),
  delivery: z.boolean().nullish(),
  dineIn: z.boolean().nullish(),
  isChain: z.boolean().nullish(),
  notes: z.string().trim().max(600).nullish(),
  opener: z.string().trim().max(900).nullish(),
  foundBy: z.string().trim().max(120).nullish(),
});

export const socialFileSchema = z.object({ items: z.array(socialItemSchema).max(200) });

export type SocialItem = z.infer<typeof socialItemSchema>;

export type ImportReport = {
  created: string[];
  updated: string[];
  skipped: { name: string; reason: string }[];
};

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** "@Barra_YAJY", "instagram.com/barra_yajy/?hl=es" → "barra_yajy". */
export function instagramHandle(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const fromUrl = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  const candidate = (fromUrl ?? text.replace(/^@/, "")).toLowerCase();
  if (["p", "reel", "reels", "popular", "explore", "stories"].includes(candidate)) return null;
  return /^[a-z0-9._]{1,30}$/.test(candidate) ? candidate : null;
}

/** A Facebook page as a full https URL, without tracking parameters. */
export function facebookUrl(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const path = text.match(/(?:facebook|fb)\.com\/([^?#\s]+)/i)?.[1] ?? (/^[A-Za-z0-9.\-]+$/.test(text) ? text : null);
  if (!path) return null;
  return `https://www.facebook.com/${path.replace(/\/+$/, "")}`;
}

/** The dedupe key for a venue the agent found: its Instagram, else its page, else its name. */
export function socialPlaceId(item: Pick<SocialItem, "name" | "district" | "instagram" | "facebook">): string {
  const ig = instagramHandle(item.instagram);
  if (ig) return `ig:${ig}`;
  const fb = facebookUrl(item.facebook);
  if (fb) return `fb:${fb.replace("https://www.facebook.com/", "").toLowerCase()}`;
  return `redes:${fold(item.name)}|${fold(item.district)}`;
}

function scoreFacts(item: SocialItem, existing?: Prospect) {
  const phone = existing?.mobile ? existing.phone : (item.phone ?? existing?.phone ?? null);
  return {
    name: existing?.name ?? item.name,
    segment: existing?.segment ?? item.segment,
    phone,
    rating: existing?.rating ?? null,
    reviewCount: existing?.reviewCount ?? null,
    website: existing?.website ?? item.website ?? null,
    delivery: existing?.delivery ?? item.delivery ?? null,
    dineIn: existing?.dineIn ?? item.dineIn ?? null,
    followers: item.followers ?? existing?.followers ?? null,
  };
}

/** The row for a venue nobody had found yet. */
export function createData(item: SocialItem): Prisma.ProspectCreateInput {
  const facts = scoreFacts(item);
  const chain = Boolean(item.isChain) || isChain(item.name);
  return {
    placeId: socialPlaceId(item),
    source: "redes",
    name: item.name,
    district: item.district,
    address: item.address ?? null,
    phone: item.phone ?? null,
    mobile: peruMobile(item.phone),
    website: item.website ?? null,
    category: item.category ?? null,
    segment: item.segment,
    delivery: item.delivery ?? null,
    dineIn: item.dineIn ?? null,
    instagram: instagramHandle(item.instagram),
    facebook: facebookUrl(item.facebook),
    tiktok: item.tiktok ?? null,
    followers: item.followers ?? null,
    notes: item.notes ?? null,
    opener: item.opener ?? null,
    isChain: chain,
    score: chain ? 0 : prospectScore(facts),
    suggestedPlan: suggestedPlan(facts),
    foundBy: item.foundBy ?? "Redes",
  };
}

/**
 * What the agent adds to a venue already in the table: its social profiles
 * and notes always (they are the agent's own), and the facts the row lacked.
 * Status and touches are never touched, and neither is a mobile it had.
 */
export function updateData(item: SocialItem, existing: Prospect): Prisma.ProspectUpdateInput {
  const facts = scoreFacts(item, existing);
  const mobile = existing.mobile ?? peruMobile(item.phone);
  const chain = existing.isChain || Boolean(item.isChain);
  return {
    phone: existing.mobile ? existing.phone : (item.phone ?? existing.phone),
    mobile,
    address: existing.address ?? item.address ?? null,
    website: existing.website ?? item.website ?? null,
    category: existing.category ?? item.category ?? null,
    delivery: existing.delivery ?? item.delivery ?? null,
    dineIn: existing.dineIn ?? item.dineIn ?? null,
    instagram: instagramHandle(item.instagram) ?? existing.instagram,
    facebook: facebookUrl(item.facebook) ?? existing.facebook,
    tiktok: item.tiktok ?? existing.tiktok,
    followers: item.followers ?? existing.followers,
    notes: item.notes ?? existing.notes,
    // A new opener only matters before the first message goes out.
    opener: existing.touches === 0 ? (item.opener ?? existing.opener) : existing.opener,
    isChain: chain,
    score: chain ? 0 : prospectScore(facts),
  };
}

type Db = {
  prospect: {
    findUnique(args: { where: { placeId: string } }): Promise<Prospect | null>;
    findFirst(args: { where: Prisma.ProspectWhereInput }): Promise<Prospect | null>;
    findMany(args: { where: Prisma.ProspectWhereInput; take?: number }): Promise<Prospect[]>;
    create(args: { data: Prisma.ProspectCreateInput }): Promise<Prospect>;
    update(args: { where: { id: string }; data: Prisma.ProspectUpdateInput }): Promise<Prospect>;
  };
};

/** The row this venue already is, if any: same key, same Instagram, or the same name in the same district. */
async function findExisting(db: Db, item: SocialItem): Promise<Prospect | null> {
  const byKey = await db.prospect.findUnique({ where: { placeId: socialPlaceId(item) } });
  if (byKey) return byKey;
  const ig = instagramHandle(item.instagram);
  if (ig) {
    const byIg = await db.prospect.findFirst({ where: { instagram: ig } });
    if (byIg) return byIg;
  }
  const sameDistrict = await db.prospect.findMany({ where: { district: item.district }, take: 2000 });
  const matches = sameDistrict.filter((p) => fold(p.name) === fold(item.name));
  return matches.length === 1 ? matches[0] : null;
}

export async function importSocialProspects(db: Db, items: SocialItem[]): Promise<ImportReport> {
  const report: ImportReport = { created: [], updated: [], skipped: [] };
  for (const item of items) {
    if (!instagramHandle(item.instagram) && !facebookUrl(item.facebook) && !peruMobile(item.phone)) {
      report.skipped.push({ name: item.name, reason: "sin Instagram, Facebook ni celular" });
      continue;
    }
    const existing = await findExisting(db, item);
    if (existing) {
      await db.prospect.update({ where: { id: existing.id }, data: updateData(item, existing) });
      report.updated.push(existing.name);
    } else {
      await db.prospect.create({ data: createData(item) });
      report.created.push(item.name);
    }
  }
  return report;
}

/** What the agent should not search again: every handle and name already in the table for these districts. */
export async function knownProspects(db: Db, districts: string[]) {
  const rows = await db.prospect.findMany({ where: { district: { in: districts } }, take: 5000 });
  return {
    instagram: rows.map((r) => r.instagram).filter((h): h is string => Boolean(h)),
    names: rows.map((r) => ({ name: r.name, district: r.district, status: r.status, hasMobile: Boolean(r.mobile), hasInstagram: Boolean(r.instagram) })),
  };
}
