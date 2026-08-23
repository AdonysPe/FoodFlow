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
});

const channelSchema = z.enum(["dine_in", "delivery", "pickup"]);
const statusSchema = z.enum(["pending", "preparing", "ready", "delivered"]);

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(120),
  customerPhone: z.string().trim().max(40).optional(),
  customerEmail: z.string().trim().toLowerCase().max(120).optional(),
  channel: channelSchema,
  items: z.array(orderItemSchema).min(1, "Add at least one item"),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
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
  items: OrderItemInput[];
}): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No restaurant is linked to your account." };

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { customerName, customerPhone, customerEmail, channel, items } = parsed.data;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: { restaurantId: restaurant.id, customerName, items, total, channel },
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
  if (!restaurant) return { ok: false, error: "No restaurant is linked to your account." };

  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId: restaurant.id } });
  if (!order) return { ok: false, error: "Order not found." };

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
  items: OrderItemInput[];
  total: number;
  channel: OrderChannel;
  status: "pending" | "preparing" | "ready";
  createdAt: string;
};

// Called directly from the client (not just as a form action) so the
// kitchen board can poll for fresh orders without a full page navigation.
export async function getKitchenOrders(): Promise<KitchenOrder[]> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return [];

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, status: { in: ["pending", "preparing", "ready"] } },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    items: o.items as OrderItemInput[],
    total: o.total,
    channel: o.channel as OrderChannel,
    status: o.status as "pending" | "preparing" | "ready",
    createdAt: o.createdAt.toISOString(),
  }));
}
