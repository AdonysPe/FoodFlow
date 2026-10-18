"use client";

import { useMemo, useState } from "react";

export type AuditKind = "acceso" | "precio" | "equipo" | "ventas" | "local" | "riesgo" | "factura";

export type AuditEvent = {
  id: string;
  /** ISO timestamp; formatted here, in the viewer's own clock. */
  at: string;
  action: string;
  kind: AuditKind;
  actor: string;
  detail: string;
};

const KINDS: Record<AuditKind, { label: string; color: string; icon: string }> = {
  acceso: { label: "Accesos", color: "#3ddc97", icon: "M14 4h5v16h-5M10 8l4 4-4 4M14 12H4" },
  precio: { label: "Precios y carta", color: "#f3efe6", icon: "M4 12l8-8h8v8l-8 8zM15.5 8.5h.01" },
  equipo: { label: "Equipo", color: "#c7bcff", icon: "M9 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M17 9v6M14 12h6" },
  ventas: { label: "Contactos", color: "#ff7a57", icon: "M4 6.5h16v11H4zM4 7l8 6 8-6" },
  local: { label: "Locales", color: "#5fd6c5", icon: "M4 9.5l1.5-5h13l1.5 5M4 9.5h16v10H4zM9.5 19.5v-5h5v5" },
  factura: { label: "Facturación", color: "#a39b90", icon: "M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z" },
  riesgo: { label: "Borrados", color: "#ff5a33", icon: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" },
};

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Auditoría, design B: the last events in plain Spanish, with a filter by
 * kind and a search over actor and detail. The log is read-only; nothing
 * here can change a row.
 */
export default function AuditLogView({ events }: { events: AuditEvent[] }) {
  const [kind, setKind] = useState<"all" | AuditKind>("all");
  const [query, setQuery] = useState("");

  const present = useMemo(() => (Object.keys(KINDS) as AuditKind[]).filter((k) => events.some((e) => e.kind === k)), [events]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((e) => (kind === "all" || e.kind === kind) && (!needle || `${e.actor} ${e.detail} ${e.action}`.toLowerCase().includes(needle)));
  }, [events, kind, query]);

  if (events.length === 0) {
    return <div className="lbd-empty">Todavía no hay eventos. Las acciones sensibles (accesos, cambios de precio, borrados, cambios de rol) se registrarán aquí.</div>;
  }

  return (
    <>
      <div className="lbd-filters lbd-rise" style={{ animationDelay: ".05s" }}>
        <label htmlFor="au-buscar" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Buscar en la auditoría
        </label>
        <div className="lbd-cu-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input id="au-buscar" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Correo o detalle" />
        </div>
        <div className="lbd-chips" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={kind === "all"} className={`lbd-chip-btn${kind === "all" ? " is-on" : ""}`} onClick={() => setKind("all")}>
            Todo
          </button>
          {present.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} className={`lbd-chip-btn${kind === k ? " is-on" : ""}`} onClick={() => setKind(k)}>
              <i className="lbd-ad-dot" style={{ background: KINDS[k].color }} aria-hidden />
              {KINDS[k].label}
            </button>
          ))}
        </div>
      </div>

      <section className="lbd-card lbd-rise lbd-ad-list" style={{ animationDelay: ".08s" }} aria-label="Eventos">
        <div className="lbd-ad-ev lbd-ad-ev--head lbd-mono" aria-hidden>
          <span>CUÁNDO</span>
          <span />
          <span>ACCIÓN</span>
          <span>QUIÉN</span>
          <span>DETALLE</span>
        </div>
        {rows.map((e) => {
          const meta = KINDS[e.kind];
          return (
            <div key={e.id} className="lbd-ad-ev">
              <time className="lbd-mono lbd-ad-ev-when" dateTime={e.at}>
                {whenLabel(e.at)}
              </time>
              <span className="lbd-ad-ev-ico" style={{ color: meta.color, background: e.kind === "riesgo" ? "rgba(255,90,51,0.14)" : "rgba(243,239,230,0.06)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={meta.icon} />
                </svg>
              </span>
              <strong className="lbd-ad-ev-action">{e.action}</strong>
              <span className="lbd-ad-ev-actor">{e.actor}</span>
              <span className="lbd-ad-ev-detail">{e.detail}</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="lbd-ad-empty">Ningún evento coincide.</p>}
      </section>
    </>
  );
}
