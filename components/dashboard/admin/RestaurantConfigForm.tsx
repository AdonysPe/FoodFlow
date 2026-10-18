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
    <section className="lbd-card lbd-card--glass lbd-ad-panel lbd-ad-cfg lbd-rise" style={{ animationDelay: ".12s" }} aria-labelledby="restaurant-config-title">
      <div className="lbd-ad-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h2 id="restaurant-config-title" className="lbd-ad-h">
            Categoría y plantilla de la carta
          </h2>
          <span className="lbd-ad-sub">
            Define la identidad de {restaurantName}. No cambia platos, precios, categorías del menú, mesas, pedidos ni códigos QR.
          </span>
        </div>
        {previewUrl && (
          <Link href={previewUrl} target="_blank" rel="noopener noreferrer" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
            Ver carta del QR ↗
          </Link>
        )}
      </div>

      {/* --------------------------------------------------------- category */}
      <fieldset className="lbd-ad-fieldset">
        <legend className="lbd-mono lbd-bl-eyebrow">CATEGORÍA</legend>
        <div className="lbd-ad-cats">
          {categories.map((category) => {
            const active = categoryId === category.id;
            return (
              <label key={category.id} className={`lbd-ad-cat${active ? " is-on" : ""}`}>
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
                <span className="lbd-ad-cat-text">
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.description}</small>
                  </span>
                  <span className="lbd-ad-cat-tick" aria-hidden="true">
                    {active ? "✓" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- template */}
      <div className="lbd-ad-tpl">
        <div className="lbd-wp-field">
          <label htmlFor="template-override" className="lbd-mono lbd-bl-eyebrow">
            PLANTILLA VISUAL (OPCIONAL)
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
            className="lbd-input"
          >
            <option value={FOLLOW_CATEGORY}>
              Usar la plantilla predeterminada de la categoría
              {selectedCategory ? ` (${menuTemplates[resolveMenuTemplate(null, selectedCategory.defaultMenuTemplate)].name})` : ""}
            </option>
            {Object.values(menuTemplates).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <small id="template-override-hint">
            {override === FOLLOW_CATEGORY
              ? "Seguirá a su categoría: si más adelante cambias la plantilla de la categoría, esta carta la sigue."
              : "Plantilla fija: se mantiene aunque cambie la plantilla de la categoría."}
          </small>
        </div>

        <div className="lbd-ad-tpl-preview">
          <span className="lbd-mono lbd-bl-eyebrow">VISTA PREVIA</span>
          <TemplateMiniature template={effectiveTemplate} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ display: "flex", gap: 6 }} aria-label="Paleta de colores">
              {Object.values(theme.colors)
                .slice(0, 5)
                .map((color) => (
                  <i key={color} style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.2)", background: color, display: "inline-block" }} />
                ))}
            </span>
            <Link href={`/preview-category?template=${theme.id}`} target="_blank" rel="noopener noreferrer" className="lbd-ad-link" style={{ fontSize: 12 }}>
              Vista completa ↗
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- confirm */}
      {confirming && (
        <div className="lbd-bl-callout" data-tone="warn">
          <strong>Confirma el cambio</strong>
          <div>
            <dl className="lbd-ad-dl" style={{ marginTop: 6 }}>
              <div>
                <dt>Restaurante</dt>
                <dd>{restaurantName}</dd>
              </div>
              <div>
                <dt>Categoría anterior</dt>
                <dd>{savedCategory?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Categoría nueva</dt>
                <dd>{selectedCategory?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>Plantilla resultante</dt>
                <dd>
                  {theme.name}
                  <span style={{ color: "#a39b90" }}>{override === FOLLOW_CATEGORY ? " (por categoría)" : " (fija)"}</span>
                </dd>
              </div>
            </dl>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#a39b90" }}>Los QR impresos siguen funcionando: cambia solo cómo se ve la carta al abrirla.</p>
          </div>
        </div>
      )}

      <div className="lbd-bl-actions" style={{ marginTop: 0 }}>
        <button type="button" onClick={() => (confirming ? save() : setConfirming(true))} disabled={isPending || !dirty} className="lbd-btn lbd-btn--solid">
          {isPending ? "Guardando…" : confirming ? "Sí, guardar cambios" : "Guardar cambios"}
        </button>
        {confirming && !isPending && (
          <button type="button" onClick={() => setConfirming(false)} className="lbd-btn lbd-btn--ghost">
            Cancelar
          </button>
        )}
        {!dirty && !isPending && <span className="lbd-bl-help" style={{ margin: 0 }}>No hay cambios por guardar.</span>}
        {error && (
          <p role="alert" className="lbd-bl-help" style={{ margin: 0, color: "#ffb39e" }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
