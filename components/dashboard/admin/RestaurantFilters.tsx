"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Search and filters for the platform restaurant list.
 *
 * The state lives in the URL, not in this component: the list is a server
 * component that reads `searchParams`, so a filtered view can be reloaded,
 * bookmarked and sent to someone else, and the back button steps through the
 * searches you actually made.
 *
 * `useTransition` is what makes that bearable — it keeps the current results
 * on screen and dims them while the server sends the next page, instead of
 * blanking the table on every keystroke.
 */

export type FilterOption = { value: string; label: string };

const ALL = "todas";
/** Long enough that typing a venue name does not fire a query per letter. */
const DEBOUNCE_MS = 300;

const controlClass =
  "h-10 rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 text-[13.5px] text-fg outline-none transition-colors focus:border-accent-400/50";

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

  const filtered = Boolean(urlQuery) || category !== ALL || template !== ALL;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.02] p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="restaurant-search" className="sr-only">
          Buscar restaurante por nombre
        </label>
        <input
          id="restaurant-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o correo del dueño…"
          className={`${controlClass} w-full`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="filter-category" className="sr-only">
            Filtrar por categoría
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(event) => push({ categoria: event.target.value })}
            className={controlClass}
          >
            <option value={ALL}>Todas las categorías</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-template" className="sr-only">
            Filtrar por plantilla
          </label>
          <select
            id="filter-template"
            value={template}
            onChange={(event) => push({ plantilla: event.target.value })}
            className={controlClass}
          >
            <option value={ALL}>Todas las plantillas</option>
            {templates.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="h-10 rounded-lg border border-fg/15 px-3 text-[12.5px] font-semibold text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
          >
            Limpiar
          </button>
        )}

        {/* One live region for both states, so a screen reader hears the count
            settle rather than hearing "cargando" and nothing after it. */}
        <p
          aria-live="polite"
          className="min-w-[8.5rem] text-[12.5px] tabular-nums text-faint"
        >
          {isPending
            ? "Buscando…"
            : filtered
              ? `${resultCount} de ${totalCount}`
              : `${totalCount} restaurantes`}
        </p>
      </div>
    </div>
  );
}
