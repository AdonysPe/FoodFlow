// GET /api/cron/prospects — búsqueda diaria de restaurantes en Google Maps
// (Vercel Cron). Protegido por CRON_SECRET; ver lib/api/cron.ts.
//
// Cada día corre su tajada de la rotación (lib/prospecting/searches.ts):
// - con GOOGLE_PLACES_API_KEY: 5 búsquedas × 2 páginas = hasta 10 solicitudes
//   a Google; toda Lima vuelve a pasar cada ~24 días.
// - sin ella: 2 distritos enteros de OpenStreetMap (gratis); toda Lima cada
//   10 días.
// Antes de eso, si está configurada, lee la hoja del agente de búsqueda
// (lib/prospecting/sheet.ts) y trae lo que haya agregado.

import { runCronJob } from "@/lib/api/cron";
import { placesKey } from "@/lib/prospecting/places";
import { CRON_OSM_DISTRICTS_PER_DAY, CRON_SEARCHES_PER_DAY, dailyDistricts, dailySlice } from "@/lib/prospecting/searches";
import { mergeResults, syncOsmDistricts, syncQueries, syncSheet, toJobReport, type SyncResult } from "@/lib/prospecting/sync";
import { sheetConfig } from "@/lib/prospecting/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGES = 2;

export const GET = (request: Request) =>
  runCronJob(request, async () => {
    const startedAt = Date.now();
    const sheet: SyncResult | null = sheetConfig() ? await syncSheet() : null;
    const map = placesKey()
      ? await syncQueries(dailySlice(new Date(), CRON_SEARCHES_PER_DAY), PAGES)
      : await syncOsmDistricts(dailyDistricts(new Date(), CRON_OSM_DISTRICTS_PER_DAY));
    const job = `prospects.${sheet ? "sheet+" : ""}${placesKey() ? "google" : "osm"}`;
    return toJobReport(job, sheet ? mergeResults(sheet, map) : map, startedAt);
  });
