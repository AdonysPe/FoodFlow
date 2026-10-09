"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions/auth";
import type { MenuItemInput } from "@/lib/actions/menu";
import type { MenuCategoryDTO, MenuItemDTO } from "@/lib/menuMeta";

export type MenuItemFormValue = {
  name: string;
  categoryId: string;
  price: string;
  prepMin: string;
  description: string;
  photoUrl: string;
};

// 1x1 transparent GIF: the placeholder tile before anything is pasted.
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function blankItem(categoryId = ""): MenuItemFormValue {
  return { name: "", categoryId, price: "", prepMin: "", description: "", photoUrl: "" };
}

export function itemToForm(item: MenuItemDTO): MenuItemFormValue {
  return {
    name: item.name,
    categoryId: item.categoryId ?? "",
    price: String(item.price),
    prepMin: item.prepMin != null ? String(item.prepMin) : "",
    description: item.description ?? "",
    photoUrl: item.photoUrl ?? "",
  };
}

/**
 * The dish form, design B: the editor panel beside the grid. Same fields and
 * the same validation as ever — name, category, price, prep time, photo link
 * and description — and the same `onSubmit`, which the workspace points at
 * `createMenuItem` or `updateMenuItem`.
 */
export default function MenuItemForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onSaved,
}: {
  categories: MenuCategoryDTO[];
  initial: MenuItemFormValue;
  submitLabel: string;
  onSubmit: (input: MenuItemInput) => Promise<ActionResult<unknown>>;
  /** Called after a successful save, for the "Guardado" note. */
  onSaved?: () => void;
}) {
  const [value, setValue] = useState<MenuItemFormValue>(initial);
  const [error, setError] = useState("");
  const [photoBroken, setPhotoBroken] = useState(false);
  // Same two shapes the server accepts. Anything half-typed previews as the
  // empty tile rather than flashing an error on every keystroke.
  const typed = value.photoUrl.trim();
  const photoPreview = /^https:\/\/\S+$/.test(typed) || /^\/[^\s/][^\s]*$/.test(typed) ? typed : "";
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof MenuItemFormValue>(key: K, v: MenuItemFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!value.name.trim()) return setError("Ponle un nombre al plato.");
    const price = Number(value.price);
    if (!Number.isFinite(price) || price <= 0) return setError("El precio debe ser mayor que 0.");

    startTransition(async () => {
      const result = await onSubmit({
        name: value.name,
        categoryId: value.categoryId,
        price,
        prepMin: value.prepMin ? Number(value.prepMin) : undefined,
        description: value.description,
        photoUrl: value.photoUrl.trim(),
      });
      if (!result.ok) setError(result.error);
      else onSaved?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="lbd-me-form">
      {/* Plain <img>, not next/image: this previews whatever the owner just
          pasted, including a URL that turns out not to be an image, and the
          optimiser would only add a failing round trip. */}
      <div className="lbd-me-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoPreview || TRANSPARENT_PIXEL} alt="" onError={() => setPhotoBroken(true)} onLoad={() => setPhotoBroken(false)} />
        {!photoPreview && <span>Sin foto</span>}
      </div>

      <label className="lbd-me-field">
        <span>
          Foto <em>· enlace, opcional</em>
        </span>
        <input id="mi-photo" inputMode="url" value={value.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…/lomo-saltado.jpg" className="lbd-input" />
        {photoBroken && photoPreview && <small style={{ color: "#ffb39e" }}>No se pudo cargar esa imagen. Revisa el enlace.</small>}
      </label>

      <label className="lbd-me-field">
        <span>Nombre</span>
        <input id="mi-name" required value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="Lomo saltado" className="lbd-input" style={{ fontWeight: 500 }} />
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <label className="lbd-me-field" style={{ flex: 1 }}>
          <span>Precio (S/)</span>
          <input id="mi-price" type="number" step="0.10" min="0" required value={value.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" className="lbd-input" style={{ fontWeight: 600 }} />
        </label>
        <label className="lbd-me-field" style={{ flex: 1 }}>
          <span>Prep. (min)</span>
          <input id="mi-prep" type="number" min="0" max="240" value={value.prepMin} onChange={(e) => set("prepMin", e.target.value)} placeholder="—" className="lbd-input" />
        </label>
      </div>

      <label className="lbd-me-field">
        <span>Categoría</span>
        <select id="mi-category" value={value.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="lbd-input">
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {!c.active ? " (oculta)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="lbd-me-field">
        <span>
          Descripción <em>· opcional</em>
        </span>
        <textarea id="mi-desc" rows={3} value={value.description} onChange={(e) => set("description", e.target.value)} placeholder="Ingredientes, acompañamientos, nivel de picante…" className="lbd-input" style={{ height: "auto", padding: "10px 14px", lineHeight: 1.45, resize: "none" }} />
      </label>

      {error && (
        <p role="alert" className="lbd-modal-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={isPending} className="lbd-btn lbd-btn--solid" style={{ marginTop: "auto" }}>
        {isPending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
