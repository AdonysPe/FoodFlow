"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import PageHeader from "@/components/dashboard/PageHeader";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { createMenuItem, updateMenuItem, reorderMenuItems, duplicateMenuItem, deleteMenuItem } from "@/lib/actions/menu";
import { NO_CATEGORY_LABEL, type MenuCategoryDTO, type MenuItemDTO } from "@/lib/menuMeta";
import CategoryManager from "./CategoryManager";
import CategoryTabs, { type CatFilter } from "./CategoryTabs";
import MenuItemCard from "./MenuItemCard";
import SortableList from "./SortableList";
import MenuItemForm, { blankItem, itemToForm } from "./MenuItemForm";

type Editing = { mode: "create" } | { mode: "edit"; id: string } | null;

/**
 * The Menú screen, design B: the categories on the left, the dishes as photo
 * cards in the middle and the selected dish's editor on the right. Everything
 * the module did before is still here — search, create, edit, duplicate,
 * delete, availability, categories, and drag to order a category — only drawn
 * differently. Below 1100px the editor opens as a sheet over the grid.
 */
export default function MenuWorkspace({
  categories,
  items: itemsProp,
  publishedSlug,
}: {
  categories: MenuCategoryDTO[];
  items: MenuItemDTO[];
  /** Set when the public carta is online, for the "Ver carta pública" link. */
  publishedSlug: string | null;
}) {
  const [items, setItems] = useState(itemsProp);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<CatFilter>("all");
  const [showCats, setShowCats] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  // Re-sync when the server sends fresh data (AutoRefresh / revalidation).
  useEffect(() => setItems(itemsProp), [itemsProp]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories]);
  const orphanCount = useMemo(() => items.filter((i) => i.categoryId == null).length, [items]);

  const trimmedQuery = query.trim().toLowerCase();
  const matches = (i: MenuItemDTO) => !trimmedQuery || i.name.toLowerCase().includes(trimmedQuery) || (i.description?.toLowerCase().includes(trimmedQuery) ?? false);

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
  const canOrder = activeCat !== "all" && trimmedQuery === "";
  const sortable = canOrder && ordering;
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
  }, [visible, categories]);

  const selectedItem = editing?.mode === "edit" ? items.find((i) => i.id === editing.id) ?? null : null;
  const emptyAll = items.length === 0;

  function select(item: MenuItemDTO) {
    setEditing({ mode: "edit", id: item.id });
    setConfirmingDelete(false);
    setSavedAt(0);
  }

  function duplicate(item: MenuItemDTO) {
    startTransition(async () => {
      const result = await duplicateMenuItem(item.id);
      pushToast(result.ok ? "Plato duplicado." : result.error, result.ok ? "success" : "error");
    });
  }

  function remove(item: MenuItemDTO) {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteMenuItem(item.id);
      pushToast(result.ok ? "Plato eliminado." : result.error, result.ok ? "success" : "error");
      setConfirmingDelete(false);
      if (result.ok) setEditing(null);
    });
  }

  const cardFor = (item: MenuItemDTO, active: boolean, layout: "card" | "row" = "card") => (
    <MenuItemCard
      key={item.id}
      item={item}
      categoryActive={item.categoryId == null ? true : (catById.get(item.categoryId)?.active ?? true)}
      showCategory={activeCat === "all"}
      selected={editing?.mode === "edit" && editing.id === item.id}
      layout={layout}
      onEdit={() => select(item)}
    />
  );

  return (
    <div className="lbd-pg">
      <AutoRefresh intervalMs={15000} />

      <PageHeader eyebrow="CARTA · MENÚ" title="Menú" description={`${items.length} ${items.length === 1 ? "plato" : "platos"} · ${available} ${available === 1 ? "disponible" : "disponibles"} · lo que cambies aquí se ve al instante en la carta de cada mesa y en tu web.`}>
        <div className="lbd-me-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar plato" aria-label="Buscar plato" />
        </div>
        <Link href={publishedSlug ? `/carta/${publishedSlug}` : "/dashboard/app/menu/carta"} target={publishedSlug ? "_blank" : undefined} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
          {publishedSlug ? "Ver carta pública" : "Publicar mi carta"}
        </Link>
        <button type="button" onClick={() => setEditing({ mode: "create" })} className="lbd-cta">
          Nuevo plato
        </button>
      </PageHeader>

      <AnimatePresence initial={false}>
        {showCats && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: EASE }} style={{ overflow: "hidden" }}>
            <CategoryManager categories={categories} />
          </m.div>
        )}
      </AnimatePresence>

      <div className="lbd-me">
        <CategoryTabs categories={categories} orphanCount={orphanCount} total={items.length} value={activeCat} onChange={(v) => { setActiveCat(v); setOrdering(false); }} onManage={() => setShowCats((v) => !v)} />

        <section className="lbd-me-main lbd-rise" style={{ animationDelay: ".1s" }} aria-label="Platos">
          {emptyAll ? (
            <div className="lbd-empty">
              Tu carta está vacía. Agrega tu primer plato.
              <div style={{ marginTop: 14 }}>
                <button type="button" className="lbd-cta" onClick={() => setEditing({ mode: "create" })}>
                  Nuevo plato
                </button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="lbd-empty">{trimmedQuery ? "Ningún plato coincide con la búsqueda." : "No hay platos en esta categoría todavía."}</div>
          ) : (
            <>
              {canOrder && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: "#8a8278" }}>{sortable ? "Arrastra los platos para ordenarlos dentro de la categoría." : ""}</span>
                  <button type="button" onClick={() => setOrdering((v) => !v)} className="lbd-btn lbd-btn--ghost lbd-btn--sm" aria-pressed={ordering}>
                    {ordering ? "Listo" : "Ordenar platos"}
                  </button>
                </div>
              )}

              {sortable ? (
                <SortableList items={visible} onReorder={handleReorder} itemClassName="pb-2 last:pb-0" renderItem={(item) => cardFor(item, false, "row")} />
              ) : (
                groups.map((g) => (
                  <div key={g.id ?? "none"} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(activeCat === "all" || trimmedQuery) && (
                      <h3 className="lbd-cm-eyebrow" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        {g.name}
                        <span className="lbd-cm-count">{g.items.length}</span>
                        {!g.active && <span className="lbd-cm-count">oculta</span>}
                      </h3>
                    )}
                    <div className="lbd-me-grid">{g.items.map((item) => cardFor(item, false))}</div>
                  </div>
                ))
              )}
            </>
          )}
        </section>

        {/* On a wide screen this is a column; below 1100px it is a sheet. */}
        <aside className={`lbd-card lbd-card--glass lbd-me-panel${editing ? " is-open" : ""}`} aria-label="Editar plato">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span className="lbd-mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "#a39b90" }}>
              {editing?.mode === "create" ? "NUEVO PLATO" : "EDITAR PLATO"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {savedAt > 0 && (
                <span key={savedAt} className="lbd-me-saved">
                  Guardado · ya en la carta
                </span>
              )}
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar editor" className="lbd-td-x lbd-me-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          {editing === null ? (
            <p className="lbd-ov-empty" style={{ padding: "24px 4px" }}>
              Elige un plato para editarlo, o crea uno nuevo.
            </p>
          ) : editing.mode === "create" ? (
            <MenuItemForm
              key="new"
              categories={categories}
              initial={blankItem(activeCat !== "all" && activeCat !== "none" ? activeCat : categories[0]?.id ?? "")}
              submitLabel="Añadir a la carta"
              onSubmit={async (input) => {
                const result = await createMenuItem(input);
                if (result.ok) {
                  setEditing(null);
                  pushToast("Plato añadido a la carta.", "success");
                }
                return result;
              }}
            />
          ) : selectedItem ? (
            <>
              <MenuItemForm
                key={selectedItem.id}
                categories={categories}
                initial={itemToForm(selectedItem)}
                submitLabel="Guardar cambios"
                onSubmit={(input) => updateMenuItem(selectedItem.id, input)}
                onSaved={() => setSavedAt(Date.now())}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={isPending} onClick={() => duplicate(selectedItem)} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ flex: 1 }}>
                  Duplicar
                </button>
                <button type="button" disabled={isPending} onClick={() => remove(selectedItem)} onBlur={() => setConfirmingDelete(false)} className={`lbd-btn lbd-btn--sm ${confirmingDelete ? "lbd-btn--solid" : "lbd-btn--ghost"}`} style={{ flex: 1, minHeight: 38 }}>
                  {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
                </button>
              </div>
            </>
          ) : null}
        </aside>
        {editing && <button type="button" className="lbd-me-scrim" aria-label="Cerrar editor" onClick={() => setEditing(null)} />}
      </div>
    </div>
  );
}
