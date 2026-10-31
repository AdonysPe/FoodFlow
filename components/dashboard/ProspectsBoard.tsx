"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { recordProspectMessage, searchProspectsNow, updateProspectStatus } from "@/lib/actions/prospects";
import { whatsappLink, MAX_TOUCHES } from "@/lib/prospecting/message";
import { SEGMENT_LABELS, type Segment } from "@/lib/prospecting/searches";
import { PLAN_LABELS, PLAN_PRICES, type PlanValue } from "@/lib/plans";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type ProspectStatus = "nuevo" | "contactado" | "respondio" | "cliente" | "descartado";

export type ProspectRow = {
  id: string;
  name: string;
  district: string;
  address: string | null;
  phone: string | null;
  mobile: string | null; // 9 digits, only when the phone is a mobile
  website: string | null;
  ownWebsite: boolean;
  mapsUrl: string | null;
  category: string | null;
  segment: Segment;
  rating: number | null;
  reviewCount: number | null;
  delivery: boolean | null;
  dineIn: boolean | null;
  score: number;
  plan: PlanValue;
  isChain: boolean;
  status: ProspectStatus;
  touches: number;
  lastTouchAt: string | null;
  dueAt: string | null;
  due: boolean;
  // The message for the next touch, or null when the sequence is over.
  draft: string | null;
  foundBy: string;
  source: "google" | "osm";
};

type Tab = "hoy" | ProspectStatus;

const STATUS_LABEL: Record<ProspectStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  respondio: "Respondió",
  cliente: "Cliente",
  descartado: "Descartado",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "hoy", label: "Para hoy" },
  { id: "nuevo", label: "Nuevos" },
  { id: "contactado", label: "Contactados" },
  { id: "respondio", label: "Respondieron" },
  { id: "cliente", label: "Clientes" },
  { id: "descartado", label: "Descartados" },
];

// "Para hoy" is a day's work, not the whole list: the follow-ups that fell
// due plus this many first messages, best score first.
const DAILY_FIRST_MESSAGES = 15;

const SEGMENTS = Object.entries(SEGMENT_LABELS) as [Segment, string][];

function ratingLabel(p: ProspectRow) {
  if (p.rating == null) return p.source === "osm" ? "Reseñas: míralas en Maps" : "Sin reseñas";
  return `★ ${p.rating.toFixed(1).replace(".", ",")} · ${(p.reviewCount ?? 0).toLocaleString("es-PE")} reseñas`;
}

function scoreTone(score: number) {
  if (score >= 75) return { bg: "rgba(255,90,51,0.16)", fg: "#ff7a57" };
  if (score >= 50) return { bg: "rgba(243,239,230,0.08)", fg: "#e2dbcf" };
  return { bg: "rgba(243,239,230,0.05)", fg: "#ada599" };
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });
}

function sequenceLabel(p: ProspectRow) {
  if (p.status === "nuevo") return null;
  if (p.status !== "contactado") return `${p.touches} ${p.touches === 1 ? "mensaje" : "mensajes"}`;
  if (p.touches >= MAX_TOUCHES) return "Sin respuesta tras 3 mensajes";
  if (p.due) return `Toca el mensaje ${p.touches + 1} de ${MAX_TOUCHES}`;
  return p.dueAt ? `Mensaje ${p.touches + 1} el ${dayLabel(p.dueAt)}` : null;
}

function tagsOf(p: ProspectRow) {
  const tags: string[] = [];
  if (p.delivery) tags.push("Delivery");
  if (p.dineIn) tags.push("Salón");
  tags.push(p.website ? (p.ownWebsite ? "Web propia" : "Solo redes") : "Sin web");
  if (!p.mobile) tags.push(p.phone ? "Solo teléfono fijo" : "Sin teléfono");
  if (p.isChain) tags.push("Cadena");
  if (p.source === "osm") tags.push("OpenStreetMap");
  return tags;
}

