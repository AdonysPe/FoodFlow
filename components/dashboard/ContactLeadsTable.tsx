"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  createdAt: string;
};

const SOURCE_LABEL: Record<ContactLead["source"], string> = {
  web_form: "Formulario",
  calculadora: "Calculadora",
  whatsapp: "WhatsApp",
};

const SOURCES: { id: "all" | ContactLead["source"]; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "web_form", label: "Formulario" },
  { id: "calculadora", label: "Calculadora" },
  { id: "whatsapp", label: "WhatsApp" },
];

const COLUMNS: { id: Exclude<PipelineStatus, "archivado">; label: string; color: string }[] = [
  { id: "nuevo", label: "Nuevos", color: "#ff5a33" },
  { id: "contactado", label: "Contactados", color: "#c5bdb1" },
  { id: "cita", label: "Con cita", color: "#c7bcff" },
  { id: "cliente", label: "Clientes", color: "#3ddc97" },
];

const ORDER: PipelineStatus[] = ["nuevo", "contactado", "cita", "cliente"];

// What each status offers as its next moves. The first one is the card's
// button; the drawer lists them all. `archivar` is always there except on an
// archived contact, where the only move is back to the funnel.
const NEXT_MOVES: Record<PipelineStatus, { to: PipelineStatus; label: string }[]> = {
  nuevo: [{ to: "contactado", label: "Marcar contactado" }],
  contactado: [
    { to: "cita", label: "Agendar cita" },
    { to: "cliente", label: "Marcar cliente" },
  ],
  cita: [{ to: "cliente", label: "Marcar cliente" }],
  cliente: [],
  archivado: [{ to: "nuevo", label: "Reactivar" }],
};

const STATUS_LABEL: Record<PipelineStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cita: "Con cita",
  cliente: "Cliente",
  archivado: "Archivado",
};

function ageOf(iso: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return { hours, label: "hace un momento" };
  if (hours < 24) return { hours, label: `hace ${hours} h` };
  const days = Math.floor(hours / 24);
  return { hours, label: days === 1 ? "ayer" : days < 14 ? `hace ${days} días` : `hace ${Math.floor(days / 7)} semanas` };
}

function priority(score: number) {
  if (score >= 75) return { label: "Prioridad alta", bg: "rgba(255,90,51,0.16)", fg: "#ff7a57" };
  if (score >= 50) return { label: "Prioridad media", bg: "rgba(243,239,230,0.08)", fg: "#e2dbcf" };
  if (score > 0) return { label: "Prioridad baja", bg: "rgba(243,239,230,0.05)", fg: "#ada599" };
  return null;
}

/**
 * Contactos, design B: the sales pipeline as four columns (Nuevos,
 * Contactados, Con cita, Clientes). Each card moves one step with its own
 * button, opens a drawer with the details, and WhatsApp is always one tap
 * away. Below 900px the columns become tabs and the drawer a bottom sheet.
 *
 * Moves are optimistic and go through `updateLeadPipeline`, which is guarded,
 * audited and revalidates the Resumen.
 */
