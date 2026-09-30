import { NextResponse } from "next/server";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientErrorPayload = {
  name?: unknown;
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  path?: unknown;
};

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(origin && host && new URL(origin).host === host);
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // A browser reports a crash once or twice; a script could post this all
  // day into the ops webhook. The Origin check above is not a defence against
  // anything but a browser, so the volume is bounded per caller too.
  const limit = await rateLimit("client-error", await callerIpHash(), { max: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let body: ClientErrorPayload;
  try {
    body = (await request.json()) as ClientErrorPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = {
    source: "foodflow.global-error",
    timestamp: new Date().toISOString(),
    name: text(body.name, 120),
    message: text(body.message, 1_000),
    stack: text(body.stack, 6_000),
    digest: text(body.digest, 200),
    path: text(body.path, 500),
    userAgent: text(request.headers.get("user-agent"), 500),
  };

  const webhookUrl = process.env.ERROR_LOG_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(JSON.stringify({ ...event, delivery: "webhook_not_configured" }));
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Logging webhook respondió ${response.status}`);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(
      JSON.stringify({
        ...event,
        delivery: "webhook_failed",
        deliveryError: error instanceof Error ? error.message : "unknown",
      })
    );
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
