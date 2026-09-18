import { readCarta, readCartaVersion } from "@/lib/db/carta";
import { rateLimit } from "@/lib/security/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The carta as plain JSON.
 *
 * Two jobs: it is what the 30-second fallback polls when EventSource cannot
 * connect, and it is what a page restored from localStorage revalidates
 * against. `?v=` lets a caller that already has version N ask only whether
 * anything moved — the common answer is 204 with no body, which is the whole
 * point of polling being cheap.
 */
export async function GET(request, { params }) {
  const limit = await rateLimit("carta-json", await callerIpHash(), {
    max: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return new Response("Demasiadas solicitudes", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const { slug } = await params;
  const raw = new URL(request.url).searchParams.get("v");
  const known = raw == null ? null : Number(raw);

  if (known != null && Number.isFinite(known)) {
    const version = await readCartaVersion(slug);
    if (version == null) return new Response("No encontrado", { status: 404 });
    if (version === known) {
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }

  const carta = await readCarta(slug);
  if (!carta) return new Response("No encontrado", { status: 404 });

  return Response.json(carta, { headers: { "Cache-Control": "no-store" } });
}
