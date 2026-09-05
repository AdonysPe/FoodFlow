// GET /api/cron/billing/backup-cdrs — lo dispara Vercel Cron (cada 24 horas).
// Protegido por CRON_SECRET; ver lib/api/cron.ts.

import { runCronJob } from "@/lib/api/cron";
import { backupCDRs } from "@/lib/billing/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) => runCronJob(request, backupCDRs);
