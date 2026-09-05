import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { seedDefaultCategories } from "@/lib/menu/seedCategories";
import MenuWorkspace from "@/components/dashboard/menu/MenuWorkspace";
import type { MenuCategoryDTO, MenuItemDTO } from "@/lib/menuMeta";

export const metadata = {
  title: "Menú",
};

export default async function MenuPage() {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  // A restaurant created before the categories model existed gets its default
  // set the first time the owner opens this page.
  await seedDefaultCategories(prisma, restaurant.id);

  const [categories, items, carta] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { items: true } } },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { category: { select: { name: true } } },
    }),
    prisma.cartaSettings.findUnique({
      where: { restaurantId: restaurant.id },
      select: { published: true },
    }),
  ]);

  const categoryDTOs: MenuCategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    active: c.active,
    itemCount: c._count.items,
  }));

  const itemDTOs: MenuItemDTO[] = items.map((i) => ({
    id: i.id,
    categoryId: i.categoryId,
    categoryName: i.category?.name ?? null,
    name: i.name,
    description: i.description,
    price: i.price,
    photoUrl: i.photoUrl,
    prepMin: i.prepMin,
    available: i.available,
    sortOrder: i.sortOrder,
  }));

  const published = Boolean(restaurant.slug && carta?.published);

  return (
    <div className="flex flex-col gap-5">
      {/* The bridge between the two halves of the module: what the venue keeps
          here, and what the diner sees. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.02] px-5 py-3.5">
        <p className="flex items-center gap-2 text-[13px] text-fg/55">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${published ? "bg-mint" : "bg-fg/25"}`}
            aria-hidden
          />
          {published ? (
            <>
              Tu carta está en línea en{" "}
              <span className="font-mono text-fg/75">/carta/{restaurant.slug}</span>
            </>
          ) : (
            "Tu carta pública todavía no está publicada."
          )}
        </p>
        <div className="flex items-center gap-2">
          {published && (
            <Link
              href={`/carta/${restaurant.slug}`}
              target="_blank"
              className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
            >
              Ver carta
            </Link>
          )}
          <Link
            href="/dashboard/app/menu/carta"
            className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
          >
            {published ? "Configurar carta" : "Publicar mi carta"}
          </Link>
        </div>
      </div>

      <MenuWorkspace categories={categoryDTOs} items={itemDTOs} />
    </div>
  );
}
