"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import type { ActionResult } from "@/lib/actions/auth";
import type { MenuItemInput } from "@/lib/actions/menu";
import type { MenuCategoryDTO, MenuItemDTO } from "@/lib/menuMeta";
import { fieldClass, labelClass } from "./ui";

export type MenuItemFormValue = {
  name: string;
  categoryId: string;
  price: string;
  prepMin: string;
  description: string;
};

export function blankItem(categoryId = ""): MenuItemFormValue {
  return { name: "", categoryId, price: "", prepMin: "", description: "" };
}

export function itemToForm(item: MenuItemDTO): MenuItemFormValue {
  return {
    name: item.name,
    categoryId: item.categoryId ?? "",
    price: String(item.price),
    prepMin: item.prepMin != null ? String(item.prepMin) : "",
    description: item.description ?? "",
  };
}

export default function MenuItemForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  compact = false,
}: {
  categories: MenuCategoryDTO[];
  initial: MenuItemFormValue;
  submitLabel: string;
  onSubmit: (input: MenuItemInput) => Promise<ActionResult<unknown>>;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState<MenuItemFormValue>(initial);
  const [error, setError] = useState("");
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
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={`grid grid-cols-1 gap-3 ${compact ? "sm:grid-cols-4" : "sm:grid-cols-6"}`}>
        <div className={compact ? "sm:col-span-4" : "sm:col-span-3"}>
          <label htmlFor="mi-name" className={labelClass}>
            Nombre
          </label>
          <input
            id="mi-name"
            required
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Lomo saltado"
            className={fieldClass}
          />
        </div>
        <div className={compact ? "sm:col-span-2" : "sm:col-span-2"}>
          <label htmlFor="mi-category" className={labelClass}>
            Categoría
          </label>
          <select
            id="mi-category"
            value={value.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className={fieldClass}
          >
            <option value="" className="bg-ink-800">
              Sin categoría
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink-800">
                {c.name}
                {!c.active ? " (oculta)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={compact ? "sm:col-span-1" : "sm:col-span-1"}>
          <label htmlFor="mi-price" className={labelClass}>
            Precio S/
          </label>
          <input
            id="mi-price"
            type="number"
            step="0.10"
            min="0"
            required
            value={value.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="0.00"
            className={fieldClass}
          />
        </div>
        <div className={compact ? "sm:col-span-1" : "sm:col-span-1"}>
          <label htmlFor="mi-prep" className={labelClass}>
            Prep. (min)
          </label>
          <input
            id="mi-prep"
            type="number"
            min="0"
            max="240"
            value={value.prepMin}
            onChange={(e) => set("prepMin", e.target.value)}
            placeholder="—"
            className={fieldClass}
          />
        </div>
        <div className={compact ? "sm:col-span-4" : "sm:col-span-6"}>
          <label htmlFor="mi-desc" className={labelClass}>
            Descripción <span className="text-white/25">· opcional</span>
          </label>
          <textarea
            id="mi-desc"
            rows={2}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Ingredientes, acompañamientos, nivel de picante…"
            className={`${fieldClass} h-auto py-3`}
          />
        </div>
      </div>

      {error && <p className="text-[13px] text-accent-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="md" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
