"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRestaurantCategory } from "@/lib/actions/restaurantCategory";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";

type CategoryOption = {
  id: string;
  name: string;
  description: string;
  defaultMenuTemplate: string;
};

function TemplateMiniature({ template }: { template: string }) {
  const theme = menuTemplates[resolveMenuTemplate(null, template)];
  const { background, surface, primary, secondary, cta } = theme.colors;
  return (
    <div className="overflow-hidden rounded-xl border border-fg/10" style={{ background }} aria-hidden="true">
      <div className="px-4 py-3" style={{ background: `linear-gradient(115deg, ${background}, ${surface})` }}>
        <div className="flex items-start justify-between">
          <div>
            <span className="block h-1 w-12 rounded-full opacity-50" style={{ background: secondary }} />
            <span className="mt-2 block font-display text-[18px] font-bold leading-none" style={{ color: primary }}>La carta</span>
          </div>
          <svg width="47" height="22" viewBox="0 0 47 22" fill="none" stroke={secondary} strokeWidth="1.5" opacity="0.6">
            {theme.decoration === "pacifico"
              ? <><path d="M1 12c7-5 13-5 20 0s13 5 25-1M1 19c7-5 13-5 20 0s13 5 25-1" /><path d="M13 5c4-4 10-4 14 0-4 4-10 4-14 0ZM13 5 9 2v6l4-3Z" /></>
              : <><path d="M7 4c9-3 14 1 11 8-2 5-7 8-15 9 4-5 3-12 4-17Z" /><path d="M12 4c2-3 5-4 8-3M24 8c7-3 13-2 20 2" /></>}
          </svg>
        </div>
      </div>
      <div className="flex gap-1.5 px-3 py-2"><span className="h-3 w-10 rounded-full" style={{ background: secondary }} /><span className="h-3 w-12 rounded-full opacity-30" style={{ background: secondary }} /><span className="h-3 w-9 rounded-full opacity-30" style={{ background: secondary }} /></div>
      <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg p-2 shadow-sm" style={{ background: surface }}>
        <span className="h-9 w-10 rounded-md" style={{ background: `linear-gradient(135deg, ${secondary}55, ${background})` }} />
        <span className="flex-1"><span className="block h-1.5 w-16 rounded-full" style={{ background: primary }} /><span className="mt-1.5 block h-1 w-12 rounded-full opacity-30" style={{ background: primary }} /></span>
        <span className="h-5 w-9 rounded" style={{ background: cta }} />
      </div>
    </div>
  );
}

export default function RestaurantCategorySelector({ categories, initialCategoryId, previewUrl }: {
  categories: CategoryOption[];
  initialCategoryId: string;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialCategoryId);
  const [saved, setSaved] = useState(initialCategoryId);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { setSelected(initialCategoryId); setSaved(initialCategoryId); }, [initialCategoryId]);

  function save() {
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await saveRestaurantCategory({ categoryId: selected });
        if (!result.ok) { setError(result.error); return; }
        setSaved(selected);
        setNotice("Categoría guardada. Los QR existentes mostrarán esta plantilla al actualizarse.");
        router.refresh();
      } catch { setError("No pudimos guardar la categoría. Inténtalo de nuevo."); }
    });
  }

  return (
    <section className="rounded-2xl border border-fg/10 bg-fg/[0.025] p-5 sm:p-6" aria-labelledby="restaurant-category-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="restaurant-category-title" className="font-display text-[20px] font-bold text-fg">Categoría y plantilla de la carta</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-faint">Elige la identidad del restaurante. No cambia platos, precios, mesas ni códigos QR.</p>
        </div>
        {previewUrl && <Link href={previewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-fg/15 px-3 py-2 text-[12px] font-semibold text-fg hover:bg-fg/[0.06]">Ver carta del QR ↗</Link>}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Categoría del restaurante">
        {categories.map((category) => {
          const active = selected === category.id;
          const theme = menuTemplates[resolveMenuTemplate(null, category.defaultMenuTemplate)];
          return <label key={category.id} className={`cursor-pointer rounded-2xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent-400 ${active ? "border-accent-400 bg-accent-400/[0.06]" : "border-fg/10 bg-fg/[0.015] hover:border-fg/25"}`}>
            <input type="radio" name="restaurantCategory" value={category.id} checked={active} onChange={() => { setSelected(category.id); setNotice(""); }} className="sr-only" />
            <TemplateMiniature template={category.defaultMenuTemplate} />
            <span className="mt-3 flex items-start justify-between gap-3">
              <span><strong className="block text-[14px] text-fg">{category.name}</strong><span className="mt-1 block text-[12px] leading-relaxed text-faint">{theme.description || category.description}</span></span>
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[12px] ${active ? "border-accent-400 bg-accent-400 text-white" : "border-fg/30"}`} aria-hidden="true">{active ? "✓" : ""}</span>
            </span>
          </label>;
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || selected === saved || !selected} className="min-h-11 rounded-xl bg-accent-400 px-5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Guardando…" : "Guardar cambios"}</button>
        {error && <p role="alert" className="text-[12px] text-red-400">{error}</p>}
        {notice && <p role="status" className="text-[12px] text-mint-ink">{notice}</p>}
      </div>
    </section>
  );
}
