"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, m } from "framer-motion";
import Button from "@/components/ui/Button";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import { IconSearch } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { createMenuItem, updateMenuItem, reorderMenuItems } from "@/lib/actions/menu";
import { NO_CATEGORY_LABEL, type MenuCategoryDTO, type MenuItemDTO } from "@/lib/menuMeta";
import CategoryManager from "./CategoryManager";
import CategoryTabs, { type CatFilter } from "./CategoryTabs";
import MenuItemCard from "./MenuItemCard";
import MenuItemModal from "./MenuItemModal";
import SortableList from "./SortableList";
import { blankItem, itemToForm } from "./MenuItemForm";
import { fieldClass } from "./ui";

export default function MenuWorkspace({
  categories,
  items: itemsProp,
}: {
  categories: MenuCategoryDTO[];
  items: MenuItemDTO[];
}) {
  const [items, setItems] = useState(itemsProp);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatFilter>("all");
  const [showCats, setShowCats] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; item: MenuItemDTO } | null>(
    null
  );
  const [, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  // Re-sync when the server sends fresh data (AutoRefresh / revalidation).
  useEffect(() => setItems(itemsProp), [itemsProp]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );
  const orphanCount = useMemo(() => items.filter((i) => i.categoryId == null).length, [items]);

  const trimmedQuery = query.trim().toLowerCase();
  const matches = (i: MenuItemDTO) =>
    !trimmedQuery ||
    i.name.toLowerCase().includes(trimmedQuery) ||
    (i.description?.toLowerCase().includes(trimmedQuery) ?? false);

  const inActiveCat = (i: MenuItemDTO) => {
    if (activeCat === "all") return true;
    if (activeCat === "none") return i.categoryId == null;
    return i.categoryId === activeCat;
  };

  const visible = useMemo(
    () => items.filter((i) => matches(i) && inActiveCat(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, trimmedQuery, activeCat]
  );

  const available = items.filter((i) => i.available).length;
  const sortable = activeCat !== "all" && trimmedQuery === "";
  const sortableCategoryId = activeCat === "none" ? null : (activeCat as string);

  function handleReorder(orderedIds: string[]) {
    const byId = new Map(items.map((i) => [i.id, i] as const));
    setItems((prev) => {
      const moved = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
      const rest = prev.filter((i) => !orderedIds.includes(i.id));
      return [...moved, ...rest];
    });
    startTransition(async () => {
      const result = await reorderMenuItems(sortableCategoryId, orderedIds);
      if (!result.ok) pushToast(result.error, "error");
    });
  }

  // Grid grouping for the "Todas" / search views.
  const groups = useMemo(() => {
    if (sortable) return [];
    const byCat = new Map<string | null, MenuItemDTO[]>();
    for (const i of visible) {
      const k = i.categoryId ?? null;
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(i);
    }
    const out: { id: string | null; name: string; active: boolean; items: MenuItemDTO[] }[] = [];
    for (const c of categories) {
      const list = byCat.get(c.id);
      if (list?.length) out.push({ id: c.id, name: c.name, active: c.active, items: list });
    }
    const loose = byCat.get(null);
    if (loose?.length) out.push({ id: null, name: NO_CATEGORY_LABEL, active: true, items: loose });
    return out;
  }, [sortable, visible, categories]);

  const emptyAll = items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh intervalMs={15000} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">Carta</h1>
          <p className="mt-0.5 text-[12.5px] text-faint">
            {items.length} plato(s) · {available} disponible(s) · {categories.length} categoría(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCats((v) => !v)}
            className={`rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors ${
              showCats
                ? "border-fg/20 bg-fg/[0.08] text-fg"
                : "border-fg/[0.1] bg-fg/[0.04] text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
            }`}
          >
            Categorías
          </button>
          <Button type="button" size="md" onClick={() => setModal({ mode: "create" })}>
            + Nuevo plato
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showCats && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <CategoryManager categories={categories} />
          </m.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
            <IconSearch className="h-[18px] w-[18px]" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar plato…"
            className={`${fieldClass} pl-11`}
          />
        </div>

        {categories.length > 0 && (
          <CategoryTabs
            categories={categories}
            orphanCount={orphanCount}
            value={activeCat}
            onChange={setActiveCat}
          />
        )}
      </div>

      {emptyAll ? (
        <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-10 text-center">
          <p className="text-[14px] text-faint">Tu carta está vacía. Agrega tu primer plato.</p>
          <Button
            type="button"
            size="md"
            className="mt-4"
            onClick={() => setModal({ mode: "create" })}
          >
            + Nuevo plato
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-10 text-center text-[13.5px] text-faint">
          {trimmedQuery
            ? "Ningún plato coincide con la búsqueda."
            : "No hay platos en esta categoría todavía."}
        </div>
      ) : sortable ? (
        <div>
          <p className="mb-2 px-1 text-[12px] text-faint">
            Arrastra los platos para ordenarlos dentro de la categoría.
          </p>
          <SortableList
            items={visible}
            onReorder={handleReorder}
            itemClassName="pb-3 last:pb-0"
            renderItem={(item) => (
              <MenuItemCard
                item={item}
                categoryActive={
                  item.categoryId == null ? true : (catById.get(item.categoryId)?.active ?? true)
                }
                showCategory={false}
                showGrip
                onEdit={() => setModal({ mode: "edit", item })}
              />
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.id ?? "none"}>
              <h3 className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-faint">
                {g.name}
                <span className="rounded-full bg-fg/[0.06] px-1.5 py-0.5 text-[11px] font-normal text-faint">
                  {g.items.length}
                </span>
                {!g.active && (
                  <span className="rounded-full bg-fg/[0.06] px-1.5 py-0.5 text-[11px] font-normal text-faint">
                    oculta
                  </span>
                )}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    categoryActive={g.active}
                    showCategory={activeCat === "all"}
                    onEdit={() => setModal({ mode: "edit", item })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <MenuItemModal
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar plato" : "Nuevo plato"}
        categories={categories}
        initial={
          modal?.mode === "edit"
            ? itemToForm(modal.item)
            : blankItem(activeCat !== "all" && activeCat !== "none" ? activeCat : categories[0]?.id ?? "")
        }
        submitLabel={modal?.mode === "edit" ? "Guardar cambios" : "Añadir a la carta"}
        onSubmit={async (input) => {
          const result =
            modal?.mode === "edit"
              ? await updateMenuItem(modal.item.id, input)
              : await createMenuItem(input);
          if (result.ok) {
            setModal(null);
            pushToast(
              modal?.mode === "edit" ? "Plato actualizado." : "Plato añadido a la carta.",
              "success"
            );
          }
          return result;
        }}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
