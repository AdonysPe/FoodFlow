// GET /api/cron/prospects — búsqueda diaria de restaurantes en Google Maps
// (Vercel Cron). Protegido por CRON_SECRET; ver lib/api/cron.ts.
//
// Cada día corre su tajada de la rotación (lib/prospecting/searches.ts):
// - con GOOGLE_PLACES_API_KEY: 5 búsquedas × 2 páginas = hasta 10 solicitudes
//   a Google; toda Lima vuelve a pasar cada ~24 días.
// - sin ella: 2 distritos enteros de OpenStreetMap (gratis); toda Lima cada
//   10 días.

import { runCronJob } from "@/lib/api/cron";
import { placesKey } from "@/lib/prospecting/places";
import { CRON_OSM_DISTRICTS_PER_DAY, CRON_SEARCHES_PER_DAY, dailyDistricts, dailySlice } from "@/lib/prospecting/searches";
import { syncOsmDistricts, syncQueries, toJobReport } from "@/lib/prospecting/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGES = 2;

export const GET = (request: Request) =>
  runCronJob(request, async () => {
    const startedAt = Date.now();
    if (!placesKey()) {
      const result = await syncOsmDistricts(dailyDistricts(new Date(), CRON_OSM_DISTRICTS_PER_DAY));
      return toJobReport("prospects.osm", result, startedAt);
    }
    const result = await syncQueries(dailySlice(new Date(), CRON_SEARCHES_PER_DAY), PAGES);
    return toJobReport("prospects.google", result, startedAt);
  });
