import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import CartaOverview from "@/components/dashboard/CartaOverview";
import ServiceOverview from "@/components/dashboard/overview/ServiceOverview";
import { loadServiceOverview } from "@/lib/db/serviceOverview";
import { demoOverview, parseOverviewRange } from "@/lib/serviceOverview";
import { planAllows } from "@/lib/plans";

export const metadata = {
  title: "Resumen",
};

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { restaurant, plan, entitlement, allowed } = await requirePlanFeature("orders");
  if (!restaurant) return null;

  if (entitlement?.mode === "locked") {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-warn/25 bg-warn/[0.06] p-6 sm:p-8" role="status">
        <h1 className="font-display text-[20px] font-bold text-fg">El acceso al resumen está pausado</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {entitlement.reason === "pending_confirmation"
            ? "Estamos confirmando el pago de tu suscripción. El acceso se habilitará cuando recibamos la confirmación."
            : "Revisa el estado de cobro y las opciones disponibles para este restaurante."}
        </p>
        <a href="/dashboard/app/configuracion" className="mt-5 inline-flex rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-4 py-2.5 text-[14px] font-semibold text-on-accent">Ver plan y cobro</a>
      </section>
    );
  }

  // Without the orders module there is nothing to total up, so the Carta plan
  // gets a menu-shaped overview instead of four zeroed sales tiles.
  if (!allowed) {
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
  // Lima has no daylight saving: a fixed UTC-5 offset gives its wall clock.
  const limaHour = new Date(now.getTime() - 5 * 60 * 60 * 1000).getUTCHours();
  const greeting = limaHour < 12 ? "Buenos días" : limaHour < 19 ? "Buenas tardes" : "Buenas noches";
  const turn = limaHour < 12 ? "mañana" : limaHour < 19 ? "tarde" : "noche";
  const today = now.toLocaleDateString("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" });
  const dateLine = today.charAt(0).toUpperCase() + today.slice(1);
  const eyebrow = range === "1d" ? `${dateLine} · turno ${turn}` : `${period} · hasta hoy`;

  return (
    <>
      <AutoRefresh intervalMs={10000} />
      <ServiceOverview data={data} eyebrow={eyebrow} greeting={greeting} canComanda={planAllows(plan, "comanda")} />
    </>
  );
}
