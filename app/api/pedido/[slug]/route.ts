import { NextResponse } from "next/server";
import { readOrderingWebsite } from "@/lib/db/orderingWebsite";
import { SLUG_PATTERN } from "@/lib/carta";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Public and unauthenticated, and each call runs database queries: bounded
  // per caller like every other public read.
  const limit = await rateLimit("pedido-json", await callerIpHash(), { max: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "No disponible" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const state = await readOrderingWebsite(slug);
  return NextResponse.json(state ?? { error: "No disponible" }, { status: state ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}
