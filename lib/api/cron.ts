// La puerta de los trabajos de fondo.
//
// Un cron de Vercel es un GET normal a una URL pública: sin comprobación,
// cualquiera que adivine la ruta puede disparar reintentos y correos. Así que
// se exige `CRON_SECRET`, que Vercel manda como `Authorization: Bearer <valor>`
// cuando la variable existe en el proyecto.
//
// FALLA CERRADO. Sin `CRON_SECRET` configurado, la ruta responde 503 y no
// ejecuta nada. Un despliegue con los jobs abiertos al mundo es peor que uno
// con los jobs apagados.
//
// Server only.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { JobReport } from "@/lib/billing/jobs";
import { logBilling } from "@/lib/api/respond";

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function runCronJob(
  request: Request,
  job: () => Promise<JobReport>
): Promise<Response> {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    logBilling("error", "cron.misconfigured", { reason: "CRON_SECRET ausente" });
    return NextResponse.json(
      { ok: false, error: "Los trabajos de fondo no están configurados en este despliegue." },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !tokenMatches(provided, expected)) {
    logBilling("warn", "cron.denied", {});
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const report = await job();
    logBilling(report.failed > 0 ? "warn" : "info", "cron.done", {
      job: report.job,
      scanned: report.scanned,
      processed: report.processed,
      failed: report.failed,
      skipped: report.skipped,
      ms: report.ms,
    });
    return NextResponse.json({ ok: true, data: report }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logBilling("error", "cron.threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof Error && err.stack) console.error(err.stack);
    return NextResponse.json({ ok: false, error: "El trabajo falló." }, { status: 500 });
  }
}
