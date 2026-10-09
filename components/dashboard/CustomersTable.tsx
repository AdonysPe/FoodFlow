"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  /** When they were first registered. */
  since: string;
  lastOrderAt: string | null;
  favourites: { name: string; count: number }[];
  channel: string | null;
};

type Segment = "all" | "repeat" | "new";

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "repeat", label: "Recurrentes" },
  { id: "new", label: "Nuevos" },
];

const AVATARS = [
  { bg: "#ff5a33", fg: "#0c0908" },
  { bg: "#f3efe6", fg: "#0c0908" },
  { bg: "#3a302b", fg: "#f3efe6" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "Hoy, 20:22", "Ayer", "Hace 3 días": how long ago, in a customer's terms. */
function lastLabel(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0 && new Date().getDate() === date.getDate()) return `Hoy, ${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  if (days <= 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 14) return "Hace 1 semana";
  if (days < 60) return `Hace ${Math.floor(days / 7)} semanas`;
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

function whatsappFor(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return `https://wa.me/${digits.length === 9 ? `51${digits}` : digits}`;
}

/**
 * Clientes, design B: three figures on top, a searchable list that can be cut
 * by how often they come back, and the selected customer on the right with
 * what they order and a WhatsApp button. Everything is read from the
 * restaurant's own customers and orders.
 */
export default function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const total = customers.length;
  const repeat = customers.filter((c) => c.ordersCount >= 2).length;
  const average = total > 0 ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / total : 0;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((c) => {
      const okSegment = segment === "all" || (segment === "repeat" ? c.ordersCount >= 2 : c.ordersCount < 2);
      return okSegment && (!needle || c.name.toLowerCase().includes(needle));
    });
  }, [customers, query, segment]);

  const selected = shown.find((c) => c.id === selectedId) ?? shown[0] ?? null;

  if (customers.length === 0) {
    return <div className="lbd-empty">Aún no hay clientes. Aparecerán aquí cuando registres pedidos con teléfono o correo.</div>;
  }

  return (
    <>
      <div className="lbd-cu-stats lbd-rise" style={{ animationDelay: ".05s" }}>
        <div className="lbd-card lbd-cu-stat">
          <span>Clientes</span>
          <strong className="lbd-display">{total}</strong>
        </div>
        <div className="lbd-card lbd-cu-stat">
          <span>Vuelven a pedir</span>
          <strong className="lbd-display">
            {total > 0 ? Math.round((repeat / total) * 100) : 0}
            <small>%</small>
          </strong>
        </div>
        <div className="lbd-card lbd-cu-stat">
          <span>Gasto medio por cliente</span>
          <strong className="lbd-display">{formatCurrency(average)}</strong>
        </div>
      </div>

      <div className="lbd-filters lbd-rise" style={{ animationDelay: ".08s" }}>
        <label htmlFor="cli-buscar" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Buscar cliente
        </label>
        <div className="lbd-cu-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input id="cli-buscar" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre" />
        </div>
        <div className="lbd-seg" role="group" aria-label="Segmento">
          {SEGMENTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={segment === s.id} className={segment === s.id ? "is-on" : undefined} onClick={() => setSegment(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lbd-or">
        <section className="lbd-card lbd-rise lbd-or-list" style={{ animationDelay: ".1s" }} aria-label="Lista de clientes">
          <div className="lbd-or-scroll">
            <div className="lbd-cu-grid lbd-or-head lbd-mono" aria-hidden>
              <span>NOMBRE</span>
              <span>CONTACTO</span>
              <span style={{ textAlign: "right" }}>PEDIDOS</span>
              <span style={{ textAlign: "right" }}>TOTAL GASTADO</span>
              <span>ÚLTIMO</span>
            </div>
            {shown.map((c, index) => {
              const avatar = AVATARS[index % AVATARS.length];
              return (
                <button key={c.id} type="button" aria-pressed={selected?.id === c.id} className={`lbd-cu-grid lbd-or-row${selected?.id === c.id ? " is-on" : ""}`} onClick={() => setSelectedId(c.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span className="lbd-cu-av" style={{ background: avatar.bg, color: avatar.fg }}>
                      {initials(c.name)}
                    </span>
                    <span className="lbd-or-cell" style={{ minWidth: 0 }}>
                      <span className="lbd-or-main lbd-trunc">{c.name}</span>
                      <span className="lbd-or-sub">{c.ordersCount >= 2 ? "Recurrente" : "Nuevo"}</span>
                    </span>
                  </span>
                  <span className="lbd-mono lbd-trunc" style={{ fontSize: 12, color: "#cfc7bb" }}>
                    {c.phone || c.email || "—"}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 14, fontWeight: 600 }}>{c.ordersCount}</span>
                  <span className="lbd-or-total">{formatCurrency(c.totalSpent)}</span>
                  <span style={{ fontSize: 12, color: "#a39b90" }}>{lastLabel(c.lastOrderAt)}</span>
                </button>
              );
            })}
            {shown.length === 0 && (
              <div className="lbd-empty" style={{ border: 0 }}>
                No hay clientes con ese nombre.
              </div>
            )}
          </div>
        </section>

        {selected && <CustomerDetail key={selected.id} customer={selected} avatar={AVATARS[Math.max(0, shown.indexOf(selected)) % AVATARS.length]} />}
      </div>
    </>
  );
}

function CustomerDetail({ customer, avatar }: { customer: CustomerRow; avatar: { bg: string; fg: string } }) {
  const max = Math.max(1, ...customer.favourites.map((f) => f.count));
  const wa = whatsappFor(customer.phone);
  const contact = customer.phone || customer.email;

  return (
    <aside className="lbd-card lbd-card--glass lbd-or-detail lbd-swap" aria-label="Detalle del cliente">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="lbd-cu-av lbd-cu-av--lg" style={{ background: avatar.bg, color: avatar.fg }}>
          {initials(customer.name)}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="lbd-display lbd-trunc" style={{ fontSize: 26, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {customer.name}
          </span>
          <span style={{ fontSize: 13, color: "#a39b90" }}>
            {customer.ordersCount >= 2 ? "Recurrente" : "Nuevo"} · cliente desde {new Date(customer.since).toLocaleDateString("es-PE", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div className="lbd-cu-mini">
          <span>Pedidos</span>
          <strong className="lbd-display">{customer.ordersCount}</strong>
        </div>
        <div className="lbd-cu-mini">
          <span>Gastado</span>
          <strong className="lbd-display">{formatCurrency(customer.totalSpent)}</strong>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="lbd-cm-eyebrow">Sus favoritos</span>
        {customer.favourites.length === 0 ? (
          <span style={{ fontSize: 13, color: "#8a8278" }}>Aún no hay pedidos registrados a su nombre.</span>
        ) : (
          customer.favourites.map((f) => (
            <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                <span>{f.name}</span>
                <span style={{ color: "#a39b90", flexShrink: 0 }}>{f.count} {f.count === 1 ? "vez" : "veces"}</span>
              </div>
              <div className="lbd-track">
                <div className="lbd-bar" style={{ width: `${Math.round((f.count / max) * 100)}%`, background: "#ff5a33" }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#cfc7bb" }}>
        <span className="lbd-cm-eyebrow">Contacto</span>
        <span className="lbd-mono" style={{ wordBreak: "break-all" }}>
          {contact || "Sin contacto registrado"}
        </span>
        {customer.channel && <span>Canal habitual · {customer.channel}</span>}
      </div>

      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="lbd-wa">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" />
          </svg>
          Escribir por WhatsApp
        </a>
      ) : customer.email ? (
        <a href={`mailto:${customer.email}`} className="lbd-btn lbd-btn--ghost" style={{ marginTop: "auto" }}>
          Escribir por correo
        </a>
      ) : null}
    </aside>
  );
}
