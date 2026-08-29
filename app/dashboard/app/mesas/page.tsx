import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import MesasWorkspace from "@/components/dashboard/mesas/MesasWorkspace";
import { toDateInputValue, startOfWeek, addDays } from "@/lib/tableMeta";
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "@/components/dashboard/mesas/types";

export const metadata = {
  title: "Mesas",
};

export default async function MesasPage() {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const todayStr = toDateInputValue(new Date());
  // Load a window around "now" so the weekly view can page one week back and
  // several weeks forward without another round-trip.
  const rangeStart = new Date(`${addDays(startOfWeek(todayStr), -7)}T00:00:00.000Z`);
  const rangeEnd = new Date(`${addDays(startOfWeek(todayStr), 56)}T00:00:00.000Z`);

  const [tables, reservations, activeOrders] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: { restaurantId: restaurant.id, date: { gte: rangeStart, lt: rangeEnd } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { table: { select: { name: true } } },
    }),
    // A table's open tab keeps it occupied until the order is cobrado (paidAt)
    // or anulado (voidedAt) — the kitchen status no longer frees it.
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        tableId: { not: null },
        paidAt: null,
        voidedAt: null,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const tableDTOs: TableDTO[] = tables.map((t) => ({
    id: t.id,
    name: t.name,
    capacity: t.capacity,
    shape: t.shape,
    zone: t.zone,
    x: t.x,
    y: t.y,
    active: t.active,
    occupiedAt: t.occupiedAt ? t.occupiedAt.toISOString() : null,
  }));

  const reservationDTOs: ReservationDTO[] = reservations.map((r) => ({
    id: r.id,
    tableId: r.tableId,
    tableName: r.table?.name ?? null,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    date: r.date.toISOString().slice(0, 10),
    startTime: r.startTime,
    durationMin: r.durationMin,
    partySize: r.partySize,
    status: r.status,
    source: r.source,
    notes: r.notes,
  }));

  const orderDTOs: OrderMiniDTO[] = activeOrders.map((o) => ({
    id: o.id,
    tableId: o.tableId,
    customerName: o.customerName,
    items: o.items as OrderMiniDTO["items"],
    total: o.total,
    status: o.status as OrderMiniDTO["status"],
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <MesasWorkspace
      tables={tableDTOs}
      reservations={reservationDTOs}
      orders={orderDTOs}
      today={todayStr}
    />
  );
}
