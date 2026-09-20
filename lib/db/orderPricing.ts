import type { Prisma } from "@prisma/client";
import { OrderingProblem } from "@/lib/orderingWebsite";

// Shared catalog validation for both anonymous order entry points.
export async function resolvePublicOrderLines(db: Pick<Prisma.TransactionClient, "menuItem">, restaurantId: string, lines: { menuItemId: string; quantity: number; note?: string }[], round = 1) {
  const items = await db.menuItem.findMany({
    where: { id: { in: [...new Set(lines.map(l => l.menuItemId))] }, restaurantId },
    select: { id: true, name: true, price: true, available: true, category: { select: { active: true } } },
  });
  const byId = new Map(items.map(item => [item.id, item]));
  const snapshot = lines.map(line => {
    const item = byId.get(line.menuItemId);
    if (!item || !item.available || item.category?.active === false) throw new OrderingProblem("Uno de los platos ya no está disponible. Revisa tu carrito.");
    if (!Number.isFinite(item.price) || item.price < 0) throw new OrderingProblem("El precio de un plato no está disponible.");
    return { name: item.name, price: Math.round(item.price * 100) / 100, quantity: line.quantity, ...(line.note ? { note: line.note } : {}), round };
  });
  return { items: snapshot, subtotal: snapshot.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0) / 100 };
}
