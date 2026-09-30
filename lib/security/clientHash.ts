import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * A salted, one-way hash of the caller's IP address.
 *
 * Used to rate-limit unauthenticated endpoints across cold starts without ever
 * storing an actual IP: the hash is peppered with AUTH_SECRET, so whoever reads
 * the table can't turn it back into an address. Shared by every public write
 * (lead capture, chat lead, and later the public reservation route).
 */
export async function callerIpHash(): Promise<string> {
  const h = await headers();
  // Vercel sets `x-vercel-forwarded-for` and `x-real-ip` itself, and a client
  // cannot supply them. `x-forwarded-for` is only the last resort: anywhere it
  // is passed through untouched, its first entry is whatever the caller wrote,
  // which would let one address dodge every rate limit by varying it.
  const trusted = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  const forwarded = h.get("x-forwarded-for");
  const ip = trusted?.split(",")[0].trim() || forwarded?.split(",")[0].trim() || "unknown";
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? "foodflow"}:${ip}`)
    .digest("hex");
}
