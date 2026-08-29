"use client";

import { motion } from "framer-motion";
import type { MenuCategoryDTO } from "@/lib/menuMeta";

export type CatFilter = string; // "all" | "none" | categoryId

export default function CategoryTabs({
  categories,
  orphanCount,
  value,
  onChange,
}: {
  categories: MenuCategoryDTO[];
  orphanCount: number;
  value: CatFilter;
  onChange: (v: CatFilter) => void;
}) {
  const tabs: { id: CatFilter; label: string; count?: number; muted?: boolean }[] = [
    { id: "all", label: "Todas" },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      count: c.itemCount,
      muted: !c.active,
    })),
  ];
  if (orphanCount > 0) tabs.push({ id: "none", label: "Sin categoría", count: orphanCount });

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`relative shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-200 ${
                active ? "text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="menu-cat-tab"
                  transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                  className="absolute inset-0 rounded-lg bg-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09),0_2px_8px_-2px_rgba(0,0,0,0.45)]"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <span className={t.muted ? "line-through opacity-70" : ""}>{t.label}</span>
                {t.count != null && (
                  <span
                    className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${
                      active ? "bg-white/15 text-white/70" : "bg-white/[0.06] text-white/35"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
