"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { fieldClass, ghostButtonClass } from "@/components/dashboard/menu/ui";
import { saveOrderingWebsite, setOrderingPaused } from "@/lib/actions/orderingWebsite";
import { ONLINE_PAYMENT_METHODS, type OrderingSettings } from "@/lib/orderingWebsite";
import { CARTA_DAYS, type DayHours } from "@/lib/carta";
import { PAYMENT_METHOD_LABELS } from "@/lib/paymentMeta";
import { formatCurrency } from "@/lib/format";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import TableOrderExperience from "@/components/public/TableOrderExperience";
import type { readOrderingWebsite } from "@/lib/db/orderingWebsite";

type Props = { name: string; slug: string | null; initial: OrderingSettings; generalHours: DayHours[]; hasGeneralHours: boolean; address: string; availableItems: number; templateName: string; preview: Awaited<ReturnType<typeof readOrderingWebsite>>; summary: { count: number; total: number } };
export default function OrderingWebsiteSettings({ name, slug, initial, generalHours, hasGeneralHours, address, availableItems, templateName, preview, summary }: Props) {
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(!slug);
  const [showPreview, setShowPreview] = useState(false);
  const [viewport, setViewport] = useState("mobile");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useDashboardStore(s => s.pushToast);
  const publicPath = slug ? `/pedido/${slug}` : "";
  const state = !initial.active ? "Inactiva" : initial.paused || !initial.accepting ? "Temporalmente pausada" : "Activa";
  const running = initial.active && !initial.paused && initial.accepting;
  const requirements = [
    { ok: address.trim().length > 0, label: "Dirección del local configurada en Carta pública", href: "/dashboard/app/menu/carta" },
    { ok: form.hours !== null || hasGeneralHours, label: "Horarios generales o exclusivos para pedidos web", href: "/dashboard/app/menu/carta" },
    { ok: availableItems > 0, label: "Al menos un producto disponible en una categoría activa", href: "/dashboard/app/menu" },
    { ok: form.delivery || form.pickup, label: "Delivery o recojo habilitado" },
    { ok: !form.delivery || form.zones.some(zone => zone.available), label: "Al menos una zona disponible si usas delivery" },
    { ok: form.payments.length > 0, label: "Al menos un método de pago" },
  ];
  const set = <K extends keyof OrderingSettings>(key: K, value: OrderingSettings[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const toggle = (key: "active" | "paused" | "accepting" | "delivery" | "pickup", label: string) => <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />{label}</label>;
  const number = (key: "minimum" | "preparationMinutes" | "deliveryMinutes" | "pickupMinutes", label: string) => <label className="grid gap-2 text-sm">{label}<input className={fieldClass} type="number" min={key === "minimum" ? 0 : 1} max={key === "minimum" ? 100000 : 360} step={key === "minimum" ? ".01" : "1"} required value={form[key]} onChange={e => set(key, Number(e.target.value))} /></label>;
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).href); toast("Enlace copiado.", "success"); }
    catch { toast("No se pudo copiar. Selecciona el enlace para copiarlo.", "error"); }
  }
  function save() { startTransition(async () => {
    try { const result = await saveOrderingWebsite(form); setError(result.ok ? "" : result.error); toast(result.ok ? "Configuración guardada." : result.error, result.ok ? "success" : "error"); if (result.ok) { setEditing(false); router.refresh(); } }
    catch { setError("No se pudo guardar. Inténtalo de nuevo."); toast("No se pudo guardar. Inténtalo de nuevo.", "error"); }
  }); }
  function pause() { startTransition(async () => {
    try {
      const result = running
        ? await setOrderingPaused(true)
        : await saveOrderingWebsite({ ...form, active: true, paused: false, accepting: true });
      setError(result.ok ? "" : result.error);
      toast(result.ok ? (running ? "Pedidos pausados." : "Web de pedidos activada.") : result.error, result.ok ? "success" : "error");
      if (result.ok) router.refresh();
    }
    catch { setError("No se pudo actualizar el estado."); toast("No se pudo actualizar el estado.", "error"); }
  }); }
  return <div className="flex flex-col gap-6">
    <div><h2 className="font-display text-2xl font-bold">Tu restaurante, tu web de pedidos</h2><p className="mt-2 text-sm text-muted">{name} · {templateName}. El mismo menú y la misma cocina para delivery y recojo.</p></div>
    <GlassCard className="p-5" hoverLift={false}>
      <p className="font-semibold">Web {state.toLowerCase()}</p>
      <p className="my-3 break-all font-mono text-sm">{publicPath || "Guarda la configuración para obtener tu enlace estable."}</p>
      <div className="flex flex-wrap gap-3">
        {slug && <><Link className={ghostButtonClass} href={publicPath} target="_blank">Ver mi web</Link><button type="button" className={ghostButtonClass} onClick={copyLink}>Copiar enlace</button></>}
        <button type="button" className={ghostButtonClass} onClick={() => setEditing(!editing)}>Configurar</button>
        <button type="button" className={ghostButtonClass} disabled={pending} onClick={pause}>{running ? "Pausar pedidos" : "Activar pedidos"}</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-accent-500/10 px-3 py-2 text-sm text-accent-ink">{error}</p>}
    </GlassCard>
    <GlassCard className="p-5" hoverLift={false}>
      <h3 className="font-semibold">Requisitos para activar</h3>
      <ul className="mt-3 grid gap-2 text-sm">
        {requirements.map(requirement => <li key={requirement.label} className={requirement.ok ? "text-mint-ink" : "text-accent-ink"}>
          <span aria-hidden>{requirement.ok ? "✓" : "○"}</span>{" "}
          {requirement.href ? <Link className="underline" href={requirement.href}>{requirement.label}</Link> : requirement.label}
        </li>)}
      </ul>
      <p className="mt-3 text-xs text-muted">El botón Activar pedidos guarda también los cambios que tengas abiertos en este formulario.</p>
    </GlassCard>
    <p className="text-sm text-muted">{summary.count} pedidos recibidos por la web · {formatCurrency(summary.total)} en pedidos. <Link className="underline" href="/dashboard/app/orders?source=web">Ver pedidos</Link></p>
    {editing && <form onSubmit={e => { e.preventDefault(); save(); }} className="flex flex-col gap-5">
      <GlassCard className="p-5" hoverLift={false}>
        <h3 className="font-semibold">Datos del restaurante</h3><p className="my-3 text-sm text-muted">Nombre: {name}. Dirección: {address || "Pendiente"}. Plantilla: {templateName}.</p>
        <p className="text-sm">El logo, la descripción, el teléfono y los horarios se toman de <Link className="underline" href="/dashboard/app/menu/carta">Carta pública</Link>. Los productos se administran en <Link className="underline" href="/dashboard/app/menu">Menú</Link>. La categoría y la plantilla conservan la asignación de FoodFlow.</p>
        <label className="mt-4 grid gap-2 text-sm">Portada (enlace de imagen)<input className={fieldClass} maxLength={500} placeholder="https://…" value={form.coverUrl} onChange={e => set("coverUrl", e.target.value)} /></label>
      </GlassCard>
      <GlassCard className="p-5" hoverLift={false}><h3 className="font-semibold">Estado y modalidades</h3><div className="mt-3 grid gap-x-6 sm:grid-cols-2">{toggle("active", "Web activa")}{toggle("paused", "Web pausada")}{toggle("accepting", "Aceptar pedidos ahora")}{toggle("delivery", "Delivery")}{toggle("pickup", "Recojo en local")}</div></GlassCard>
      <GlassCard className="p-5" hoverLift={false}><h3 className="mb-4 font-semibold">Pedidos</h3><div className="grid gap-4 sm:grid-cols-2">{number("minimum", "Pedido mínimo (S/)")}{number("preparationMinutes", "Preparación estimada (min)")}{number("deliveryMinutes", "Tiempo total hasta la entrega (min)")}{number("pickupMinutes", "Tiempo hasta el recojo (min)")}</div>
        <label className="mt-4 grid gap-2 text-sm">Instrucciones para el cliente<input className={fieldClass} maxLength={300} value={form.instructions} onChange={e => set("instructions", e.target.value)} /></label>
        <label className="mt-4 grid gap-2 text-sm">Indicaciones de recojo<input className={fieldClass} maxLength={300} value={form.pickupInstructions} onChange={e => set("pickupInstructions", e.target.value)} /></label>
      </GlassCard>
      <GlassCard className="p-5" hoverLift={false}><h3 className="font-semibold">Zonas de delivery</h3>
        {form.zones.map((zone, index) => <fieldset key={zone.id} className="my-4 grid gap-3 rounded-xl border border-fg/10 p-4 sm:grid-cols-3"><legend>Zona {index + 1}</legend>
          {([['name', 'Distrito o zona'], ['fee', 'Tarifa (S/)'], ['minimum', 'Mínimo (S/)']] as const).map(([key, label]) => <label key={key} className="grid gap-2 text-sm">{label}<input className={fieldClass} required type={key === "name" ? "text" : "number"} min={0} step=".01" maxLength={80} value={zone[key]} onChange={e => set("zones", form.zones.map(z => z.id === zone.id ? { ...z, [key]: key === "name" ? e.target.value : Number(e.target.value) } : z))} /></label>)}
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={zone.available} onChange={e => set("zones", form.zones.map(z => z.id === zone.id ? { ...z, available: e.target.checked } : z))} />Disponible</label><button type="button" className={ghostButtonClass} onClick={() => set("zones", form.zones.filter(z => z.id !== zone.id))}>Eliminar zona</button>
        </fieldset>)}
        <button type="button" className={`mt-3 ${ghostButtonClass}`} disabled={form.zones.length >= 50} onClick={() => set("zones", [...form.zones, { id: crypto.randomUUID(), name: "", fee: 0, minimum: 0, available: true }])}>Agregar zona</button>
      </GlassCard>
      <GlassCard className="p-5" hoverLift={false}><h3 className="font-semibold">Horarios · hora de Perú</h3><label className="my-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={form.hours !== null} onChange={e => set("hours", e.target.checked ? generalHours : null)} />Usar un horario distinto para pedidos web</label>
        {form.hours ? form.hours.map(row => <div key={row.day} className="mb-3 flex flex-wrap items-center gap-3"><span className="w-24 text-sm">{CARTA_DAYS[row.day]}</span><label><input type="checkbox" checked={row.closed} onChange={e => set("hours", form.hours!.map(h => h.day === row.day ? { ...h, closed: e.target.checked } : h))} /> Cerrado</label>{!row.closed && (['open', 'close'] as const).map(key => <input key={key} aria-label={`${CARTA_DAYS[row.day]} ${key === "open" ? "apertura" : "cierre"}`} className={`${fieldClass} max-w-36`} type="time" required value={row[key]} onChange={e => set("hours", form.hours!.map(h => h.day === row.day ? { ...h, [key]: e.target.value } : h))} />)}</div>) : <p className="text-sm text-muted">Usa los horarios configurados en Carta pública. Fuera de horario se muestra el menú, pero no se reciben pedidos.</p>}
      </GlassCard>
      <GlassCard className="p-5" hoverLift={false}><h3 className="font-semibold">Métodos de pago</h3><p className="my-3 text-sm text-muted">Cobro manual con los métodos de FoodFlow. Los pedidos se registran pendientes de pago.</p>
        {ONLINE_PAYMENT_METHODS.map(method => { const selected = form.payments.find(p => p.method === method); return <div key={method} className="mb-4"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={!!selected} onChange={e => set("payments", e.target.checked ? [...form.payments, { method, instructions: "" }] : form.payments.filter(p => p.method !== method))} />{PAYMENT_METHOD_LABELS[method]}</label>{selected && <label className="grid gap-2 text-sm">Instrucciones de pago (destinatario y número o cuenta)<input className={fieldClass} maxLength={300} required={method !== "efectivo"} value={selected.instructions} onChange={e => set("payments", form.payments.map(p => p.method === method ? { ...p, instructions: e.target.value } : p))} /></label>}</div>; })}
      </GlassCard>
      <button disabled={pending} className="min-h-11 rounded-xl bg-accent-500 px-5 py-3 font-semibold text-on-accent disabled:opacity-40">{pending ? "Guardando…" : "Guardar configuración"}</button>
    </form>}
    <div className="flex flex-wrap gap-3"><button type="button" className={ghostButtonClass} onClick={() => setShowPreview(!showPreview)}>Vista previa</button>{showPreview && <><button className={ghostButtonClass} aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Móvil</button><button className={ghostButtonClass} aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Escritorio</button></>}</div>
    {showPreview && (preview ? <div className="overflow-auto rounded-2xl border border-fg/10" style={{ maxHeight: 800 }}><TableOrderExperience key={viewport} code={slug!} initial={preview} remote preview previewViewport={viewport} /></div> : <p>Guarda la configuración para ver la vista previa.</p>)}
  </div>;
}
