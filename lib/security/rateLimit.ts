import { prisma } from "@/lib/db/prisma";

/**
 * Generic fixed-window rate limiter, backed by the `RateLimit` table so a limit
 * holds across cold starts and across serverless instances (an in-memory map
 * does neither, and under `next dev` it is wiped between requests).
 *
 * Fixed window: every `windowMs` slice gets its own counter row. Simple and
 * cheap; the only cost is that up to `2 * max` requests can slip through right
 * at a window boundary, which is fine for abuse prevention.
 *
 *   const r = await rateLimit("otp-ip", ipHash, { max: 15, windowMs: 15 * 60_000 });
 *   if (!r.ok) return tooMany(r.retryAfterMs);
 */
export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

export async function rateLimit(
  bucket: string,
  subject: string,
  opts: { max: number; windowMs: number },
): Promise<RateLimitResult> {
  const { max, windowMs } = opts;
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const key = `${bucket}:${subject}:${windowId}`;
  const expiresAt = new Date((windowId + 1) * windowMs);

  // Atomic increment-or-insert for this window's counter.
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? 1);

  // On the first hit of a fresh window, sweep windows that closed a while ago
  // so the table can't grow without bound. Best-effort, never blocks the call.
  if (count === 1) {
    prisma.rateLimit
      .deleteMany({ where: { expiresAt: { lt: new Date(now - windowMs) } } })
      .catch(() => {});
  }

  if (count > max) {
    return { ok: false, retryAfterMs: Math.max(0, expiresAt.getTime() - now) };
  }
  return { ok: true, remaining: max - count };
}
