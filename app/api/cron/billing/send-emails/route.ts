// GET /api/cron/billing/send-emails — lo dispara Vercel Cron (cada 15 minutos).
// Protegido por CRON_SECRET; ver lib/api/cron.ts.

import { runCronJob } from "@/lib/api/cron";
import { sendDocumentEmails } from "@/lib/billing/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) => runCronJob(request, sendDocumentEmails);
