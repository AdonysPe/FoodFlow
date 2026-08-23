import { prisma } from "@/lib/db/prisma";

const RESEND_COOLDOWN_MS = 30 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

export type RateLimitResult = { ok: true } | { ok: false; reason: string };

// DB-backed instead of in-memory/Redis: it survives restarts and works
// correctly even with multiple server instances, at the cost of one query.
export async function checkOtpRequestRateLimit(email: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.oTPCode.findMany({
    where: { email, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: MAX_REQUESTS_PER_WINDOW,
  });

  if (recent.length > 0) {
    const mostRecentAgeMs = Date.now() - recent[0].createdAt.getTime();
    if (mostRecentAgeMs < RESEND_COOLDOWN_MS) {
      return { ok: false, reason: "Please wait a moment before requesting another code." };
    }
  }

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, reason: "Too many requests. Please try again in a few minutes." };
  }

  return { ok: true };
}
