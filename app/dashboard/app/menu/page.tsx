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

  const [categories, items] = await Promise.all([
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

  return <MenuWorkspace categories={categoryDTOs} items={itemDTOs} />;
}
