import { prisma } from "@/lib/db/prisma";
import { callerIpHash } from "@/lib/security/clientHash";

/**
 * Append one row to the audit trail. **Best-effort**: a failure here is logged
 * and swallowed, never propagated — an audit write must not turn a successful
 * user action into an error.
 *
 * Call it from a server action, after the mutation has succeeded.
 */
export async function logAudit(entry: {
  action: string;
  actor?: { id?: string | null; email?: string | null } | null;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  restaurantId?: string | null;
}): Promise<void> {
  try {
    let ipHash: string | null = null;
    try {
      ipHash = await callerIpHash();
    } catch {
      // Called outside a request scope — keep the entry, drop the ip.
    }

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actor?.id ?? null,
        actorEmail: entry.actor?.email ?? null,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ipHash,
        restaurantId: entry.restaurantId ?? null,
      },
    });
  } catch (err) {
    console.error(`[audit] failed to record "${entry.action}"`, err);
  }
}

// Prisma's Json column rejects `undefined`; map it to Prisma.JsonNull-free
// omission by returning `undefined` only when there is genuinely nothing.
function toJson(value: unknown) {
  if (value === undefined) return undefined;
  return value as never;
}
