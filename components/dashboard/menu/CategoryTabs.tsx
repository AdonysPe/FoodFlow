"use client";

import type { MenuCategoryDTO } from "@/lib/menuMeta";

export type CatFilter = string; // "all" | "none" | categoryId

/**
 * The categories rail, design B: a quiet list on the left of the grid with
 * the dish count of each, the active one in cream. Hidden categories keep
 * their strike-through so it is clear they are off the carta.
 */
export default function CategoryTabs({
  categories,
  orphanCount,
  total,
  value,
  onChange,
  onManage,
}: {
  categories: MenuCategoryDTO[];
  orphanCount: number;
  total: number;
  value: CatFilter;
  onChange: (v: CatFilter) => void;
  onManage: () => void;
}) {
  const tabs: { id: CatFilter; label: string; count: number; muted?: boolean }[] = [
    { id: "all", label: "Todas", count: total },
    ...categories.map((c) => ({ id: c.id, label: c.name, count: c.itemCount, muted: !c.active })),
  ];
  if (orphanCount > 0) tabs.push({ id: "none", label: "Sin categoría", count: orphanCount });

  return (
    <nav className="lbd-card lbd-rise lbd-me-rail" style={{ animationDelay: ".05s" }} aria-label="Categorías">
      <span className="lbd-cm-eyebrow lbd-me-rail-title">Categorías</span>
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={t.id === value} className={`lbd-me-cat${t.id === value ? " is-on" : ""}`}>
          <span className={t.muted ? "is-muted" : undefined}>{t.label}</span>
          <span className="lbd-mono">{t.count}</span>
        </button>
      ))}
      <button type="button" onClick={onManage} className="lbd-me-newcat">
        Gestionar categorías
      </button>
    </nav>
  );
}
