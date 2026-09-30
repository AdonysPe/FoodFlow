// GET /api/cron/subscriptions — mantenimiento diario de suscripciones (Vercel
// Cron). Protegido por CRON_SECRET; ver lib/api/cron.ts y
// lib/subscriptions/maintenance.ts.

import { runCronJob } from "@/lib/api/cron";
import { runSubscriptionMaintenance } from "@/lib/subscriptions/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) => runCronJob(request, () => runSubscriptionMaintenance());
