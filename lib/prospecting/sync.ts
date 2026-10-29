// Folds what a source found into the `prospects` table. Shared by the daily
// cron and the admin's "Buscar ahora", for both sources: Google Places
// (search terms) and OpenStreetMap (a whole district at once).
//
// A place already in the table keeps its pipeline (status, touches): only the
// facts the source owns are refreshed, so a re-run never resurrects a
// prospect that was discarded or re-sends to one already contacted.
//
// Server only.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { JobReport } from "@/lib/billing/jobs";
import { searchPlaces, PlacesError, type Place } from "./places";
import { fetchOsmDistrict } from "./osm";
import { fetchSheetValues, parseSheet, sheetConfig, type SheetLead } from "./sheet";
import { districtFromAddress, queryLabel, queryText, type SearchQuery, type Segment } from "./searches";
import { isChain, peruMobile, prospectScore, suggestedPlan } from "./score";

export type SyncResult = {
  found: number;
  created: number;
  updated: number;
  requests: number;
  errors: string[];
};

type Found = {
  place: Place;
  segment: Segment;
  district: string;
  foundBy: string;
  source: "google" | "osm" | "sheet";
  // Only the agent's sheet brings these; a Google or OSM refresh never
  // overwrites them.
  extras?: Pick<SheetLead, "notes" | "customMessage" | "customFollowUp" | "initialStatus" | "scoreBoost">;
};

// Updates go out in transactions of this size: a district from OpenStreetMap
// can be 600 rows, and one statement per round trip would not fit the
// function's time.
const UPDATE_CHUNK = 100;

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function factsOf(found: Found) {
  const { place } = found;
  const facts = {
    name: place.name,
    segment: found.segment,
    phone: place.phone,
    rating: place.rating,
    reviewCount: place.reviewCount,
    website: place.website,
    delivery: place.delivery,
    dineIn: place.dineIn,
  };
  const chain = place.chain || isChain(place.name);
  const boost = found.extras?.scoreBoost ?? 0;
  return {
    facts,
    data: {
      name: place.name,
      district: found.district,
      address: place.address,
      phone: place.phone,
      mobile: peruMobile(place.phone),
      website: place.website,
      mapsUrl: place.mapsUrl,
      category: place.category,
      rating: place.rating,
      reviewCount: place.reviewCount,
      delivery: place.delivery,
      dineIn: place.dineIn,
      score: chain ? 0 : Math.max(0, Math.min(100, prospectScore(facts) + boost)),
      isChain: chain,
      ...(found.extras ? { notes: found.extras.notes, customMessage: found.extras.customMessage, customFollowUp: found.extras.customFollowUp } : {}),
    },
  };
}

async function save(batch: Found[], result: SyncResult): Promise<void> {
  // The same place can come back from two terms in one run.
  const unique = [...new Map(batch.filter((f) => f.place.open).map((f) => [f.place.id, f])).values()];
  result.found += unique.length;
  if (unique.length === 0) return;

  const existing = await prisma.prospect.findMany({
    where: { placeId: { in: unique.map((f) => f.place.id) } },
    select: { id: true, placeId: true },
  });
  const byPlace = new Map(existing.map((e) => [e.placeId, e.id]));

  // A Google or sheet result for a venue first found on OpenStreetMap
  // upgrades that row (same name, same district) instead of creating a twin,
  // and keeps whatever was already done with it.
  const osmTwins = new Map<string, string>();
  const richerNew = unique.filter((f) => f.source !== "osm" && !byPlace.has(f.place.id));
  if (richerNew.length > 0) {
    const candidates = await prisma.prospect.findMany({
      where: { source: "osm", district: { in: [...new Set(richerNew.map((f) => f.district))] } },
      select: { id: true, name: true, district: true },
    });
    for (const c of candidates) osmTwins.set(`${fold(c.name)}|${c.district}`, c.id);
  }

  const updates: { id: string; data: Prisma.ProspectUpdateInput }[] = [];
  const creates: Prisma.ProspectCreateManyInput[] = [];

  for (const found of unique) {
    const { facts, data } = factsOf(found);
    const id = byPlace.get(found.place.id);
    if (id) {
      updates.push({ id, data });
      continue;
    }
    const twin = found.source !== "osm" ? osmTwins.get(`${fold(found.place.name)}|${found.district}`) : undefined;
    if (twin) {
      updates.push({ id: twin, data: { ...data, placeId: found.place.id, source: found.source } });
      osmTwins.delete(`${fold(found.place.name)}|${found.district}`);
      continue;
    }
    creates.push({
      ...data,
      placeId: found.place.id,
      source: found.source,
      segment: found.segment,
      suggestedPlan: suggestedPlan(facts),
      foundBy: found.foundBy,
      // A chain is kept (so it is never fetched as "new" again) but starts
      // out of the way. A sheet row the agent already worked keeps its
      // stage; a first message counted then schedules the follow-up.
      status: data.isChain ? "descartado" : (found.extras?.initialStatus ?? "nuevo"),
      ...(found.extras && found.extras.initialStatus !== "nuevo" && !data.isChain ? { touches: 1, lastTouchAt: new Date() } : {}),
    });
  }

  if (creates.length > 0) {
    const { count } = await prisma.prospect.createMany({ data: creates, skipDuplicates: true });
    result.created += count;
  }
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK);
    await prisma.$transaction(chunk.map((u) => prisma.prospect.update({ where: { id: u.id }, data: u.data })));
    result.updated += chunk.length;
  }
}

