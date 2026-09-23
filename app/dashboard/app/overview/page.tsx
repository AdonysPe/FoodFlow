import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import CartaOverview from "@/components/dashboard/CartaOverview";
import ServiceOverview from "@/components/dashboard/overview/ServiceOverview";
import { loadServiceOverview } from "@/lib/db/serviceOverview";
import { demoOverview, parseOverviewRange } from "@/lib/serviceOverview";
import { planAllows, type PlanValue } from "@/lib/plans";

export const metadata = {
  title: "Resumen",
};

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const plan = restaurant.plan as PlanValue;

  // Without the orders module there is nothing to total up, so the Carta plan
  // gets a menu-shaped overview instead of four zeroed sales tiles.
  if (!planAllows(plan, "orders")) {
    const [items, categoryCount] = await Promise.all([
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id },
        select: { id: true, name: true, available: true },
        orderBy: { name: "asc" },
      }),
      prisma.menuCategory.count({ where: { restaurantId: restaurant.id } }),
    ]);

    return (
      <CartaOverview
        restaurantName={restaurant.name}
        plan={plan}
        itemCount={items.length}
        availableCount={items.filter((i) => i.available).length}
        categoryCount={categoryCount}
        soldOut={items.filter((i) => !i.available).map((i) => ({ id: i.id, name: i.name }))}
      />
    );
  }

  const range = parseOverviewRange((await searchParams).range);
  const now = new Date();

  // An owner with no orders yet gets the panel they were shown on the landing,
  // under a "datos de ejemplo" banner, instead of four zeros and an empty chart.
  const hasOrders = (await prisma.order.count({ where: { restaurantId: restaurant.id }, take: 1 })) > 0;
  const data = hasOrders
    ? await loadServiceOverview(restaurant.id, range, now)
    : demoOverview(range, now);

  const period = range === "1d" ? "Hoy" : range === "7d" ? "Últimos 7 días" : "Últimos 30 días";
  const eyebrow = data.demo
    ? `${period} · datos de demostración`
    : range === "1d"
      ? `Hoy · ${now.toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" })}`
      : period;

  return (
    <>
      <AutoRefresh intervalMs={10000} />
      <ServiceOverview data={data} eyebrow={eyebrow} />
    </>
  );
}
