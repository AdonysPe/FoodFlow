"use client";

import { useOptimistic, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusPill from "@/components/dashboard/StatusPill";
import { updateLeadStatus } from "@/lib/actions/leads";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type Lead = {
  id: string;
  email: string;
  status: "new" | "contacted" | "converted";
  createdAtLabel: string;
};

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [optimisticLeads, applyOptimistic] = useOptimistic(
    leads,
    (state, update: { id: string; status: Lead["status"] }) =>
      state.map((lead) => (lead.id === update.id ? { ...lead, status: update.status } : lead))
  );

  function handleUpdate(id: string, status: Lead["status"]) {
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await updateLeadStatus(id, status);
      if (result.ok) {
        pushToast(`Lead marked as ${status}.`, "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  if (leads.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No leads yet. New leads from the landing page will show up here.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Email</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Date</th>
              <th className="px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3.5 text-white/85">{lead.email}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={lead.status} />
                </td>
                <td className="px-5 py-3.5 text-white/45">{lead.createdAtLabel}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    {lead.status === "new" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdate(lead.id, "contacted")}
                        className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                      >
                        Mark contacted
                      </button>
                    )}
                    {lead.status !== "converted" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdate(lead.id, "converted")}
                        className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        Mark converted
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
