"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { saveCartaSettings } from "@/lib/actions/carta";
import { CARTA_DAYS, type DayHours } from "@/lib/carta";
import { fieldClass, labelClass } from "./ui";

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

export default function CartaSettingsForm({
  initial,
  siteUrl,
}: {
  initial: CartaFormValue;
  /** Origin the public link is built from, so dev and production agree. */
  siteUrl: string;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [value, setValue] = useState<CartaFormValue>(initial);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publicUrl = `${siteUrl.replace(/\/$/, "")}/carta/${value.slug || "tu-restaurante"}`;

  function set<K extends keyof CartaFormValue>(key: K, v: CartaFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function setDay(day: number, patch: Partial<DayHours>) {
    setValue((prev) => ({
      ...prev,
      hours: prev.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)),
    }));
  }

  /** Copies Monday's hours onto every other day — the usual case. */
  function applyToAll(day: number) {
    const source = value.hours.find((h) => h.day === day);
    if (!source) return;
    setValue((prev) => ({
      ...prev,
      hours: prev.hours.map((h) => ({
        ...h,
        closed: source.closed,
        open: source.open,
        close: source.close,
      })),
    }));
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
      pushToast(
        value.published ? "Carta publicada." : "Carta guardada (sin publicar).",
        "success"
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* ------------------------------------------------------- the address */}
      <section className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
        <h3 className="text-[14px] font-semibold text-fg">Dirección de tu carta</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg/45">
          Este es el enlace que pones en el QR, en tu Instagram y en tu ficha de Google.
          Si lo cambias, los QR ya impresos dejan de funcionar.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="carta-slug" className={labelClass}>
              Dirección
            </label>
            <div className="flex items-center gap-0">
              <span className="hidden h-11 items-center rounded-l-xl border border-r-0 border-fg/[0.1] bg-fg/[0.06] px-3 text-[13px] text-fg/40 sm:flex">
                foodflow.site/carta/
              </span>
              <input
                id="carta-slug"
                required
                value={value.slug}
                onChange={(e) =>
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="mi-restaurante"
                className={`${fieldClass} font-mono sm:rounded-l-none`}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="h-11 shrink-0 rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
          >
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3">
          <input
            type="checkbox"
            checked={value.published}
            onChange={(e) => set("published", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent-500)]"
          />
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium text-fg/85">
              Carta visible para el público
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-fg/40">
              Desmárcala para bajarla al instante sin perder nada de lo que configuraste.
            </span>
          </span>
        </label>
      </section>

      {/* -------------------------------------------------------- the header */}
      <section className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
        <h3 className="text-[14px] font-semibold text-fg">Encabezado</h3>
        <p className="mt-1 text-[12.5px] text-fg/45">
          Lo primero que ve el comensal al escanear, encima de los platos.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="carta-tagline" className={labelClass}>
              Frase corta <span className="text-fg/25">· opcional</span>
            </label>
            <input
              id="carta-tagline"
              value={value.tagline}
              maxLength={120}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Cocina peruana de siempre, en San Isidro"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="carta-logo" className={labelClass}>
              Logo <span className="text-fg/25">· enlace https</span>
            </label>
            <input
              id="carta-logo"
              type="url"
              value={value.logoUrl}
              maxLength={500}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://…/logo.png"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="carta-wa" className={labelClass}>
              WhatsApp de pedidos
            </label>
            <input
              id="carta-wa"
              inputMode="numeric"
              maxLength={9}
              value={value.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
              placeholder="987654321"
              className={fieldClass}
            />
            <p className="mt-1.5 text-[11.5px] text-fg/35">
              Sin el +51. Vacío quita el botón flotante de la carta.
            </p>
          </div>
          <div>
            <label htmlFor="carta-address" className={labelClass}>
              Dirección del local
            </label>
            <input
              id="carta-address"
              value={value.address}
              maxLength={160}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Av. Pardo y Aliaga 202, San Isidro"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="carta-maps" className={labelClass}>
              Enlace de Google Maps <span className="text-fg/25">· opcional</span>
            </label>
            <input
              id="carta-maps"
              type="url"
              value={value.mapsUrl}
              maxLength={500}
              onChange={(e) => set("mapsUrl", e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- the hours */}
      <section className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-fg">Horario</h3>
          <button
            type="button"
            onClick={() => applyToAll(1)}
            className="text-[12px] font-medium text-fg/45 underline decoration-fg/20 underline-offset-2 hover:text-fg/75"
          >
            Copiar el lunes a todos los días
          </button>
        </div>
        <p className="mt-1 text-[12.5px] text-fg/45">
          La carta muestra “Abierto ahora” o “Cerrado” según esta tabla. Un cierre
          anterior a la apertura significa que sigues hasta la madrugada.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {value.hours.map((h) => (
            <li
              key={h.day}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-fg/[0.06] bg-fg/[0.02] px-3.5 py-2.5"
            >
              <span className="w-[86px] shrink-0 text-[13px] font-medium text-fg/75">
                {CARTA_DAYS[h.day]}
              </span>

              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12.5px] text-fg/50">
                <input
                  type="checkbox"
                  checked={!h.closed}
                  onChange={(e) => setDay(h.day, { closed: !e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent-500)]"
                />
                Abierto
              </label>

              <div
                className={`flex items-center gap-2 ${h.closed ? "pointer-events-none opacity-35" : ""}`}
              >
                <input
                  type="time"
                  value={h.open}
                  aria-label={`Apertura ${CARTA_DAYS[h.day]}`}
                  onChange={(e) => setDay(h.day, { open: e.target.value })}
                  className="h-9 rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2.5 text-[13px] text-fg outline-none focus:border-accent-400/50"
                />
                <span className="text-fg/30">–</span>
                <input
                  type="time"
                  value={h.close}
                  aria-label={`Cierre ${CARTA_DAYS[h.day]}`}
                  onChange={(e) => setDay(h.day, { close: e.target.value })}
                  className="h-9 rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2.5 text-[13px] text-fg outline-none focus:border-accent-400/50"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="rounded-xl border border-accent-400/30 bg-accent-400/10 px-4 py-3 text-[13px] text-accent-label">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar carta"}
        </button>
      </div>
    </form>
  );
}
