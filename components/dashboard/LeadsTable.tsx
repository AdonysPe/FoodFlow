"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { updateLeadStatus } from "@/lib/actions/leads";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type Lead = {
  id: string;
  email: string;
  status: "new" | "contacted" | "converted";
  createdAtLabel: string;
};

const STATUS: Record<Lead["status"], { label: string; bg: string; fg: string }> = {
  new: { label: "Nuevo", bg: "rgba(255,90,51,0.14)", fg: "#ff7a57" },
  contacted: { label: "Contactado", bg: "rgba(243,239,230,0.08)", fg: "#e2dbcf" },
  converted: { label: "Convertido", bg: "rgba(61,220,151,0.14)", fg: "#3ddc97" },
};

const NEXT: Record<Lead["status"], { to: Lead["status"]; label: string } | null> = {
  new: { to: "contacted", label: "Marcar contactado" },
  contacted: { to: "converted", label: "Marcar convertido" },
  converted: null,
};

const FILTERS: { id: "all" | Lead["status"]; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "new", label: "Nuevos" },
  { id: "contacted", label: "Contactados" },
  { id: "converted", label: "Convertidos" },
];

/**
 * Leads del chat, design B: the emails visitors left in the site's assistant.
 * All there is to a lead is the address, so each row offers "Escribir" (a
 * mailto) and the next step of its status. Moves are optimistic and go
 * through `updateLeadStatus`, which is guarded and audited.
 */
export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [filter, setFilter] = useState<"all" | Lead["status"]>("all");
  const [optimisticLeads, applyOptimistic] = useOptimistic(leads, (state, update: { id: string; status: Lead["status"] }) =>
    state.map((lead) => (lead.id === update.id ? { ...lead, status: update.status } : lead))
  );

  function handleUpdate(id: string, status: Lead["status"]) {
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await updateLeadStatus(id, status);
      pushToast(result.ok ? `Lead marcado como ${STATUS[status].label.toLowerCase()}.` : result.error, result.ok ? "success" : "error");
    });
  }

  const count = (s: Lead["status"]) => optimisticLeads.filter((l) => l.status === s).length;
  const conversion = optimisticLeads.length ? Math.round((count("converted") / optimisticLeads.length) * 100) : 0;
  const rows = useMemo(() => optimisticLeads.filter((l) => filter === "all" || l.status === filter), [optimisticLeads, filter]);

  if (leads.length === 0) {
    return (
      <section className="lbd-card lbd-ad-panel lbd-swap" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px", borderStyle: "dashed" }} aria-label="Sin leads">
        <span className="lbd-ad-empty-ico" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z" />
          </svg>
        </span>
        <span className="lbd-display" style={{ fontSize: 24, letterSpacing: "-0.04em" }}>
          Todavía nadie dejó su correo en el chat
        </span>
        <span className="lbd-ad-sub" style={{ maxWidth: 440 }}>
          Cuando alguien lo haga aparecerá aquí al instante. Mientras tanto, los contactos del formulario están en Contactos.
        </span>
        <a href="/dashboard/admin/contactos" className="lbd-btn lbd-btn--cream">
          Ir a Contactos
        </a>
      </section>
    );
  }

  const stats = [
    { label: "Leads", value: String(optimisticLeads.length), accent: false },
    { label: "Sin escribir", value: String(count("new")), accent: count("new") > 0 },
    { label: "Convertidos", value: String(count("converted")), accent: false },
    { label: "Conversión", value: `${conversion}%`, accent: false },
  ];

  return (
    <>
      <div className="lbd-ad-kpis lbd-rise" style={{ animationDelay: ".04s" }}>
        {stats.map((s) => (
          <div key={s.label} className={`lbd-card lbd-ad-kpi${s.accent ? " is-accent" : ""}`}>
            <span>{s.label}</span>
            <strong className="lbd-display">{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="lbd-seg lbd-rise" role="group" aria-label="Estado" style={{ alignSelf: "flex-start", animationDelay: ".07s" }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} className={filter === f.id ? "is-on" : undefined} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="lbd-card lbd-ad-panel lbd-rise" style={{ animationDelay: ".1s", padding: "6px 20px" }} aria-label="Leads">
        {rows.map((lead) => {
          const status = STATUS[lead.status];
          const next = NEXT[lead.status];
          return (
            <div key={lead.id} className="lbd-ad-lead">
              <span className="lbd-cu-av" style={{ background: "#3a302b", color: "#f3efe6" }}>
                {lead.email[0]?.toUpperCase()}
              </span>
              <span className="lbd-ad-lead-main">
                <strong>{lead.email}</strong>
                <small>{lead.createdAtLabel} · desde el chat</small>
              </span>
              <span className="lbd-ad-status" style={{ background: status.bg, color: status.fg }}>
                {status.label}
              </span>
              <div className="lbd-ad-lead-actions">
                <a href={`mailto:${lead.email}`} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
                  Escribir
                </a>
                {next && (
                  <button type="button" disabled={isPending} className="lbd-btn lbd-btn--cream lbd-btn--sm" onClick={() => handleUpdate(lead.id, next.to)}>
                    {next.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="lbd-ad-empty">Ningún lead en este estado.</p>}
      </section>
    </>
  );
}
