import { prisma } from "@/lib/db/prisma";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import {
  BLOCKING_RESERVATION_STATUSES,
  reservationStillHolds,
  toDateInputValue,
} from "@/lib/tableMeta";
import type {
  ComandaTableDTO,
  ComandaCategoryDTO,
  ComandaItemDTO,
  FrequentItemDTO,
  OpenTabDTO,
  OpenTabLine,
} from "@/lib/comandaMeta";
import { planAllows, PLAN_LABELS, firstPlanWith, type PlanValue } from "@/lib/plans";
import ComandaFlow from "@/components/dashboard/comanda/ComandaFlow";

export const metadata = { title: "Comanda" };

export default async function ComandaPage() {
  const { restaurant, isOwner } = await requireComandaRestaurant();

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="text-[15px] text-fg/60">
          Tu cuenta todavía no está vinculada a un restaurante. Pídele al dueño que te agregue al
          equipo.
        </p>
      </div>
    );
  }

  // The comanda has its own bare layout (no sidebar), so it explains the gate
  // here instead of rendering the dashboard's PlanGate screen.
  const plan = restaurant.plan as PlanValue;
  if (!planAllows(plan, "comanda")) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-fg">
          La comanda viene con el plan {PLAN_LABELS[firstPlanWith("comanda")]}
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-fg/50">
          {isOwner
            ? `Tu plan actual es ${PLAN_LABELS[plan]}. Escríbenos para activarla y que tus mozos tomen pedidos desde el teléfono.`
            : "Este restaurante todavía no tiene la comanda activa. Avísale al dueño."}
        </p>
        {isOwner && (
          <a
            href="https://wa.me/51950360685"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-2.5 text-[14px] font-semibold text-on-accent"
          >
            Hablar para subir de plan
          </a>
        )}
      </div>
    );
  }

  const todayIso = toDateInputValue(new Date());
  const rangeStart = new Date(`${todayIso}T00:00:00.000Z`);
  const rangeEnd = new Date(`${todayIso}T23:59:59.999Z`);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [tables, categories, items, openOrders, todayReservations, recentOrders] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id, active: true },
      orderBy: [{ zone: "asc" }, { createdAt: "asc" }],
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        available: true,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        tableId: { not: null },
        paidAt: null,
        voidedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: { table: { select: { name: true, zone: true } } },
    }),
    prisma.reservation.findMany({
      where: { restaurantId: restaurant.id, date: { gte: rangeStart, lte: rangeEnd } },
    }),
    prisma.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: thirtyDaysAgo }, voidedAt: null },
      select: { items: true },
      take: 500,
    }),
  ]);

  const openByTable = new Map<string, (typeof openOrders)[number]>();
  for (const o of openOrders) {
    if (o.tableId && !openByTable.has(o.tableId)) openByTable.set(o.tableId, o);
  }

  const openTabs: OpenTabDTO[] = openOrders
    .filter((o) => o.tableId)
    .map((o) => ({
      orderId: o.id,
      tableId: o.tableId!,
      tableName: o.table?.name ?? o.customerName,
      customerName: o.customerName,
      tableZone: o.table?.zone ?? null,
      lines: o.items as OpenTabLine[],
      total: o.total,
      roundNumber: o.roundNumber,
      kitchenStatus: o.status as OpenTabDTO["kitchenStatus"],
      serverName: o.serverName,
      openedAt: o.createdAt.toISOString(),
    }));

  const tableDTOs: ComandaTableDTO[] = tables.map((t) => {
    const open = openByTable.get(t.id);
    let state: ComandaTableDTO["state"] = "libre";
    if (t.occupiedAt || open) {
      state = "ocupada";
    } else if (
      todayReservations.some(
        (r) =>
          r.tableId === t.id &&
          BLOCKING_RESERVATION_STATUSES.includes(r.status) &&
          reservationStillHolds(r.startTime, r.durationMin, nowMin)
      )
    ) {
      state = "reservada";
    }
    return {
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      zone: t.zone,
      state,
      openOrderId: open?.id ?? null,
      nextRound: open ? open.roundNumber + 1 : null,
    };
  });

  const categoryDTOs: ComandaCategoryDTO[] = categories.map((c) => ({ id: c.id, name: c.name }));
  const itemDTOs: ComandaItemDTO[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    categoryId: i.categoryId,
    prepMin: i.prepMin,
  }));

  // "Frecuentes": tally sold quantity by name over the last 30 days, then map
  // back onto items that are still on the menu today.
  const tally = new Map<string, number>();
  for (const o of recentOrders) {
    for (const line of o.items as { name: string; quantity: number }[]) {
      tally.set(line.name, (tally.get(line.name) ?? 0) + line.quantity);
    }
  }
  const frequent: FrequentItemDTO[] = itemDTOs
    .map((i) => ({ item: i, count: tally.get(i.name) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(({ item }) => ({ id: item.id, name: item.name, price: item.price }));

  return (
    <ComandaFlow
      tables={tableDTOs}
      categories={categoryDTOs}
      items={itemDTOs}
      frequent={frequent}
      openTabs={openTabs}
    />
  );
}
