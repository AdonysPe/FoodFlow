import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import MenuItemForm from "@/components/dashboard/MenuItemForm";
import MenuItemsTable from "@/components/dashboard/MenuItemsTable";

export const metadata = {
  title: "Menú",
};

export default async function MenuPage() {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <MenuItemForm />
      <MenuItemsTable items={items} />
    </div>
  );
}
