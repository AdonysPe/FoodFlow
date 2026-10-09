"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import { fieldClass } from "@/components/dashboard/menu/ui";
import { saveOrderingWebsite, setOrderingPaused } from "@/lib/actions/orderingWebsite";
import { ONLINE_PAYMENT_METHODS, type OrderingSettings } from "@/lib/orderingWebsite";
import { CARTA_DAYS, type DayHours } from "@/lib/carta";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import { formatCurrency } from "@/lib/format";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import TableOrderExperience from "@/components/public/TableOrderExperience";
import type { readOrderingWebsite } from "@/lib/db/orderingWebsite";

export type SampleDish = { id: string; name: string; price: number; photoUrl: string | null };

type Props = {
  name: string;
  slug: string | null;
  initial: OrderingSettings;
  generalHours: DayHours[];
  hasGeneralHours: boolean;
  address: string;
  availableItems: number;
  sampleItems: SampleDish[];
  templateName: string;
  preview: Awaited<ReturnType<typeof readOrderingWebsite>>;
  summary: { count: number; total: number };
};

type SwitchKey = "active" | "paused" | "accepting" | "delivery" | "pickup";
type NumberKey = "minimum" | "preparationMinutes" | "deliveryMinutes" | "pickupMinutes";

const SWITCHES: { key: SwitchKey; label: string; hint: string }[] = [
  { key: "active", label: "Web activa", hint: "Tus clientes pueden ver tu página" },
  { key: "accepting", label: "Aceptar pedidos ahora", hint: "Apágalo si la cocina está llena" },
  { key: "paused", label: "Pedidos pausados", hint: "Pausa temporal; también desde el botón de arriba" },
  { key: "delivery", label: "Delivery", hint: "Envíos a tus zonas" },
  { key: "pickup", label: "Recojo en local", hint: "El cliente pasa a recoger" },
];

const NUMBERS: { key: NumberKey; label: string; step: number; min: number; max: number }[] = [
  { key: "minimum", label: "Pedido mínimo (S/)", step: 5, min: 0, max: 100000 },
  { key: "preparationMinutes", label: "Preparación estimada (min)", step: 5, min: 1, max: 240 },
  { key: "deliveryMinutes", label: "Tiempo total hasta la entrega (min)", step: 5, min: 1, max: 360 },
  { key: "pickupMinutes", label: "Tiempo hasta el recojo (min)", step: 5, min: 1, max: 240 },
];

/**
 * Web de pedidos, design B: what is still missing before the site can take
 * orders, the switches and numbers that shape it, the delivery zones and the
 * payment methods, and a phone that redraws as the owner changes them. The
 * full public page can still be opened below, exactly as the diner sees it.
 *
 * Everything is editable at once and saved with one button; "Activar pedidos"
 * saves what is open too, as before.
 */
