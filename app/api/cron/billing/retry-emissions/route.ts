// GET /api/cron/billing/retry-emissions — lo dispara Vercel Cron (cada 10 minutos).
// Protegido por CRON_SECRET; ver lib/api/cron.ts.

import { runCronJob } from "@/lib/api/cron";
import { retryFailedEmissions } from "@/lib/billing/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) => runCronJob(request, retryFailedEmissions);