function emptyResult(): SyncResult {
  return { found: 0, created: 0, updated: 0, requests: 0, errors: [] };
}

/** Google Places: each query is a term in a district, up to `maxPages` pages. */
export async function syncQueries(queries: SearchQuery[], maxPages: number): Promise<SyncResult> {
  const result = emptyResult();

  for (const query of queries) {
    try {
      const search = await searchPlaces(queryText(query), maxPages);
      result.requests += search.requests;
      await save(
        search.places.map((place) => ({
          place,
          segment: query.segment,
          district: districtFromAddress(place.address, query.district),
          foundBy: queryLabel(query),
          source: "google" as const,
        })),
        result
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      result.errors.push(`${queryLabel(query)}: ${message}`);
      // A bad key, a disabled API or missing billing fails every query the
      // same way: stop instead of spending the run on identical errors.
      if (err instanceof PlacesError && [0, 400, 401, 403].includes(err.status)) break;
    }
  }

  return result;
}

/** OpenStreetMap: every eating place in each district, one request apiece. */
export async function syncOsmDistricts(districts: string[]): Promise<SyncResult> {
  const result = emptyResult();

  for (const district of districts) {
    try {
      const places = await fetchOsmDistrict(district);
      result.requests += 1;
      await save(
        places.map(({ segment, ...place }) => ({ place, segment, district, foundBy: `OpenStreetMap · ${district}`, source: "osm" as const })),
        result
      );
    } catch (err) {
      result.errors.push(`${district}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  return result;
}

/** The agent's sheet: every row of the configured tab. One read. */
export async function syncSheet(): Promise<SyncResult> {
  const result = emptyResult();
  const config = sheetConfig();
  if (!config) {
    result.errors.push("La hoja no está configurada (GOOGLE_SHEETS_SERVICE_ACCOUNT y PROSPECTS_SHEET_ID).");
    return result;
  }
  try {
    const leads = parseSheet(await fetchSheetValues(config));
    result.requests += 1;
    await save(
      leads.map(({ place, segment, district, ...extras }) => ({ place, segment, district, foundBy: `Hoja del agente · ${config.tab}`, source: "sheet" as const, extras })),
      result
    );
  } catch (err) {
    result.errors.push(`Hoja: ${err instanceof Error ? err.message : "Error desconocido"}`);
  }
  return result;
}

/** Adds one run's counts to another's, for a cron that runs several sources. */
export function mergeResults(a: SyncResult, b: SyncResult): SyncResult {
  return {
    found: a.found + b.found,
    created: a.created + b.created,
    updated: a.updated + b.updated,
    requests: a.requests + b.requests,
    errors: [...a.errors, ...b.errors],
  };
}

export function toJobReport(job: string, result: SyncResult, startedAt: number): JobReport {
  return {
    job,
    scanned: result.found,
    processed: result.created,
    failed: result.errors.length,
    skipped: result.updated,
    ms: Date.now() - startedAt,
    notes: [`${result.requests} solicitudes`, ...result.errors],
  };
}