export default function OrderingWebsiteSettings({ name, slug, initial, generalHours, hasGeneralHours, address, availableItems, sampleItems, templateName, preview, summary }: Props) {
  const [form, setForm] = useState(initial);
  const [showPreview, setShowPreview] = useState(false);
  const [viewport, setViewport] = useState("mobile");
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useDashboardStore((s) => s.pushToast);

  const publicPath = slug ? `/pedido/${slug}` : "";
  const running = initial.active && !initial.paused && initial.accepting;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const state = !initial.active ? "Web desactivada" : !initial.paused && initial.accepting ? "Recibiendo pedidos" : "Pausada";

  const requirements = [
    { ok: address.trim().length > 0, label: "Dirección del local configurada en Carta pública", href: "/dashboard/app/menu/carta" },
    { ok: form.hours !== null || hasGeneralHours, label: "Horarios generales o exclusivos para pedidos web", href: "/dashboard/app/menu/carta" },
    { ok: availableItems > 0, label: "Al menos un producto disponible en una categoría activa", href: "/dashboard/app/menu" },
    { ok: form.delivery || form.pickup, label: "Delivery o recojo habilitado" },
    { ok: !form.delivery || form.zones.some((zone) => zone.available), label: "Al menos una zona disponible si usas delivery" },
    { ok: form.payments.length > 0, label: "Al menos un método de pago" },
  ];
  const okCount = requirements.filter((r) => r.ok).length;
  const allOk = okCount === requirements.length;

  const set = <K extends keyof OrderingSettings>(key: K, value: OrderingSettings[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).href);
      toast("Enlace copiado.", "success");
    } catch {
      toast("No se pudo copiar. Selecciona el enlace para copiarlo.", "error");
    }
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await saveOrderingWebsite(form);
        setError(result.ok ? "" : result.error);
        toast(result.ok ? "Configuración guardada." : result.error, result.ok ? "success" : "error");
        if (result.ok) router.refresh();
      } catch {
        setError("No se pudo guardar. Inténtalo de nuevo.");
        toast("No se pudo guardar. Inténtalo de nuevo.", "error");
      }
    });
  }

  function pause() {
    startTransition(async () => {
      try {
        const result = running ? await setOrderingPaused(true) : await saveOrderingWebsite({ ...form, active: true, paused: false, accepting: true });
        setError(result.ok ? "" : result.error);
        toast(result.ok ? (running ? "Pedidos pausados." : "Web de pedidos activada.") : result.error, result.ok ? "success" : "error");
        if (result.ok) router.refresh();
      } catch {
        setError("No se pudo actualizar el estado.");
        toast("No se pudo actualizar el estado.", "error");
      }
    });
  }

  // ---- the phone, drawn from what is on screen (not from what was saved)
  const modes = [form.delivery && ("delivery" as const), form.pickup && ("pickup" as const)].filter(Boolean) as ("delivery" | "pickup")[];
  const shownMode = modes.includes(mode) ? mode : (modes[0] ?? null);
  const openZones = form.zones.filter((zone) => zone.available);
  const minFee = openZones.length ? Math.min(...openZones.map((zone) => zone.fee)) : 0;
  const canOrder = form.active && form.accepting && !form.paused && allOk;
  const eta =
    shownMode === "delivery"
      ? `Entrega en ~${form.deliveryMinutes} min · envío desde ${formatCurrency(minFee)}${openZones.length ? ` · ${openZones.map((zone) => zone.name).filter(Boolean).join(", ")}` : ""}`
      : shownMode === "pickup"
        ? `Listo para recoger en ~${form.pickupMinutes} min`
        : "Sin modalidades activas";
  const payList = form.payments.map((p) => PAYMENT_METHOD_LABELS[p.method]).join(", ") || "—";
  const cover = form.coverUrl || sampleItems.find((item) => item.photoUrl)?.photoUrl || null;

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="NEGOCIO · WEB DE PEDIDOS" title="Tu restaurante, tu web de pedidos" description={`${name} · ${templateName}. El mismo menú y la misma cocina para delivery y recojo.`}>
        <span className="lbd-wp-live" data-state={!initial.active ? "off" : !allOk ? "missing" : running ? "on" : "paused"}>
          <i className="lbd-pulse" aria-hidden />
          {initial.active && !allOk ? "Faltan requisitos" : state}
        </span>
        <span className="lbd-wp-link lbd-mono">{publicPath || "Guarda para obtener tu enlace"}</span>
      </PageHeader>

      <div className="lbd-wp-bar lbd-rise" style={{ animationDelay: ".03s" }}>
        {slug && (
          <>
            <Link className="lbd-btn lbd-btn--cream lbd-btn--sm" href={publicPath} target="_blank">
              Ver mi web
            </Link>
            <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" onClick={copyLink}>
              Copiar enlace
            </button>
          </>
        )}
        <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" disabled={pending} onClick={pause}>
          {running ? "Pausar pedidos" : "Activar pedidos"}
        </button>
        <span className="lbd-wp-orders">
          {summary.count} pedidos por la web · {formatCurrency(summary.total)}.{" "}
          <Link href="/dashboard/app/orders?source=web" style={{ textDecoration: "underline" }}>
            Ver pedidos
          </Link>
        </span>
      </div>
      {error && (
        <p role="alert" className="lbd-modal-error">
          {error}
        </p>
      )}

      <form
        className="lbd-wp"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="lbd-wp-main">
          <section className="lbd-card lbd-card--glass lbd-wp-card lbd-rise" style={{ animationDelay: ".04s" }} aria-label="Requisitos para activar">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 className="lbd-wp-h">Requisitos para activar</h2>
              <span style={{ fontSize: 13, fontWeight: 600, color: allOk ? "#3ddc97" : "#ff5a33" }}>{allOk ? "Lista para recibir pedidos" : `Faltan ${requirements.length - okCount}`}</span>
            </div>
            <div className="lbd-track lbd-track--thick" style={{ background: "rgba(243,239,230,0.08)" }}>
              <div style={{ height: "100%", borderRadius: 8, transition: "width .5s cubic-bezier(.2,.8,.2,1), background .3s", width: `${Math.round((okCount / requirements.length) * 100)}%`, background: allOk ? "#3ddc97" : "#ff5a33" }} />
            </div>
            <ul className="lbd-wp-reqs">
              {requirements.map((requirement) => (
                <li key={requirement.label} data-ok={requirement.ok}>
                  <span aria-hidden className="lbd-wp-req-dot">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d={requirement.ok ? "M5 12.5l4.5 4.5L19 7.5" : "M12 6v7M12 17.5v.5"} />
                    </svg>
                  </span>
                  {requirement.href && !requirement.ok ? (
                    <Link href={requirement.href} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                      {requirement.label}
                    </Link>
                  ) : (
                    requirement.label
                  )}
                </li>
              ))}
            </ul>
            <p className="lbd-bl-help" style={{ margin: 0 }}>
              El botón Activar pedidos guarda también los cambios que tengas abiertos aquí.
            </p>
          </section>

          <Card title="Estado y modalidades" delay=".08s">
            <div className="lbd-wp-switches">
              {SWITCHES.map((item) => (
                <Switch key={item.key} on={form[item.key]} onChange={(v) => set(item.key, v)} label={item.label} hint={item.hint} />
              ))}
            </div>
          </Card>

          <Card title="Pedidos" delay=".12s">
            <div className="lbd-wp-nums">
              {NUMBERS.map((item) => (
                <Stepper key={item.key} label={item.label} value={form[item.key]} step={item.step} min={item.min} max={item.max} onChange={(v) => set(item.key, v)} />
              ))}
            </div>
            <label className="lbd-wp-field">
              Instrucciones para el cliente
              <input className={fieldClass} maxLength={300} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
            </label>
            <label className="lbd-wp-field">
              Indicaciones de recojo
              <input className={fieldClass} maxLength={300} value={form.pickupInstructions} onChange={(e) => set("pickupInstructions", e.target.value)} />
            </label>
            <label className="lbd-wp-field">
              Portada (enlace de imagen)
              <input className={fieldClass} maxLength={500} placeholder="https://…" value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} />
              <small>
                El logo, la descripción, el teléfono y los horarios se toman de <Link href="/dashboard/app/menu/carta" style={{ textDecoration: "underline" }}>Carta pública</Link>; los productos, de <Link href="/dashboard/app/menu" style={{ textDecoration: "underline" }}>Menú</Link>.
              </small>
            </label>
          </Card>

          <div className="lbd-wp-two">
            <Card title="Zonas de delivery" delay=".16s" dim={!form.delivery}>
              {form.zones.length === 0 && <p className="lbd-bl-help" style={{ margin: 0 }}>Aún no tienes zonas. Agrega la primera.</p>}
              {form.zones.map((zone, index) => (
                <div key={zone.id} className="lbd-wp-zone">
                  <label className="lbd-wp-field">
                    Zona {index + 1}
                    <input className={fieldClass} required maxLength={80} placeholder="Distrito o zona" value={zone.name} onChange={(e) => set("zones", form.zones.map((z) => (z.id === zone.id ? { ...z, name: e.target.value } : z)))} />
                  </label>
                  <label className="lbd-wp-field">
                    Tarifa (S/)
                    <input className={fieldClass} required type="number" min={0} step=".01" value={zone.fee} onChange={(e) => set("zones", form.zones.map((z) => (z.id === zone.id ? { ...z, fee: Number(e.target.value) } : z)))} />
                  </label>
                  <label className="lbd-wp-field">
                    Mínimo (S/)
                    <input className={fieldClass} required type="number" min={0} step=".01" value={zone.minimum} onChange={(e) => set("zones", form.zones.map((z) => (z.id === zone.id ? { ...z, minimum: Number(e.target.value) } : z)))} />
                  </label>
                  <div className="lbd-wp-zone-actions">
                    <Switch compact on={zone.available} onChange={(v) => set("zones", form.zones.map((z) => (z.id === zone.id ? { ...z, available: v } : z)))} label={`${zone.name || `Zona ${index + 1}`} disponible`} />
                    <button type="button" className="lbd-bl-link" onClick={() => set("zones", form.zones.filter((z) => z.id !== zone.id))}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ alignSelf: "flex-start" }} disabled={form.zones.length >= 50} onClick={() => set("zones", [...form.zones, { id: crypto.randomUUID(), name: "", fee: 0, minimum: 0, available: true }])}>
                Agregar zona
              </button>
            </Card>

            <Card title="Métodos de pago" delay=".2s">
              <p className="lbd-bl-help" style={{ margin: 0 }}>
                Cobro manual con los métodos de FoodFlow. Los pedidos se registran pendientes de pago.
              </p>
              <div className="lbd-chips">
                {ONLINE_PAYMENT_METHODS.map((method) => {
                  const on = form.payments.some((p) => p.method === method);
                  return (
                    <button key={method} type="button" aria-pressed={on} className={`lbd-chip-btn${on ? " is-on" : ""}`} onClick={() => set("payments", on ? form.payments.filter((p) => p.method !== method) : [...form.payments, { method, instructions: "" }])}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  );
                })}
              </div>
              {form.payments.map((payment) => (
                <label key={payment.method} className="lbd-wp-field">
                  {PAYMENT_METHOD_LABELS[payment.method]}: instrucciones de pago {payment.method === "efectivo" ? "(opcional)" : "(destinatario y número o cuenta)"}
                  <input className={fieldClass} maxLength={300} required={payment.method !== "efectivo"} value={payment.instructions} onChange={(e) => set("payments", form.payments.map((p) => (p.method === payment.method ? { ...p, instructions: e.target.value } : p)))} />
                </label>
              ))}
            </Card>
          </div>

          <Card title="Horarios · hora de Perú" delay=".24s">
            <Switch on={form.hours !== null} onChange={(v) => set("hours", v ? generalHours : null)} label="Usar un horario distinto para pedidos web" hint="Si lo dejas apagado se usan los horarios de Carta pública" />
            {form.hours ? (
              form.hours.map((row) => (
                <div key={row.day} className="lbd-wp-hours">
                  <span>{CARTA_DAYS[row.day]}</span>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#cfc7bb" }}>
                    <input type="checkbox" checked={row.closed} onChange={(e) => set("hours", form.hours!.map((h) => (h.day === row.day ? { ...h, closed: e.target.checked } : h)))} /> Cerrado
                  </label>
                  {!row.closed &&
                    (["open", "close"] as const).map((key) => (
                      <input key={key} aria-label={`${CARTA_DAYS[row.day]} ${key === "open" ? "apertura" : "cierre"}`} className={`${fieldClass} lbd-wp-time`} type="time" required value={row[key]} onChange={(e) => set("hours", form.hours!.map((h) => (h.day === row.day ? { ...h, [key]: e.target.value } : h)))} />
                    ))}
                </div>
              ))
            ) : (
              <p className="lbd-bl-help" style={{ margin: 0 }}>
                Fuera de horario se muestra el menú, pero no se reciben pedidos.
              </p>
            )}
          </Card>

          <div className="lbd-bl-actions">
            <button type="submit" disabled={pending || !dirty} className="lbd-btn lbd-btn--solid">
              {pending && <span className="lbd-bl-spin is-dark" aria-hidden />}
              {pending ? "Guardando…" : "Guardar configuración"}
            </button>
            <button type="button" disabled={!dirty || pending} className="lbd-btn lbd-btn--ghost" onClick={() => setForm(initial)}>
              Cancelar
            </button>
            {dirty && <span className="lbd-bl-help" style={{ margin: 0 }}>Tienes cambios sin guardar.</span>}
          </div>
        </div>

        <aside className="lbd-wp-side" aria-label="Vista previa en vivo">
          <span className="lbd-mono lbd-bl-eyebrow">VISTA PREVIA EN VIVO</span>
          <div className="lbd-wp-phone">
            <div className="lbd-wp-screen">
              <div className="lbd-wp-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cover && <img src={cover} alt="" />}
                <div className="lbd-wp-cover-fade" />
                <div style={{ position: "absolute", left: 18, bottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="lbd-display" style={{ fontSize: 26, letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {name}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: canOrder ? "#3ddc97" : "#ff9a7d" }}>
                    <i style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                    {canOrder ? "Abierto · recibiendo pedidos" : "No estamos recibiendo pedidos ahora"}
                  </span>
                </div>
              </div>
              <div className="lbd-wp-body">
                {modes.length > 0 && (
                  <div className="lbd-wp-modes" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
                    {modes.map((m) => (
                      <button key={m} type="button" className={m === shownMode ? "is-on" : undefined} onClick={() => setMode(m)}>
                        {m === "delivery" ? "Delivery" : "Recojo"}
                      </button>
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 12, color: "#cfc7bb" }}>{eta}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sampleItems.length === 0 && <span style={{ fontSize: 12, color: "#8a8278" }}>Agrega platos en Menú para verlos aquí.</span>}
                  {sampleItems.map((item) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }} />
                      ) : (
                        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#241d19", flexShrink: 0 }} />
                      )}
                      <span className="lbd-trunc" style={{ flex: 1, fontSize: 13, fontWeight: 550 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 13, color: "#cfc7bb" }}>{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#a39b90" }}>Pagas con: {payList}</span>
                  <span style={{ fontSize: 11, color: "#a39b90" }}>Pedido mínimo {formatCurrency(form.minimum)}</span>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderRadius: 16, fontSize: 13, fontWeight: 600, background: canOrder ? "#ff5a33" : "#2a221e", color: canOrder ? "#0c0908" : "#8a8278" }}>
                    <span>{canOrder ? "Pedir ahora" : "Pedidos en pausa"}</span>
                  </span>
                </div>
              </div>
              {!form.active && (
                <div className="lbd-wp-off lbd-swap">
                  <span className="lbd-display" style={{ fontSize: 22 }}>
                    Web desactivada
                  </span>
                  <span style={{ fontSize: 13, color: "#a39b90" }}>Tus clientes no ven esta página hasta que la actives.</span>
                </div>
              )}
            </div>
          </div>
          <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Ocultar la vista completa" : "Ver la página completa"}
          </button>
        </aside>
      </form>

      {showPreview && (
        <div className="lbd-wp-full lbd-swap">
          <div className="lbd-seg" role="group" aria-label="Tamaño">
            <button type="button" aria-pressed={viewport === "mobile"} className={viewport === "mobile" ? "is-on" : undefined} onClick={() => setViewport("mobile")}>
              Móvil
            </button>
            <button type="button" aria-pressed={viewport === "desktop"} className={viewport === "desktop" ? "is-on" : undefined} onClick={() => setViewport("desktop")}>
              Escritorio
            </button>
          </div>
          {preview ? (
            <div style={{ overflow: "auto", borderRadius: 22, border: "1px solid rgba(243,239,230,0.1)", maxHeight: 800 }}>
              <TableOrderExperience key={viewport} code={slug!} initial={preview} remote preview previewViewport={viewport} />
            </div>
          ) : (
            <p className="lbd-bl-help">Guarda la configuración para ver la vista previa.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ title, delay, dim = false, children }: { title: string; delay: string; dim?: boolean; children: ReactNode }) {
  return (
    <section className="lbd-card lbd-wp-card lbd-rise" style={{ animationDelay: delay, opacity: dim ? 0.55 : 1 }} aria-label={title}>
      <h2 className="lbd-wp-h">{title}</h2>
      {children}
    </section>
  );
}

/** The prototype's switch: label and hint on the left, the track on the right. */
function Switch({ on, onChange, label, hint, compact = false }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="lbd-bl-track" data-on={on} style={{ border: 0, cursor: "pointer", width: 40, height: 24 }}>
        <i style={{ width: 18, height: 18, transform: on ? "translateX(16px)" : "none" }} />
      </button>
    );
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="lbd-bl-switch lbd-wp-switch">
      <span className="lbd-bl-switch-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className="lbd-bl-track" data-on={on}>
        <i />
      </span>
    </button>
  );
}

/** A number with − and + around it; the field itself still takes typing. */
function Stepper({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <div className="lbd-wp-num">
      <span>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button type="button" aria-label={`Bajar ${label}`} onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <input type="number" aria-label={label} min={min} max={max} step={step === 5 && min === 0 ? ".01" : "1"} required value={value} onChange={(e) => onChange(Number(e.target.value))} className="lbd-mono" />
        <button type="button" aria-label={`Subir ${label}`} onClick={() => onChange(clamp(value + step))}>
          +
        </button>
      </span>
    </div>
  );
}
