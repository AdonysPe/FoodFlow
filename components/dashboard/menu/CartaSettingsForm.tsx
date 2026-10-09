"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { saveCartaSettings } from "@/lib/actions/carta";
import { CARTA_DAYS, cartaPrice, isOpenAt, todayLabel, type DayHours } from "@/lib/carta";

export type CartaFormValue = {
  slug: string;
  published: boolean;
  tagline: string;
  address: string;
  logoUrl: string;
  mapsUrl: string;
  whatsapp: string;
  hours: DayHours[];
};

export type PreviewDish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  available: boolean;
  categoryName: string | null;
};

/**
 * The carta's settings, design B: the address and publication switch, the
 * header the diner sees, and the opening hours on the left; on the right a
 * phone that redraws as you type, and how updates reach the diner.
 *
 * What saves and how is what was here: `saveCartaSettings` with the whole
 * value, the slug rules and the "QR already printed" warning in the copy.
 */
export default function CartaSettingsForm({
  initial,
  siteUrl,
  venueName,
  previewDishes,
}: {
  initial: CartaFormValue;
  /** Origin the public link is built from, so dev and production agree. */
  siteUrl: string;
  venueName: string;
  /** A few real dishes, for the phone on the right. */
  previewDishes: PreviewDish[];
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [value, setValue] = useState<CartaFormValue>(initial);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publicUrl = `${siteUrl.replace(/\/$/, "")}/carta/${value.slug || "tu-restaurante"}`;
  const slugChanged = value.slug !== initial.slug;

  function set<K extends keyof CartaFormValue>(key: K, v: CartaFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function setDay(day: number, patch: Partial<DayHours>) {
    setValue((prev) => ({ ...prev, hours: prev.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)) }));
  }

  /** Copies Monday's hours onto every other day — the usual case. */
  function applyToAll(day: number) {
    const source = value.hours.find((h) => h.day === day);
    if (!source) return;
    setValue((prev) => ({ ...prev, hours: prev.hours.map((h) => ({ ...h, closed: source.closed, open: source.open, close: source.close })) }));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast("Copia el enlace manualmente.", "error");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveCartaSettings(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      pushToast(value.published ? "Carta publicada." : "Carta guardada (sin publicar).", "success");
      router.refresh();
    });
  }

  // The phone: what a diner would read right now with the values typed so far.
  const now = new Date();
  const open = isOpenAt(value.hours, now);
  const hoursLine = todayLabel(value.hours, now);
  const live = value.published && Boolean(value.slug);
  const categories = [...new Set(previewDishes.map((d) => d.categoryName ?? "Otros"))].slice(0, 3);
  const initials = venueName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <form onSubmit={submit} className="lbd-cp">
      <div className="lbd-cp-form">
        {/* ------------------------------------------------------- the address */}
        <section className="lbd-card lbd-rise lbd-cp-sec" style={{ animationDelay: ".08s" }} aria-label="Dirección de tu carta">
          <span className="lbd-ov-title">Dirección de tu carta</span>
          <span className="lbd-cp-note">Este es el enlace que pones en el QR, en tu Instagram y en tu ficha de Google. Si lo cambias, los QR ya impresos dejan de funcionar.</span>
          <label htmlFor="carta-slug" className="lbd-cp-label">
            Dirección
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className={`lbd-cp-slug${slugChanged ? " is-changed" : ""}`}>
              <span className="lbd-mono">foodflow.site/carta/</span>
              <input id="carta-slug" required value={value.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="mi-restaurante" className="lbd-mono" />
            </div>
            <button type="button" onClick={copyLink} className="lbd-btn lbd-btn--ghost" style={{ height: 46, minHeight: 46, borderRadius: 12 }}>
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>
          {slugChanged && <span className="lbd-pop lbd-cp-warn">Ojo: si guardas este cambio, los QR que ya imprimiste dejan de funcionar.</span>}

          <label className="lbd-cp-check">
            <input type="checkbox" className="lbd-lg-check" checked={value.published} onChange={(e) => set("published", e.target.checked)} />
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Carta visible para el público</span>
              <span style={{ fontSize: 12, color: "#a39b90" }}>Desmárcala para bajarla al instante sin perder nada de lo que configuraste.</span>
            </span>
          </label>
        </section>

        {/* -------------------------------------------------------- the header */}
        <section className="lbd-card lbd-rise lbd-cp-sec" style={{ animationDelay: ".12s" }} aria-label="Encabezado">
          <span className="lbd-ov-title">Encabezado</span>
          <span className="lbd-cp-note">Lo primero que ve el comensal al escanear, encima de los platos.</span>
          <div className="lbd-cp-fields">
            <label className="lbd-me-field">
              <span>
                Frase corta <em>· opcional</em>
              </span>
              <input id="carta-tagline" value={value.tagline} maxLength={120} onChange={(e) => set("tagline", e.target.value)} placeholder="Cocina peruana de siempre, en San Isidro" className="lbd-input" />
            </label>
            <label className="lbd-me-field">
              <span>
                Logo <em>· enlace https</em>
              </span>
              <input id="carta-logo" type="url" value={value.logoUrl} maxLength={500} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" className="lbd-input" />
            </label>
            <label className="lbd-me-field">
              <span>WhatsApp de pedidos</span>
              <input id="carta-wa" inputMode="numeric" maxLength={9} value={value.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} placeholder="987654321" className="lbd-input" />
              <small>Sin el +51. Vacío quita el botón flotante de la carta.</small>
            </label>
            <label className="lbd-me-field">
              <span>Dirección del local</span>
              <input id="carta-address" value={value.address} maxLength={160} onChange={(e) => set("address", e.target.value)} placeholder="Av. Pardo y Aliaga 202, San Isidro" className="lbd-input" />
            </label>
            <label className="lbd-me-field">
              <span>
                Enlace de Google Maps <em>· opcional</em>
              </span>
              <input id="carta-maps" type="url" value={value.mapsUrl} maxLength={500} onChange={(e) => set("mapsUrl", e.target.value)} placeholder="https://maps.app.goo.gl/…" className="lbd-input" />
            </label>
          </div>
        </section>

        {/* --------------------------------------------------------- the hours */}
        <section className="lbd-card lbd-rise lbd-cp-sec" style={{ animationDelay: ".16s" }} aria-label="Horario">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="lbd-ov-title">Horario</span>
            <button type="button" onClick={() => applyToAll(1)} className="lbd-link" style={{ border: 0, background: "transparent", fontWeight: 600, minHeight: 36, cursor: "pointer" }}>
              Copiar el lunes a todos los días
            </button>
          </div>
          <span className="lbd-cp-note">La carta muestra “Abierto ahora” o “Cerrado” según esta tabla. Un cierre anterior a la apertura significa que sigues hasta la madrugada.</span>
          <div>
            {value.hours.map((h) => {
              const late = !h.closed && h.close < h.open;
              return (
                <div key={h.day} className="lbd-cp-day">
                  <span style={{ width: 92, fontSize: 14, fontWeight: h.day === now.getDay() ? 600 : 450, color: h.day === now.getDay() ? "#f3efe6" : "#cfc7bb" }}>{CARTA_DAYS[h.day]}</span>
                  <label className="lbd-cp-closed">
                    <input type="checkbox" className="lbd-lg-check" style={{ width: 18, height: 18, borderRadius: 6 }} checked={h.closed} onChange={(e) => setDay(h.day, { closed: e.target.checked })} />
                    Cerrado
                  </label>
                  {!h.closed && (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="time" value={h.open} aria-label={`Apertura ${CARTA_DAYS[h.day]}`} onChange={(e) => setDay(h.day, { open: e.target.value })} className="lbd-input lbd-cp-time" />
                      <span style={{ color: "#8a8278" }}>–</span>
                      <input type="time" value={h.close} aria-label={`Cierre ${CARTA_DAYS[h.day]}`} onChange={(e) => setDay(h.day, { close: e.target.value })} className="lbd-input lbd-cp-time" />
                      {late && <span style={{ fontSize: 11, color: "#ff9a7d" }}>hasta la madrugada</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <p role="alert" className="lbd-modal-error">
            {error}
          </p>
        )}

        <div>
          <button type="submit" disabled={isPending} className="lbd-btn lbd-btn--solid" style={{ minWidth: 200 }}>
            {isPending ? "Guardando…" : "Guardar carta"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ preview */}
      <div className="lbd-cp-side">
        <span className="lbd-cm-eyebrow">Así la ve tu comensal</span>
        <div className="lbd-float lbd-cp-phone">
          <div className="lbd-cp-screen">
            <div className="lbd-cp-top">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {value.logoUrl.startsWith("https://") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={value.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 14, objectFit: "cover" }} />
                ) : (
                  <span className="lbd-display" style={{ width: 44, height: 44, borderRadius: 14, background: "#ff5a33", color: "#0c0908", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {initials || "FF"}
                  </span>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="lbd-display lbd-trunc" style={{ fontSize: 22, letterSpacing: "-0.04em" }}>
                    {venueName}
                  </span>
                  <span style={{ fontSize: 12, color: "#cfc7bb" }}>{value.tagline || " "}</span>
                </div>
              </div>
              <span className={`lbd-cp-open${open ? " is-open" : ""}`}>
                <i aria-hidden />
                {hoursLine}
              </span>
              {value.address && <span style={{ fontSize: 12, color: "#a39b90" }}>{value.address}</span>}
              {value.whatsapp && <span className="lbd-cp-wa">Pedir por WhatsApp</span>}
            </div>
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: 6, padding: "12px 16px", flexWrap: "wrap" }}>
                {categories.map((c, i) => (
                  <span key={c} className={`lbd-cp-chip${i === 0 ? " is-on" : ""}`}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {previewDishes.length === 0 && <span style={{ fontSize: 13, color: "#8a8278", padding: "12px 0" }}>Aún no hay platos visibles.</span>}
              {previewDishes.map((d) => (
                <div key={d.id} style={{ display: "flex", gap: 12, alignItems: "center", opacity: d.available ? 1 : 0.5 }}>
                  {d.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", filter: d.available ? "none" : "grayscale(1)" }} />
                  ) : (
                    <span style={{ width: 64, height: 64, borderRadius: 16, background: "#241d19", flexShrink: 0 }} aria-hidden />
                  )}
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</span>
                    {d.available ? d.description && <span className="lbd-trunc" style={{ fontSize: 12, color: "#a39b90" }}>{d.description}</span> : <span style={{ fontSize: 11, fontWeight: 600, alignSelf: "flex-start", padding: "2px 8px", borderRadius: 999, background: "rgba(243,239,230,0.12)" }}>Agotado</span>}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cartaPrice(d.price)}</span>
                  </span>
                </div>
              ))}
            </div>
            {!live && (
              <div className="lbd-cp-off">
                <span className="lbd-display" style={{ fontSize: 22 }}>
                  Carta no publicada
                </span>
                <span style={{ fontSize: 13, color: "#a39b90" }}>Quien escanee el QR verá un aviso hasta que la publiques.</span>
              </div>
            )}
          </div>
        </div>

        <section className="lbd-card lbd-cp-how" aria-label="Cómo se actualiza">
          <span style={{ fontSize: 15, fontWeight: 600 }}>Cómo se actualiza</span>
          <span>
            <strong>Al instante.</strong> Cambias un precio o marcas un plato como agotado en Menú y el teléfono del comensal se actualiza solo, sin recargar, en un par de segundos.
          </span>
          <span>
            <strong>Aunque falle la conexión.</strong> Si el wifi del local se cae, la carta sigue consultando cada 30 segundos; y si el comensal se queda sin datos, ve la última versión que cargó.
          </span>
          <span>
            <strong>Los agotados no desaparecen.</strong> Se muestran en gris con la etiqueta “Agotado”, para que el comensal sepa que el plato existe y no te lo pida.
          </span>
        </section>
      </div>
    </form>
  );
}
