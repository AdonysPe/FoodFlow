"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { ActionResult } from "@/lib/actions/auth";

const orderItemSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  // Set by the mobile comanda: a quick per-line instruction ("sin cebolla")
  // and which round the line was sent in.
  note: z.string().trim().max(200).optional(),
  round: z.number().int().positive().optional(),
});

// What "Registrar pedido" actually sends: a menu item id and a quantity.
// Name and price are never taken from the client — they are looked up from
// this restaurant's own menu below, the same way sendComanda resolves them,
// so a request can't set its own price for a dish.
const createOrderLineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  note: z.string().trim().max(200).optional(),
});

const channelSchema = z.enum(["dine_in", "delivery", "pickup"]);
const statusSchema = z.enum(["pending", "preparing", "ready", "delivered"]);

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "El nombre del cliente es obligatorio").max(120),
  customerPhone: z.string().trim().max(40).optional(),
  customerEmail: z.string().trim().toLowerCase().max(120).optional(),
  channel: channelSchema,
  items: z.array(createOrderLineSchema).min(1, "Agrega al menos un plato"),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderLineInput = z.infer<typeof createOrderLineSchema>;
export type OrderChannel = z.infer<typeof channelSchema>;
export type OrderStatusValue = z.infer<typeof statusSchema>;

function revalidateOrderPaths() {
  for (const path of [
    "/dashboard/app/overview",
    "/dashboard/app/orders",
    "/dashboard/app/kitchen",
    "/dashboard/app/customers",
    "/dashboard/app/analytics",
  ]) {
    revalidatePath(path);
  }
}

export async function createOrder(input: {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  channel: OrderChannel;
  items: CreateOrderLineInput[];
}): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { customerName, customerPhone, customerEmail, channel, items } = parsed.data;

  // Resolve every line against this restaurant's own menu — the same
  // control sendComanda applies — so a request can't set its own price.
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  for (const line of items) {
    if (!byId.has(line.menuItemId)) {
      return { ok: false, error: "Uno de los platos ya no existe en la carta." };
    }
  }
  const resolvedItems: OrderItemInput[] = items.map((line) => {
    const item = byId.get(line.menuItemId)!;
    return {
      name: item.name,
      price: item.price,
      quantity: line.quantity,
      ...(line.note ? { note: line.note } : {}),
    };
  });
  const total = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: { restaurantId: restaurant.id, customerName, items: resolvedItems, total, channel },
    });

    if (customerPhone || customerEmail) {
      const existing = await tx.customer.findFirst({
        where: { restaurantId: restaurant.id, name: { equals: customerName, mode: "insensitive" } },
      });
      if (existing) {
        await tx.customer.update({
          where: { id: existing.id },
          data: { phone: customerPhone || existing.phone, email: customerEmail || existing.email },
        });
      } else {
        await tx.customer.create({
          data: {
            restaurantId: restaurant.id,
            name: customerName,
            phone: customerPhone || null,
            email: customerEmail || null,
          },
        });
      }
    }
  });

  revalidateOrderPaths();
  return { ok: true, data: undefined };
}

export async function updateOrderStatus(orderId: string, rawStatus: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Estado no válido." };

  const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId: restaurant.id } });
  if (!order) return { ok: false, error: "Pedido no encontrado." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: parsed.data,
      readyAt: parsed.data === "ready" && !order.readyAt ? new Date() : order.readyAt,
    },
  });

  revalidateOrderPaths();
  return { ok: true, data: undefined };
}

export type KitchenOrder = {
  id: string;
  customerName: string;
  tableName: string | null;
  tableZone: string | null;
  serverName: string | null;
  roundNumber: number;
  items: OrderItemInput[];
  total: number;
  channel: OrderChannel;
  status: "pending" | "preparing" | "ready";
  paid: boolean;
  createdAt: string;
};

// Called directly from the client (not just as a form action) so the
// kitchen board can poll for fresh orders without a full page navigation.
export async function getKitchenOrders(): Promise<KitchenOrder[]> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return [];

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      status: { in: ["pending", "preparing", "ready"] },
      voidedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: { table: { select: { name: true, zone: true } } },
  });

  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    tableName: o.table?.name ?? null,
    tableZone: o.table?.zone ?? null,
    serverName: o.serverName,
    roundNumber: o.roundNumber,
    items: o.items as OrderItemInput[],
    total: o.total,
    channel: o.channel as OrderChannel,
    status: o.status as "pending" | "preparing" | "ready",
    paid: o.paidAt != null,
    createdAt: o.createdAt.toISOString(),
  }));
}
