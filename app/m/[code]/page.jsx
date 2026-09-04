import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { normalizeTableCode } from "@/lib/tableCode";
import TableOrderFlow from "@/components/public/TableOrderFlow";

export const metadata = {
  title: "Pedir en la mesa",
  robots: { index: false, follow: false },
};

// The open tab changes between two scans of the same QR, so this page is never
// served from a cache.
export const dynamic = "force-dynamic";

export default async function TableOrderPage({ params }) {
  const { code: raw } = await params;
  const code = normalizeTableCode(raw);
  if (code.length !== 10) notFound();

  const table = await prisma.restaurantTable.findUnique({
    where: { publicCode: code },
    select: {
      id: true,
      name: true,
      zone: true,
      active: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
  });
  if (!table || !table.active) notFound();

  // Three narrow reads rather than one wide one: the diner is on mobile data
  // and only the fields the screen paints are worth the round trip.
  const [categories, items, openOrder] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: table.restaurantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: table.restaurantId, available: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        categoryId: true,
        prepMin: true,
      },
    }),
    prisma.order.findFirst({
      where: {
        restaurantId: table.restaurantId,
        tableId: table.id,
        paidAt: null,
        voidedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { items: true, total: true, roundNumber: true, status: true },
    }),
  ]);

  return (
    <main id="main" className="min-h-screen bg-ink-950">
      <TableOrderFlow
        code={code}
        table={{ name: table.name, zone: table.zone }}
        restaurantName={table.restaurant?.name ?? "El restaurante"}
        categories={categories}
        items={items}
        openTab={
          openOrder
            ? {
                lines: openOrder.items,
                total: openOrder.total,
                round: openOrder.roundNumber,
                status: openOrder.status,
              }
            : null
        }
      />
    </main>
  );
}
