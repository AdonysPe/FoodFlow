// GET /api/cron/billing/send-emails — lo dispara Vercel Cron (una vez al día).
// Protegido por CRON_SECRET; ver lib/api/cron.ts.
//
// Antes corría cada 15 minutos, pero el plan Hobby de Vercel solo admite
// crons diarios (un cron más frecuente hace fallar el deploy). Al pasar a
// Pro, subir la frecuencia en vercel.json.

import { runCronJob } from "@/lib/api/cron";
import { sendDocumentEmails } from "@/lib/billing/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) => runCronJob(request, sendDocumentEmails);