export default function ContactLeadsTable({ leads }: { leads: ContactLead[] }) {
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [optimisticLeads, applyOptimistic] = useOptimistic(leads, (state, update: { id: string; status: PipelineStatus }) =>
    state.map((lead) => (lead.id === update.id ? { ...lead, status: update.status } : lead))
  );
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | ContactLead["source"]>("all");
  const [tab, setTab] = useState<(typeof COLUMNS)[number]["id"]>("nuevo");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    setHost(document.querySelector(".lbd") ?? document.body);
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  function move(id: string, status: PipelineStatus) {
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await updateLeadPipeline(id, status);
      pushToast(result.ok ? `Contacto marcado como ${STATUS_LABEL[status].toLowerCase()}.` : result.error, result.ok ? "success" : "error");
    });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return optimisticLeads.filter((lead) => (source === "all" || lead.source === source) && (!needle || `${lead.nombre} ${lead.restaurante}`.toLowerCase().includes(needle)));
  }, [optimisticLeads, query, source]);

  const active = optimisticLeads.filter((lead) => lead.status !== "archivado");
  const clients = active.filter((lead) => lead.status === "cliente").length;
  const conversion = active.length ? Math.round((clients / active.length) * 100) : 0;
  const archived = visible.filter((lead) => lead.status === "archivado");
  const opened = optimisticLeads.find((lead) => lead.id === openId) ?? null;

  if (leads.length === 0) {
    return <div className="lbd-empty">Aún no hay contactos. Cuando alguien complete el formulario de la landing (nombre, restaurante y WhatsApp) aparecerá aquí.</div>;
  }

  function renderCard(lead: ContactLead) {
    const age = ageOf(lead.createdAt);
    const late = lead.status === "nuevo" && age.hours >= 24;
    const prio = priority(lead.score);
    const next = NEXT_MOVES[lead.status][0];
    return (
      <div key={lead.id} className={`lbd-ad-card${late ? " is-late" : ""}`}>
        <button type="button" className="lbd-ad-card-main" onClick={() => setOpenId(lead.id)}>
          <span className="lbd-ad-card-top">
            <strong>{lead.nombre}</strong>
            <small data-late={late}>{age.label}</small>
          </span>
          <span className="lbd-ad-card-venue">{lead.restaurante}</span>
          <span className="lbd-ad-card-meta">
            {SOURCE_LABEL[lead.source]}
            {lead.perdidaAnualLabel ? ` · pierde ~${lead.perdidaAnualLabel}/año` : ""}
          </span>
        </button>
        {prio && (
          <span className="lbd-ad-prio" style={{ background: prio.bg, color: prio.fg }}>
            {prio.label}
          </span>
        )}
        <div className="lbd-ad-card-actions">
          <a href={`https://wa.me/51${lead.whatsapp}`} target="_blank" rel="noopener noreferrer" className="lbd-ad-wa lbd-ad-wa--icon" aria-label={`Escribir a ${lead.nombre} por WhatsApp`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" />
            </svg>
          </a>
          {next && (
            <button type="button" disabled={isPending} className="lbd-ad-next" onClick={() => move(lead.id, next.to)}>
              {next.label}
            </button>
          )}
          <button type="button" disabled={isPending} className="lbd-ad-ico" aria-label={lead.status === "archivado" ? `Reactivar a ${lead.nombre}` : `Archivar a ${lead.nombre}`} onClick={() => move(lead.id, lead.status === "archivado" ? "nuevo" : "archivado")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16v3H4zM6 10v9h12v-9M10 14h4" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lbd-filters lbd-rise" style={{ animationDelay: ".05s" }}>
        <label htmlFor="ct-buscar" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Buscar contacto
        </label>
        <div className="lbd-cu-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5bdb1" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input id="ct-buscar" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o restaurante" />
        </div>
        <div className="lbd-seg" role="group" aria-label="Origen">
          {SOURCES.map((s) => (
            <button key={s.id} type="button" aria-pressed={source === s.id} className={source === s.id ? "is-on" : undefined} onClick={() => setSource(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="lbd-ad-conv">
          Conversión <strong>{conversion}%</strong>
        </span>
        <button type="button" aria-pressed={showArchived} className={`lbd-chip-btn${showArchived ? " is-on" : ""}`} onClick={() => setShowArchived((v) => !v)}>
          Archivados <span className="lbd-mono">{optimisticLeads.filter((l) => l.status === "archivado").length}</span>
        </button>
      </div>

      {showArchived ? (
        <section className="lbd-card lbd-ad-panel lbd-swap" aria-label="Archivados">
          {archived.length === 0 ? (
            <p className="lbd-ad-empty">No hay contactos archivados.</p>
          ) : (
            archived.map((lead) => (
              <div key={lead.id} className="lbd-ad-arch">
                <span>
                  <strong>{lead.nombre}</strong>
                  <small>
                    {lead.restaurante} · {SOURCE_LABEL[lead.source]}
                  </small>
                </span>
                <button type="button" disabled={isPending} className="lbd-btn lbd-btn--ghost lbd-btn--sm" onClick={() => move(lead.id, "nuevo")}>
                  Reactivar
                </button>
              </div>
            ))
          )}
        </section>
      ) : (
        <>
          <div className="lbd-ad-tabs" role="tablist" aria-label="Etapa">
            {COLUMNS.map((col) => (
              <button key={col.id} type="button" role="tab" aria-selected={tab === col.id} className={tab === col.id ? "is-on" : undefined} onClick={() => setTab(col.id)}>
                {col.label} <span className="lbd-mono">{visible.filter((l) => l.status === col.id).length}</span>
              </button>
            ))}
          </div>
          <div className="lbd-ad-board lbd-rise" style={{ animationDelay: ".08s" }}>
            {COLUMNS.map((col) => {
              const cards = visible.filter((lead) => lead.status === col.id);
              return (
                <section key={col.id} className={`lbd-ad-col${tab === col.id ? " is-tab" : ""}`} aria-label={col.label}>
                  <div className="lbd-ad-col-head">
                    <span>
                      <i style={{ background: col.color }} aria-hidden />
                      {col.label}
                    </span>
                    <span className="lbd-mono">{cards.length}</span>
                  </div>
                  {cards.map(renderCard)}
                  {cards.length === 0 && <div className="lbd-ad-col-empty">Nadie aquí todavía</div>}
                </section>
              );
            })}
          </div>
        </>
      )}

      {opened && host &&
        createPortal(
          <>
            <div className="lbd-ad-scrim" onMouseDown={() => setOpenId(null)} aria-hidden="true" />
            <aside className="lbd-ad-drawer" role="dialog" aria-modal="true" aria-label="Detalle del contacto">
              <div className="lbd-ad-drawer-head">
                <div>
                  <span className="lbd-mono lbd-bl-eyebrow">{STATUS_LABEL[opened.status].toUpperCase()}</span>
                  <h2 className="lbd-display">{opened.nombre}</h2>
                  <span>{opened.restaurante}</span>
                </div>
                <button type="button" className="lbd-ad-ico" onClick={() => setOpenId(null)} aria-label="Cerrar" style={{ flexShrink: 0 }}>
                  ×
                </button>
              </div>

              <div className="lbd-ad-drawer-tiles">
                <div>
                  <span>Puntuación</span>
                  <strong className="lbd-display">{opened.score > 0 ? opened.score : "—"}</strong>
                </div>
                <div className="is-accent">
                  <span>Pierde al año</span>
                  <strong className="lbd-display">{opened.perdidaAnualLabel ?? "—"}</strong>
                </div>
              </div>

              <div className="lbd-ad-drawer-block">
                <span className="lbd-mono lbd-bl-eyebrow">CONTACTO</span>
                <span className="lbd-mono">+51 {opened.whatsapp}</span>
                {opened.email && <span style={{ color: "#e2dbcf" }}>{opened.email}</span>}
                <span style={{ color: "#c5bdb1", fontSize: 13 }}>
                  Llegó por {SOURCE_LABEL[opened.source].toLowerCase()} · {opened.createdAtLabel}
                </span>
              </div>

              <div className="lbd-ad-drawer-block">
                <span className="lbd-mono lbd-bl-eyebrow">AVANCE</span>
                <div className="lbd-ad-steps" aria-hidden="true">
                  {ORDER.map((s, i) => (
                    <span key={s} className={i <= ORDER.indexOf(opened.status) ? "is-on" : undefined} />
                  ))}
                </div>
                <div className="lbd-ad-steps-labels">
                  {ORDER.map((s) => (
                    <span key={s}>{STATUS_LABEL[s]}</span>
                  ))}
                </div>
              </div>

              <div className="lbd-ad-drawer-actions">
                <a href={`https://wa.me/51${opened.whatsapp}`} target="_blank" rel="noopener noreferrer" className="lbd-wa" style={{ marginTop: 0 }}>
                  Escribir por WhatsApp
                </a>
                {NEXT_MOVES[opened.status].map((m, i) => (
                  <button
                    key={m.to}
                    type="button"
                    disabled={isPending}
                    className={`lbd-btn ${i === 0 ? "lbd-btn--solid" : "lbd-btn--ghost"}`}
                    onClick={() => {
                      move(opened.id, m.to);
                      setOpenId(null);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
                {opened.status !== "archivado" && (
                  <button
                    type="button"
                    disabled={isPending}
                    className="lbd-btn lbd-btn--ghost"
                    onClick={() => {
                      move(opened.id, "archivado");
                      setOpenId(null);
                    }}
                  >
                    Archivar
                  </button>
                )}
              </div>
            </aside>
          </>,
          host
        )}
    </>
  );
}
