import { readTableOrderState } from "@/lib/db/tableOrderState";
import { normalizeTableCode } from "@/lib/tableCode";
import { rateLimit } from "@/lib/security/rateLimit";
import { callerIpHash } from "@/lib/security/clientHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { code: raw } = await params;
  const code = normalizeTableCode(raw);
  if (code.length !== 10) return new Response("Código no válido", { status: 400 });
  const limit = await rateLimit(`table-order-state:${code}`, await callerIpHash(), { max: 20, windowMs: 60_000 });
  if (!limit.ok) return new Response("Demasiadas solicitudes", { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } });
  const state = await readTableOrderState(code);
  if (!state) return new Response("Mesa no encontrada", { status: 404 });
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
