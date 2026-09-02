import { prisma } from "@/lib/db/prisma";
import RestaurantsTable from "@/components/dashboard/RestaurantsTable";
import CreateRestaurantForm from "@/components/dashboard/CreateRestaurantForm";
import type { PlanValue } from "@/lib/plans";

export const metadata = {
  title: "Restaurants",
};

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    include: { owner: true, _count: { select: { staff: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    ownerEmail: r.owner.email,
    plan: r.plan as PlanValue,
    staffCount: r._count.staff,
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