/**
 * Prospección, design B. A list worked top to bottom: each row is a venue
 * Google Maps knows, with why it scored what it did, the plan it points to
 * and one main button — open WhatsApp with the drafted message. That tap
 * records the touch, which schedules the next follow-up (day 3, day 7).
 *
 * Moves are optimistic, like Contactos; the server actions are guarded and
 * audited.
 */
export default function ProspectsBoard({
  prospects,
  totals,
  hasKey,
  districtGroups,
  sweepDays,
}: {
  prospects: ProspectRow[];
  totals: Record<ProspectStatus, number>;
  hasKey: boolean;
  districtGroups: { label: string; districts: string[] }[];
  sweepDays: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [rows, applyOptimistic] = useOptimistic(prospects, (state, update: { id: string; patch: Partial<ProspectRow> }) =>
    state.map((p) => (p.id === update.id ? { ...p, ...update.patch } : p))
  );
  const [tab, setTab] = useState<Tab>("hoy");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const [segment, setSegment] = useState<"all" | Segment>("all");
  const [searchDistrict, setSearchDistrict] = useState(districtGroups[0]?.districts[0] ?? "");
  const [searchSegment, setSearchSegment] = useState<Segment>("mesas");
  // OpenStreetMap is free and always there; Google only once the key is set.
  const [searchSource, setSearchSource] = useState<"osm" | "google">(hasKey ? "google" : "osm");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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

  const opened = rows.find((p) => p.id === openId) ?? null;

  function open(p: ProspectRow) {
    setOpenId(p.id);
    setDraft(p.draft ?? "");
  }

  function move(id: string, status: ProspectStatus) {
    startTransition(async () => {
      applyOptimistic({ id, patch: { status, draft: status === "nuevo" ? rows.find((p) => p.id === id)?.draft ?? null : null } });
      const result = await updateProspectStatus(id, status);
      pushToast(result.ok ? `Marcado como ${STATUS_LABEL[status].toLowerCase()}.` : result.error, result.ok ? "success" : "error");
    });
  }

  // The link itself opens WhatsApp (it has to be a real click, or the browser
  // blocks the new tab); this records that the message went out.
  function sent(p: ProspectRow) {
    startTransition(async () => {
      applyOptimistic({ id: p.id, patch: { status: "contactado", touches: p.touches + 1, due: false, draft: null, lastTouchAt: new Date().toISOString() } });
      const result = await recordProspectMessage(p.id);
      pushToast(result.ok ? `Mensaje ${p.touches + 1} registrado para ${p.name}.` : result.error, result.ok ? "success" : "error");
    });
    setOpenId(null);
  }

  function runSearch() {
    startSearch(async () => {
      const result = await searchProspectsNow(searchSource, searchDistrict, searchSegment);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      const { created, updated, errors } = result.data;
      pushToast(
        created > 0 ? `${created} restaurantes nuevos en ${searchDistrict}${updated ? ` · ${updated} actualizados` : ""}.` : `Nada nuevo en ${searchDistrict}: ${updated} ya estaban en la lista.`,
        errors.length ? "error" : "success"
      );
    });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(
      (p) =>
        (district === "all" || p.district === district) &&
        (segment === "all" || p.segment === segment) &&
        (!needle || `${p.name} ${p.category ?? ""} ${p.address ?? ""}`.toLowerCase().includes(needle))
    );
  }, [rows, query, district, segment]);

  const today = useMemo(() => {
    const followUps = filtered.filter((p) => p.due && p.draft && p.mobile);
    const firsts = filtered.filter((p) => p.status === "nuevo" && p.mobile && p.score > 0).slice(0, DAILY_FIRST_MESSAGES);
    return [...followUps, ...firsts];
  }, [filtered]);

  const listed = tab === "hoy" ? today : filtered.filter((p) => p.status === tab);
  const count = (t: Tab) => (t === "hoy" ? today.length : totals[t] - prospects.filter((p) => p.status === t).length + rows.filter((p) => p.status === t).length);
  const districts = districtGroups.flatMap((g) => g.districts);

  function renderRow(p: ProspectRow) {
    const tone = scoreTone(p.score);
    const seq = sequenceLabel(p);
    const canSend = Boolean(p.draft && p.mobile);
    return (
      <div key={p.id} className={`lbd-px-row${p.due ? " is-due" : ""}`}>
        <button type="button" className="lbd-px-main" onClick={() => open(p)}>
          <span className="lbd-px-top">
            <strong>{p.name}</strong>
            <span className="lbd-px-score lbd-mono" style={{ background: tone.bg, color: tone.fg }} title="Puntuación">
              {p.score}
            </span>
          </span>
          <span className="lbd-px-meta">
            {[p.category, p.district, ratingLabel(p)].filter(Boolean).join(" · ")}
          </span>
          <span className="lbd-px-tags">
            {tagsOf(p).map((tag) => (
              <i key={tag}>{tag}</i>
            ))}
            <i className="is-plan">
              {PLAN_LABELS[p.plan]} · {PLAN_PRICES[p.plan]}
            </i>
          </span>
          {seq && <span className="lbd-px-seq" data-due={p.due}>{seq}</span>}
        </button>
        <div className="lbd-px-actions">
          {canSend ? (
            <button type="button" className="lbd-btn lbd-btn--solid lbd-btn--sm" disabled={isPending} onClick={() => open(p)}>
              {p.touches === 0 ? "Escribir" : `Mensaje ${p.touches + 1}`}
            </button>
          ) : p.phone && p.status === "nuevo" ? (
            <a className="lbd-btn lbd-btn--ghost lbd-btn--sm" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
              Llamar
            </a>
          ) : null}
          {p.status === "contactado" && (
            <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" disabled={isPending} onClick={() => move(p.id, "respondio")}>
              Respondió
            </button>
          )}
          {p.status !== "descartado" && p.status !== "cliente" && (
            <button type="button" className="lbd-ad-ico" disabled={isPending} aria-label={`Descartar ${p.name}`} title="Descartar" onClick={() => move(p.id, "descartado")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {!hasKey && (
        <div className="lbd-px-note lbd-px-note--info lbd-rise">
          <strong>Buscando con OpenStreetMap, gratis.</strong> Trae muchos locales pero pocos teléfonos y ninguna reseña: sirve para llamar y para armar
          tu ruta de visitas. Cuando pongas <span className="lbd-mono">GOOGLE_PLACES_API_KEY</span> en Vercel, la búsqueda diaria pasa a Google sola y los
          locales repetidos se actualizan en vez de duplicarse.
        </div>
      )}

      <section className="lbd-card lbd-px-search lbd-rise" style={{ animationDelay: ".04s" }} aria-label="Buscar ahora">
        <div className="lbd-px-search-text">
          <span className="lbd-mono lbd-bl-eyebrow">BUSCAR AHORA</span>
          <span>
            {hasKey
              ? `Cada mañana se buscan 5 combinaciones en Google y Lima completa vuelve a pasar cada ~${sweepDays} días.`
              : `Cada mañana se leen 2 distritos de OpenStreetMap y Lima completa pasa cada ~${sweepDays} días.`}{" "}
            Para no esperar, busca un distrito ya.
          </span>
        </div>
        <div className="lbd-px-search-form">
          <label className="lbd-px-sr" htmlFor="px-fuente">
            Fuente
          </label>
          <select id="px-fuente" className="lbd-input" value={searchSource} onChange={(e) => setSearchSource(e.target.value as "osm" | "google")}>
            <option value="osm">OpenStreetMap · gratis</option>
            <option value="google" disabled={!hasKey}>
              {hasKey ? "Google Maps" : "Google Maps · falta la clave"}
            </option>
          </select>
          <label className="lbd-px-sr" htmlFor="px-distrito">
            Distrito
          </label>
          <select id="px-distrito" className="lbd-input" value={searchDistrict} onChange={(e) => setSearchDistrict(e.target.value)}>
            {districtGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* OpenStreetMap returns the whole district and sorts each place
              into its kind, so the kind only applies to Google. */}
          {searchSource === "google" && (
            <>
              <label className="lbd-px-sr" htmlFor="px-tipo">
                Tipo de local
              </label>
              <select id="px-tipo" className="lbd-input" value={searchSegment} onChange={(e) => setSearchSegment(e.target.value as Segment)}>
                {SEGMENTS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
          <button type="button" className="lbd-btn lbd-btn--cream" disabled={isSearching} onClick={runSearch}>
            {isSearching ? "Buscando…" : searchSource === "osm" ? "Buscar el distrito" : "Buscar"}
          </button>
        </div>
      </section>

      <div className="lbd-filters lbd-rise" style={{ animationDelay: ".06s" }}>
        <label htmlFor="px-buscar" className="lbd-px-sr">
          Buscar prospecto
        </label>
        <div className="lbd-cu-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5bdb1" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input id="px-buscar" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, tipo o dirección" />
        </div>
        <label htmlFor="px-filtro-distrito" className="lbd-px-sr">
          Filtrar por distrito
        </label>
        <select id="px-filtro-distrito" className="lbd-input lbd-px-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="all">Todos los distritos</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="lbd-seg lbd-px-seg" role="group" aria-label="Tipo de local">
          <button type="button" aria-pressed={segment === "all"} className={segment === "all" ? "is-on" : undefined} onClick={() => setSegment("all")}>
            Todos
          </button>
          {SEGMENTS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={segment === id} className={segment === id ? "is-on" : undefined} onClick={() => setSegment(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="lbd-px-tabs lbd-rise" role="tablist" aria-label="Etapa" style={{ animationDelay: ".08s" }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : undefined} onClick={() => setTab(t.id)}>
            {t.label} <span className="lbd-mono">{count(t.id)}</span>
          </button>
        ))}
      </div>

      <section className="lbd-px-list lbd-swap" key={tab} aria-label={TABS.find((t) => t.id === tab)?.label}>
        {listed.length === 0 ? (
          <div className="lbd-empty">
            {prospects.length === 0
              ? "Todavía no hay prospectos. Busca un distrito arriba o espera la búsqueda de mañana."
              : tab === "hoy"
                ? "Nada pendiente para hoy con estos filtros."
                : "Nadie en esta etapa con estos filtros."}
          </div>
        ) : (
          listed.map(renderRow)
        )}
        {tab === "nuevo" && totals.nuevo > prospects.filter((p) => p.status === "nuevo").length && (
          <p className="lbd-px-more">Se muestran los {prospects.filter((p) => p.status === "nuevo").length} mejor puntuados de {totals.nuevo}.</p>
        )}
      </section>

      {opened &&
        host &&
        createPortal(
          <>
            <div className="lbd-ad-scrim" onMouseDown={() => setOpenId(null)} aria-hidden="true" />
            <aside className="lbd-ad-drawer" role="dialog" aria-modal="true" aria-label="Detalle del prospecto">
              <div className="lbd-ad-drawer-head">
                <div>
                  <span className="lbd-mono lbd-bl-eyebrow">{STATUS_LABEL[opened.status].toUpperCase()}</span>
                  <h2 className="lbd-display">{opened.name}</h2>
                  <span>{[opened.category, opened.district].filter(Boolean).join(" · ")}</span>
                </div>
                <button type="button" className="lbd-ad-ico" onClick={() => setOpenId(null)} aria-label="Cerrar" style={{ flexShrink: 0 }}>
                  ×
                </button>
              </div>

              <div className="lbd-ad-drawer-tiles">
                <div className="is-accent">
                  <span>Puntuación</span>
                  <strong className="lbd-display">{opened.score}</strong>
                </div>
                <div>
                  <span>Plan sugerido</span>
                  <strong className="lbd-display">{PLAN_LABELS[opened.plan]}</strong>
                </div>
              </div>

              <div className="lbd-ad-drawer-block">
                <span className="lbd-mono lbd-bl-eyebrow">EN GOOGLE MAPS</span>
                <span style={{ color: "#e2dbcf" }}>{ratingLabel(opened)}</span>
                {opened.address && <span style={{ color: "#c5bdb1", fontSize: 13 }}>{opened.address}</span>}
                {opened.phone && <span className="lbd-mono">{opened.phone}</span>}
                <span className="lbd-px-links">
                  {opened.mapsUrl && (
                    <a href={opened.mapsUrl} target="_blank" rel="noopener noreferrer">
                      Ver en Maps
                    </a>
                  )}
                  {opened.website && (
                    <a href={opened.website} target="_blank" rel="noopener noreferrer">
                      {opened.ownWebsite ? "Su web" : "Sus redes"}
                    </a>
                  )}
                </span>
                <span style={{ color: "#ada599", fontSize: 12 }}>
                  Encontrado con &ldquo;{opened.foundBy}&rdquo;{opened.lastTouchAt ? ` · último mensaje el ${dayLabel(opened.lastTouchAt)}` : ""}
                </span>
              </div>

              {opened.draft && opened.mobile ? (
                <div className="lbd-ad-drawer-block">
                  <label htmlFor="px-draft" className="lbd-mono lbd-bl-eyebrow">
                    MENSAJE {opened.touches + 1} DE {MAX_TOUCHES} · EDÍTALO SI QUIERES
                  </label>
                  <textarea id="px-draft" className="lbd-input lbd-px-draft" value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
                </div>
              ) : opened.draft && !opened.mobile ? (
                <p className="lbd-px-note" style={{ margin: 0 }}>
                  {opened.phone
                    ? "Este local solo publica un teléfono fijo, sin WhatsApp. Llama o pasa por el local."
                    : "Este local no publica teléfono. Búscalo en Maps o en sus redes, o pasa por el local."}
                </p>
              ) : null}

              <div className="lbd-ad-drawer-actions">
                {opened.draft && opened.mobile && (
                  <a
                    href={whatsappLink(opened.mobile, draft.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lbd-wa"
                    style={{ marginTop: 0 }}
                    aria-disabled={!draft.trim() || isPending}
                    onClick={(event) => {
                      if (!draft.trim() || isPending) {
                        event.preventDefault();
                        return;
                      }
                      sent(opened);
                    }}
                  >
                    Abrir WhatsApp y enviar
                  </a>
                )}
                {opened.status === "contactado" && (
                  <button
                    type="button"
                    disabled={isPending}
                    className="lbd-btn lbd-btn--ghost"
                    onClick={() => {
                      move(opened.id, "respondio");
                      setOpenId(null);
                    }}
                  >
                    Respondió
                  </button>
                )}
                {opened.status === "respondio" && (
                  <button
                    type="button"
                    disabled={isPending}
                    className="lbd-btn lbd-btn--solid"
                    onClick={() => {
                      move(opened.id, "cliente");
                      setOpenId(null);
                    }}
                  >
                    Marcar cliente
                  </button>
                )}
                {opened.status === "descartado" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    className="lbd-btn lbd-btn--ghost"
                    onClick={() => {
                      move(opened.id, "nuevo");
                      setOpenId(null);
                    }}
                  >
                    Volver a nuevos
                  </button>
                ) : opened.status !== "cliente" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    className="lbd-btn lbd-btn--ghost"
                    onClick={() => {
                      move(opened.id, "descartado");
                      setOpenId(null);
                    }}
                  >
                    Descartar · no volver a escribir
                  </button>
                ) : null}
              </div>
            </aside>
          </>,
          host
        )}
    </>
  );
}
