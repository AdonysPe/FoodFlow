"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TemplateMiniature from "@/components/dashboard/TemplateMiniature";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { updateRestaurantCategoryTemplate } from "@/lib/actions/restaurantConfiguration";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";

/**
 * "Categoría y plantilla de la carta" — the one screen where a restaurant's
 * identity is set, and the only place in the product that can set it.
 *
 * The template select has a null option that is not an absence: "usar la
 * plantilla de la categoría" stores `menuTemplateOverride = null`, which means
 * the venue follows its category from then on, including if that category's
 * default is changed later. Picking a named template pins it instead. The
 * difference is invisible until the category default moves, so the summary
 * spells out which of the two is being saved.
 */

export type CategoryOption = {
  id: string;
  name: string;
  description: string;
  defaultMenuTemplate: string;
};

const FOLLOW_CATEGORY = "__default__";

export default function RestaurantConfigForm({
  restaurantId,
  restaurantName,
  categories,
  initialCategoryId,
  initialTemplateOverride,
  previewUrl,
}: {
  restaurantId: string;
  restaurantName: string;
  categories: CategoryOption[];
  initialCategoryId: string;
  initialTemplateOverride: string | null;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [isPending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [override, setOverride] = useState(initialTemplateOverride ?? FOLLOW_CATEGORY);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // What is saved right now, so the button can tell "no change" from "unsaved".
  const [savedCategoryId, setSavedCategoryId] = useState(initialCategoryId);
  const [savedOverride, setSavedOverride] = useState(
    initialTemplateOverride ?? FOLLOW_CATEGORY
  );

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? categories[0];
  const savedCategory = categories.find((category) => category.id === savedCategoryId);

  const effectiveTemplate = resolveMenuTemplate(
    override === FOLLOW_CATEGORY ? null : override,
    selectedCategory?.defaultMenuTemplate
  );
  const theme = menuTemplates[effectiveTemplate];

  const dirty = categoryId !== savedCategoryId || override !== savedOverride;

  function save() {
    setError("");
    startTransition(async () => {
      try {
        const result = await updateRestaurantCategoryTemplate({
          restaurantId,
          categoryId,
          menuTemplateOverride: override === FOLLOW_CATEGORY ? null : override,
        });
        if (!result.ok) {
          setError(result.error);
          setConfirming(false);
          return;
        }
        setSavedCategoryId(categoryId);
        setSavedOverride(override);
        setConfirming(false);
        pushToast(
          `${restaurantName}: ${selectedCategory?.name} · plantilla ${theme.name}.`,
          "success"
        );
        router.refresh();
      } catch {
        // A thrown guard (the session expired, or the role was revoked while
        // this tab was open) lands here rather than as a rejected result.
        setError("No pudimos guardar el cambio. Vuelve a iniciar sesión e inténtalo.");
        setConfirming(false);
      }
    });
  }

  return (
    <section
      className="rounded-2xl border border-fg/10 bg-fg/[0.025] p-5 sm:p-6"
      aria-labelledby="restaurant-config-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="restaurant-config-title"
            className="font-display text-[20px] font-bold text-fg"
          >
            Categoría y plantilla de la carta
          </h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-faint">
            Define la identidad de {restaurantName}. No cambia platos, precios,
            categorías del menú, mesas, pedidos ni códigos QR.
          </p>
        </div>
        {previewUrl && (
          <Link
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-fg/15 px-3 py-2 text-[12px] font-semibold text-fg transition-colors hover:bg-fg/[0.06]"
          >
            Ver carta del QR ↗
          </Link>
        )}
      </div>

      {/* --------------------------------------------------------- category */}
      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-[12px] font-semibold uppercase tracking-wide text-faint">
          Categoría
        </legend>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const active = categoryId === category.id;
            return (
              <div
                key={category.id}
                className={`rounded-2xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent-400 ${
                  active
                    ? "border-accent-400 bg-accent-400/[0.06]"
                    : "border-fg/10 bg-fg/[0.015] hover:border-fg/25"
                }`}
              >
                <label className="block cursor-pointer">
                  <input
                    type="radio"
                    name="restaurantCategory"
                    value={category.id}
                    checked={active}
                    onChange={() => {
                      setCategoryId(category.id);
                      setConfirming(false);
                      setError("");
                    }}
                    className="sr-only"
                  />
                  <TemplateMiniature template={category.defaultMenuTemplate} />
                  <span className="mt-3 flex items-start justify-between gap-3">
                    <span>
                      <strong className="block text-[14px] text-fg">{category.name}</strong>
                      <span className="mt-1 block text-[12px] leading-relaxed text-faint">
                        {category.description}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[12px] ${
                        active
                          ? "border-accent-400 bg-accent-400 text-on-accent"
                          : "border-fg/30"
                      }`}
                      aria-hidden="true"
                    >
                      {active ? "✓" : ""}
                    </span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- template */}
      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <div>
          <label
            htmlFor="template-override"
            className="block text-[12px] font-semibold uppercase tracking-wide text-faint"
          >
            Plantilla visual (opcional)
          </label>
          <select
            id="template-override"
            value={override}
            onChange={(event) => {
              setOverride(event.target.value);
              setConfirming(false);
              setError("");
            }}
            aria-describedby="template-override-hint"
            className="mt-2 h-11 w-full rounded-lg border border-fg/[0.12] bg-fg/[0.04] px-3 text-[13.5px] text-fg outline-none focus:border-accent-400/50"
          >
            <option value={FOLLOW_CATEGORY} className="bg-ink-900">
              Usar la plantilla predeterminada de la categoría
              {selectedCategory
                ? ` (${menuTemplates[resolveMenuTemplate(null, selectedCategory.defaultMenuTemplate)].name})`
                : ""}
            </option>
            {Object.values(menuTemplates).map((template) => (
              <option key={template.id} value={template.id} className="bg-ink-900">
                {template.name}
              </option>
            ))}
          </select>
          <p id="template-override-hint" className="mt-2 text-[12px] leading-relaxed text-faint">
            {override === FOLLOW_CATEGORY
              ? "Seguirá a su categoría: si más adelante cambias la plantilla de la categoría, esta carta la sigue."
              : "Plantilla fija: se mantiene aunque cambie la plantilla de la categoría."}
          </p>
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
            Vista previa
          </p>
          <div className="mt-2">
            <TemplateMiniature template={effectiveTemplate} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex gap-1.5" aria-label="Paleta de colores">
              {Object.values(theme.colors)
                .slice(0, 5)
                .map((color) => (
                  <i
                    key={color}
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ background: color }}
                  />
                ))}
            </span>
            <Link
              href={`/preview-category?template=${theme.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg"
            >
              Vista completa ↗
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- confirm */}
      {confirming && (
        <div className="mt-6 rounded-xl border border-accent-400/30 bg-accent-400/[0.06] p-4">
          <p className="text-[13px] font-semibold text-fg">Confirma el cambio</p>
          <dl className="mt-3 grid gap-1.5 text-[13px]">
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 text-faint">Restaurante</dt>
              <dd className="text-fg">{restaurantName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 text-faint">Categoría anterior</dt>
              <dd className="text-fg">{savedCategory?.name ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 text-faint">Categoría nueva</dt>
              <dd className="text-fg">{selectedCategory?.name ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-40 shrink-0 text-faint">Plantilla resultante</dt>
              <dd className="text-fg">
                {theme.name}
                <span className="text-faint">
                  {override === FOLLOW_CATEGORY ? " (por categoría)" : " (fija)"}
                </span>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            Los QR impresos siguen funcionando: cambia solo cómo se ve la carta al
            abrirla.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (confirming ? save() : setConfirming(true))}
          disabled={isPending || !dirty}
          className="min-h-11 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 text-[13px] font-bold text-on-accent transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Guardando…"
            : confirming
              ? "Sí, guardar cambios"
              : "Guardar cambios"}
        </button>

        {confirming && !isPending && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-xl border border-fg/15 px-4 text-[13px] font-semibold text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
          >
            Cancelar
          </button>
        )}

        {!dirty && !isPending && (
          <p className="text-[12.5px] text-faint">No hay cambios por guardar.</p>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] font-medium text-accent-ink">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
