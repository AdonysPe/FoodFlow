import { prisma } from "@/lib/db/prisma";
import { normalizeHours } from "@/lib/carta";
import { resolveMenuTemplate } from "@/lib/menuTemplates";

/** Public snapshot for one QR table, shared by the first paint and refresh. */
export async function readTableOrderState(code: string) {
  const table = await prisma.restaurantTable.findUnique({
    where: { publicCode: code },
    select: {
      id: true, name: true, zone: true, active: true, restaurantId: true,
      restaurant: { select: {
        name: true,
        menuTemplateOverride: true,
        category: { select: { defaultMenuTemplate: true } },
        carta: { select: { logoUrl: true, tagline: true, address: true, hours: true } },
      } },
    },
  });
  if (!table?.active) return null;
  const [categories, items, order] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: table.restaurantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: table.restaurantId, OR: [{ categoryId: null }, { category: { active: true } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, price: true, photoUrl: true, categoryId: true, prepMin: true, available: true },
    }),
    prisma.order.findFirst({
      where: { restaurantId: table.restaurantId, tableId: table.id, paidAt: null, voidedAt: null },
      orderBy: { createdAt: "desc" },
      select: { items: true, total: true, roundNumber: true, status: true },
    }),
  ]);
  return {
    table: { name: table.name, zone: table.zone },
    restaurantName: table.restaurant.name,
    template: resolveMenuTemplate(table.restaurant.menuTemplateOverride, table.restaurant.category.defaultMenuTemplate),
    venue: {
      logoUrl: table.restaurant.carta?.logoUrl ?? null,
      tagline: table.restaurant.carta?.tagline ?? null,
      address: table.restaurant.carta?.address ?? null,
      hours: table.restaurant.carta?.hours ? normalizeHours(table.restaurant.carta.hours) : null,
    },
    categories,
    items,
    openTab: order ? { lines: order.items, total: order.total, round: order.roundNumber, status: order.status } : null,
  };
}
