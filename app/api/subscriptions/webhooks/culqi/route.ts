// POST /api/subscriptions/webhooks/culqi — notificaciones de Culqi sobre las
// suscripciones de FoodFlow (lo que cada restaurante nos paga).
//
// Se configura en CulqiPanel > Eventos > Webhook con el secreto
// CULQI_WEBHOOK_SECRET. Culqi no publica un esquema de firma: el aviso se
// autentica con ese secreto y el evento se vuelve a leer desde la API de
// Culqi antes de tocar nada. Ver lib/subscriptions/webhooks.ts.

import { NextResponse } from "next/server";
import { receiveCulqiWebhook } from "@/lib/subscriptions/webhooks";
import { logSubscription } from "@/lib/subscriptions/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const reply = await receiveCulqiWebhook(request);
    return NextResponse.json(reply.body, {
      status: reply.status,
      headers: { "cache-control": "no-store", ...(reply.status === 503 ? { "retry-after": "60" } : {}) },
    });
  } catch (error) {
    logSubscription("error", "webhook.crashed", { error: String(error).slice(0, 200) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
