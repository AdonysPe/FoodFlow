import { prisma } from "@/lib/db/prisma";
import { withApi } from "@/lib/api/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
  "tipo_registro",
  "restaurante",
  "categoria",
  "plato",
  "descripcion",
  "precio",
  "disponible",
  "pedido_id",
  "fecha_pedido",
  "cliente",
  "canal",
  "estado",
  "total",
  "items",
] as const;

function spreadsheetSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  const text = spreadsheetSafe(value == null ? "" : String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

function orderItemsLabel(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name : "Item";
      const quantity = typeof row.quantity === "number" ? row.quantity : 1;
      const price = typeof row.price === "number" ? `S/ ${row.price.toFixed(2)}` : "";
      return `${quantity} x ${name}${price ? ` (${price})` : ""}`;
    })
    .filter(Boolean)
    .join(" | ");
}

export const GET = withApi(async (_request, context) => {
  const [restaurant, menuItems, orders] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: context.restaurantId },
      select: { name: true },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: context.restaurantId },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        description: true,
        price: true,
        available: true,
        category: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { restaurantId: context.restaurantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        channel: true,
        status: true,
        total: true,
        items: true,
      },
    }),
  ]);

  const restaurantName = restaurant?.name ?? context.restaurantName;
  const rows: string[] = [csvRow(HEADERS)];

  for (const item of menuItems) {
    rows.push(
      csvRow([
        "menu",
        restaurantName,
        item.category?.name ?? "Sin categoría",
        item.name,
        item.description,
        item.price.toFixed(2),
        item.available ? "sí" : "no",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    );
  }

  for (const order of orders) {
    rows.push(
      csvRow([
        "order",
        restaurantName,
        "",
        "",
        "",
        "",
        "",
        order.id,
        order.createdAt.toISOString(),
        order.customerName,
        order.channel,
        order.status,
        order.total.toFixed(2),
        orderItemsLabel(order.items),
      ])
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${rows.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="foodflow-export-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}, { ownerOnly: true });
