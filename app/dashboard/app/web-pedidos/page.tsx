import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import OrderingWebsiteSettings from "@/components/dashboard/OrderingWebsiteSettings";
import { readOrderingWebsite } from "@/lib/db/orderingWebsite";
import { readOrderingSettings } from "@/lib/orderingWebsite";
import { normalizeHours } from "@/lib/carta";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
export const metadata = { title: "Web de pedidos" };
export default async function OrderingSettingsPage() {
  const { user, restaurant, plan, allowed } = await requirePlanFeature("own_ordering_website");
  if (!allowed) return <PlanGate feature="own_ordering_website" plan={plan} />;
  if (!restaurant) return null;
  if (user.role !== "restaurant_owner") return <div className="lbd-empty">Solo el dueño puede configurar la web de pedidos.</div>;
  const [carta, category, summary, availableItems, sampleItems] = await Promise.all([
    prisma.cartaSettings.findUnique({ where: { restaurantId: restaurant.id } }),
    prisma.restaurantCategory.findUnique({ where: { id: restaurant.categoryId } }),
    prisma.order.aggregate({ where: { restaurantId: restaurant.id, source: "online_store", voidedAt: null }, _count: true, _sum: { total: true } }),
    prisma.menuItem.count({
      where: {
        restaurantId: restaurant.id,
        available: true,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
    }),
    // A few real dishes for the phone that previews the site.
    prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        available: true,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 3,
      select: { id: true, name: true, price: true, photoUrl: true },
    }),
  ]);
  const preview = restaurant.slug ? await readOrderingWebsite(restaurant.slug, true) : null;
  return <OrderingWebsiteSettings
    key={`${restaurant.id}:${carta?.updatedAt.toISOString()}`}
    name={restaurant.name}
    slug={restaurant.slug}
    initial={readOrderingSettings(carta?.ordering)}
    generalHours={normalizeHours(carta?.hours)}
    hasGeneralHours={Boolean(carta?.hours)}
    address={carta?.address ?? ""}
    availableItems={availableItems}
    sampleItems={sampleItems}
    templateName={menuTemplates[resolveMenuTemplate(restaurant.menuTemplateOverride, category?.defaultMenuTemplate)].name}
    preview={preview}
    summary={{ count: summary._count, total: summary._sum.total ?? 0 }}
  />;
}
