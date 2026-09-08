"use client";

import { useOptimistic, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import StatusPill from "@/components/dashboard/StatusPill";
import { IconWhatsApp } from "@/components/ui/Icons";
import { updateLeadPipeline } from "@/lib/actions/leadCapture";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type PipelineStatus = "nuevo" | "contactado" | "cita" | "cliente" | "archivado";

export type ContactLead = {
  id: string;
  nombre: string;
  restaurante: string;
  whatsapp: string; // 9 digits, no country code
  email: string | null;
  source: "web_form" | "calculadora" | "whatsapp";
  score: number;
  perdidaAnualLabel: string | null;
  status: PipelineStatus;
  createdAtLabel: string;
};

const SOURCE_LABEL: Record<ContactLead["source"], string> = {
  web_form: "Formulario",
  calculadora: "Calculadora",
  whatsapp: "WhatsApp",
};

// What each status offers as its next moves. `archivar` is always available
// except when already archived, where the only move is back to the funnel.
const NEXT_MOVES: Record<PipelineStatus, { to: PipelineStatus; label: string; primary?: boolean }[]> = {
  nuevo: [{ to: "contactado", label: "Marcar contactado", primary: true }],
  contactado: [
    { to: "cita", label: "Agendar cita" },
    { to: "cliente", label: "Marcar cliente", primary: true },
  ],
  cita: [{ to: "cliente", label: "Marcar cliente", primary: true }],
  cliente: [],
  archivado: [{ to: "nuevo", label: "Reactivar", primary: true }],
};

export default function ContactLeadsTable({ leads }: { leads: ContactLead[] }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [optimisticLeads, applyOptimistic] = useOptimistic(
    leads,
    (state, update: { id: string; status: PipelineStatus }) =>
      state.map((lead) => (lead.id === update.id ? { ...lead, status: update.status } : lead))
  );

  function handleUpdate(id: string, status: PipelineStatus) {
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await updateLeadPipeline(id, status);
      if (result.ok) {
        pushToast(`Contacto marcado como ${status}.`, "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  if (leads.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-faint" hoverLift={false}>
        Aún no hay contactos. Cuando alguien complete el formulario de la landing
        (nombre, restaurante y WhatsApp) aparecerá aquí.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-fg/[0.07] text-[12px] uppercase tracking-wide text-faint">
              <th className="px-5 py-3.5 font-medium">Contacto</th>
              <th className="px-5 py-3.5 font-medium">WhatsApp</th>
              <th className="px-5 py-3.5 font-medium">Origen</th>
              <th className="px-5 py-3.5 font-medium">Pérdida/año</th>
              <th className="px-5 py-3.5 font-medium">Score</th>
              <th className="px-5 py-3.5 font-medium">Fecha</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
              <th className="px-5 py-3.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {optimisticLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-fg/[0.04] last:border-0 align-top">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-fg/85">{lead.nombre}</div>
                  <div className="text-[12.5px] text-faint">{lead.restaurante}</div>
                  {lead.email && (
                    <div className="text-[12.5px] text-faint">{lead.email}</div>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <a
                    href={`https://wa.me/51${lead.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13.5px] text-wa-ink hover:text-fg"
                  >
                    <IconWhatsApp className="h-4 w-4" />
                    +51 {lead.whatsapp}
                  </a>
                </td>
                <td className="px-5 py-3.5 text-muted">{SOURCE_LABEL[lead.source]}</td>
                <td className="px-5 py-3.5 text-muted">{lead.perdidaAnualLabel ?? "—"}</td>
                <td className="px-5 py-3.5 text-muted">{lead.score > 0 ? lead.score : "—"}</td>
                <td className="px-5 py-3.5 text-faint">{lead.createdAtLabel}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={lead.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    {NEXT_MOVES[lead.status].map((move) => (
                      <button
                        key={move.to}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdate(lead.id, move.to)}
                        className={
                          move.primary
                            ? "rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
                            : "rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-fg/70 transition-colors hover:bg-fg/[0.08] hover:text-fg disabled:opacity-40"
                        }
                      >
                        {move.label}
                      </button>
                    ))}
                    {lead.status !== "archivado" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUpdate(lead.id, "archivado")}
                        className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-fg/[0.08] hover:text-fg/80 disabled:opacity-40"
                      >
                        Archivar
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
