import { prisma } from "@/lib/db/prisma";
import GlassCard from "@/components/ui/GlassCard";

export const metadata = {
  title: "Audit log",
};

// Read-only. Gated by AdminLayout (getCurrentUser().role === "admin"); the
// AuditLog rows carry no tenant relation, so no restaurant user can reach them.
const PAGE_SIZE = 200;

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Login",
  "auth.logout": "Logout",
  "menu.item.price_change": "Price changed",
  "menu.item.delete": "Dish deleted",
  "staff.add": "Waiter added",
  "staff.remove": "Waiter removed",
  "lead.status_change": "Lead status changed",
  "restaurant.delete": "Restaurant deleted",
};

function summarize(before: unknown, after: unknown): string {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  if ("price" in b || "price" in a) {
    const name = (a.name ?? b.name ?? "") as string;
    return `${name}: ${b.price ?? "—"} → ${a.price ?? "—"}`;
  }
  if ("status" in b || "status" in a) return `${b.status ?? "—"} → ${a.status ?? "—"}`;
  if ("email" in a) return String(a.email);
  if ("email" in b) return String(b.email);
  if ("name" in b) return String(b.name);
  if ("role" in a) return `role: ${a.role}`;
  return "";
}

export default async function AuditLogPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  if (entries.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-fg/40" hoverLift={false}>
        No audit entries yet. Sensitive actions (logins, price changes, deletions,
        role changes) will be recorded here.
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-fg/40">
        Last {entries.length} events. Append-only. IP is stored as a salted hash,
        never the address.
      </p>
      <GlassCard className="overflow-hidden p-0" hoverLift={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-fg/[0.07] text-[12px] uppercase tracking-wide text-fg/35">
                <th className="px-5 py-3.5 font-medium">When</th>
                <th className="px-5 py-3.5 font-medium">Action</th>
                <th className="px-5 py-3.5 font-medium">Actor</th>
                <th className="px-5 py-3.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-fg/[0.04] last:border-0 align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-fg/45">
                    {e.createdAt.toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 text-fg/85">
                    {ACTION_LABELS[e.action] ?? e.action}
                  </td>
                  <td className="px-5 py-3 text-fg/60">{e.actorEmail ?? "—"}</td>
                  <td className="px-5 py-3 text-fg/50">
                    {summarize(e.before, e.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
