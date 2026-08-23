import { prisma } from "@/lib/db/prisma";
import RestaurantsTable from "@/components/dashboard/RestaurantsTable";
import CreateRestaurantForm from "@/components/dashboard/CreateRestaurantForm";

export const metadata = {
  title: "Restaurants",
};

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    ownerEmail: r.owner.email,
    createdAtLabel: r.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <CreateRestaurantForm />
      <RestaurantsTable restaurants={rows} />
    </div>
  );
}
