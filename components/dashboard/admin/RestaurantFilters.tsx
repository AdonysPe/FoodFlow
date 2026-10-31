"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Search and filters for the platform restaurant list, design B.
 *
 * The state lives in the URL, not in this component: the list is a server
 * component that reads `searchParams`, so a filtered view can be reloaded,
 * bookmarked and sent to someone else, and the back button steps through the
 * searches you actually made.
 *
 * `useTransition` keeps the current results on screen and dims them while the
 * server sends the next page, instead of blanking the list on every keystroke.
 */

export type FilterOption = { value: string; label: string };

const ALL = "todas";
/** Long enough that typing a venue name does not fire a query per letter. */
const DEBOUNCE_MS = 300;

const PLAN_OPTIONS: FilterOption[] = [
  { value: ALL, label: "Todos" },
  { value: "carta", label: "Carta" },
  { value: "servicio", label: "Servicio" },
  { value: "negocio", label: "Negocio" },
];

const BILL_OPTIONS: FilterOption[] = [
  { value: ALL, label: "Todo cobro" },
  { value: "active", label: "Activo" },
  { value: "trialing", label: "En prueba" },
  { value: "past_due", label: "Atrasado" },
];

export default function RestaurantFilters({
  categories,
  templates,
  resultCount,
  totalCount,
}: {
  categories: FilterOption[];
  templates: FilterOption[];
  resultCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? "";
  const plan = searchParams.get("plan") ?? ALL;
  const bill = searchParams.get("cobro") ?? ALL;
  const category = searchParams.get("categoria") ?? ALL;
  const template = searchParams.get("plantilla") ?? ALL;

  // The input is typed into locally and pushed to the URL on a debounce, so
  // the field never fights the value coming back from the server.
  const [query, setQuery] = useState(urlQuery);
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  function push(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    // Any change to the filters invalidates the page number: page 4 of the old
    // result set is rarely page 4 of the new one.
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => push({ q: query }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `push` closes over the current params; re-running on a param change
    // would re-fire the search that just landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, urlQuery]);

  const filtered = Boolean(urlQuery) || plan !== ALL || bill !== ALL || category !== ALL || template !== ALL;

  return (
    <div className="lbd-filters lbd-rise" style={{ animationDelay: ".07s", opacity: isPending ? 0.7 : 1 }}>
      <label htmlFor="restaurant-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Buscar restaurante por nombre o correo del dueño
      </label>
      <div className="lbd-cu-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5bdb1" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4-4" />
        </svg>
        <input id="restaurant-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o correo del dueño" />
      </div>

      <div className="lbd-seg" role="group" aria-label="Plan">
        {PLAN_OPTIONS.map((option) => (
          <button key={option.value} type="button" aria-pressed={plan === option.value} className={plan === option.value ? "is-on" : undefined} onClick={() => push({ plan: option.value })}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="lbd-seg" role="group" aria-label="Cobro">
        {BILL_OPTIONS.map((option) => (
          <button key={option.value} type="button" aria-pressed={bill === option.value} className={bill === option.value ? "is-on" : undefined} onClick={() => push({ cobro: option.value })}>
            {option.label}
          </button>
        ))}
      </div>

      <label htmlFor="filter-category" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Filtrar por categoría
      </label>
      <select id="filter-category" value={category} onChange={(event) => push({ categoria: event.target.value })} className="lbd-switch lbd-ad-select">
        <option value={ALL}>Todas las categorías</option>
        {categories.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor="filter-template" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Filtrar por plantilla
      </label>
      <select id="filter-template" value={template} onChange={(event) => push({ plantilla: event.target.value })} className="lbd-switch lbd-ad-select">
        <option value={ALL}>Todas las plantillas</option>
        {templates.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {filtered && (
        <button
          type="button"
          className="lbd-bl-link"
          onClick={() => {
            setQuery("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          Limpiar
        </button>
      )}

      {/* One live region for both states, so a screen reader hears the count
          settle rather than hearing "cargando" and nothing after it. */}
      <p aria-live="polite" className="lbd-ad-result">
        {isPending ? "Buscando…" : filtered ? `${resultCount} de ${totalCount} locales` : `${totalCount} locales`}
      </p>
    </div>
  );
}
