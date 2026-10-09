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
    <div className="lbd-pg">
      {/* The bridge between the two halves of the module: what the venue keeps
          here, and what the diner sees. */}
      <div className="lbd-me-banner lbd-rise">
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#cfc7bb" }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: published ? "#3ddc97" : "rgba(243,239,230,0.25)" }} />
          {published ? (
            <>
              Tu carta está en línea en <span className="lbd-mono" style={{ color: "#f3efe6" }}>/carta/{restaurant.slug}</span>
            </>
          ) : (
            "Tu carta pública todavía no está publicada."
          )}
        </p>
        <Link href="/dashboard/app/menu/carta" className="lbd-link">
          {published ? "Configurar carta ›" : "Publicar mi carta ›"}
        </Link>
      </div>

      <MenuWorkspace categories={categoryDTOs} items={itemDTOs} publishedSlug={published ? restaurant.slug : null} />
    </div>
  );
}
