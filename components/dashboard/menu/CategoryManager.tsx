"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconGrip } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import {
  createCategory,
  updateCategory,
  toggleCategoryActive,
  reorderCategories,
  deleteCategory,
} from "@/lib/actions/categories";
import type { MenuCategoryDTO } from "@/lib/menuMeta";
import SortableList from "./SortableList";
import { compactFieldClass, ghostButtonClass, dangerButtonClass } from "./ui";

function CategoryRow({ category }: { category: MenuCategoryDTO }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function save() {
    startTransition(async () => {
      const result = await updateCategory(category.id, { name });
      if (result.ok) {
        setEditing(false);
        pushToast("Categoría actualizada.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  function toggle() {
    startTransition(async () => {
      const result = await toggleCategoryActive(category.id);
      pushToast(
        result.ok
          ? category.active
            ? "Categoría oculta. Sus platos no se pueden pedir."
            : "Categoría visible otra vez."
          : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        pushToast(
          result.data.orphaned > 0
            ? `Categoría eliminada. ${result.data.orphaned} plato(s) quedaron en "Sin categoría".`
            : "Categoría eliminada.",
          "success"
        );
      } else {
        pushToast(result.error, "error");
      }
      setConfirmingDelete(false);
    });
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <span aria-hidden className="shrink-0 text-fg/25">
        <IconGrip className="h-4 w-4" />
      </span>

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setName(category.name);
              setEditing(false);
            }
          }}
          className={`${compactFieldClass} max-w-[220px]`}
          onDragStart={(e) => e.preventDefault()}
        />
      ) : (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`truncate text-[14px] font-medium ${
              category.active ? "text-fg/85" : "text-fg/40 line-through"
            }`}
          >
            {category.name}
          </span>
          <span className="shrink-0 rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[11px] text-fg/45">
            {category.itemCount}
          </span>
          {!category.active && (
            <span className="shrink-0 rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[11px] text-fg/45">
              oculta
            </span>
          )}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {editing ? (
          <>
            <button type="button" disabled={isPending} onClick={save} className={ghostButtonClass}>
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
              className={ghostButtonClass}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className={ghostButtonClass}>
              Renombrar
            </button>
            <button type="button" disabled={isPending} onClick={toggle} className={ghostButtonClass}>
              {category.active ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={remove}
              onBlur={() => setConfirmingDelete(false)}
              className={confirmingDelete ? dangerButtonClass : ghostButtonClass}
            >
              {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CategoryManager({ categories }: { categories: MenuCategoryDTO[] }) {
  const [ordered, setOrdered] = useState(categories);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  // Re-sync when the server sends fresh categories (add / rename / refresh).
  useEffect(() => setOrdered(categories), [categories]);

  function handleReorder(orderedIds: string[]) {
    const byId = new Map(categories.map((c) => [c.id, c] as const));
    setOrdered(orderedIds.map((id) => byId.get(id)!).filter(Boolean));
    startTransition(async () => {
      const result = await reorderCategories(orderedIds);
      if (!result.ok) pushToast(result.error, "error");
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createCategory({ name: newName });
      if (result.ok) {
        setNewName("");
        setAdding(false);
        pushToast("Categoría creada.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.02]">
      <div className="flex items-center justify-between border-b border-fg/[0.07] px-4 py-3">
        <div>
          <h2 className="text-[14px] font-semibold text-fg/90">Categorías</h2>
          <p className="mt-0.5 text-[12px] text-fg/40">
            Arrástralas para cambiar el orden de las pestañas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-accent-400/30 bg-accent-400/[0.12] px-3 py-1.5 text-[12.5px] font-medium text-accent-ink hover:bg-accent-400/20"
        >
          {adding ? "Cerrar" : "+ Añadir categoría"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-b border-fg/[0.07]"
          >
            <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre de la categoría"
                className={`${compactFieldClass} max-w-[260px]`}
              />
              <button
                type="submit"
                disabled={isPending || !newName.trim()}
                className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-40"
              >
                Añadir
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {ordered.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13.5px] text-fg/40">Aún no hay categorías.</p>
      ) : (
        <SortableList
          items={ordered}
          onReorder={handleReorder}
          itemClassName="border-b border-fg/[0.05] last:border-0"
          renderItem={(c) => <CategoryRow category={c} />}
        />
      )}
    </div>
  );
}
