"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import { PAYMENT_METHODS } from "@/lib/paymentMeta";
import type { ActionResult } from "@/lib/actions/auth";

const lineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

const sendSchema = z.object({
  channel: z.enum(["dine_in", "delivery", "pickup"]),
  tableId: z.string().trim().optional().or(z.literal("")),
  lines: z.array(lineSchema).min(1, "Agrega al menos un plato"),
});

export type SendComandaInput = z.input<typeof sendSchema>;

type Snapshot = { name: string; price: number; quantity: number; note?: string; round: number };

function serverDisplayName(email: string): string {
  const handle = email.split("@")[0] ?? email;
  return handle
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function revalidateComandaPaths() {
  for (const p of [
    "/dashboard/comanda",
    "/dashboard/app/overview",
    "/dashboard/app/orders",
    "/dashboard/app/kitchen",
    "/dashboard/app/mesas",
  ]) {
    revalidatePath(p);
  }
}

// Turn a new order / new round into the kitchen board with the table, the
// waiter and the round it belongs to. An existing open order for the table
// grows another round instead of spawning a second order.
export async function sendComanda(
  input: SendComandaInput
): Promise<ActionResult<{ orderId: string; round: number; appended: boolean }>> {
  const { user, restaurant } = await requireComandaRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { channel, tableId, lines } = parsed.data;

  // Resolve every line against the live menu — only items that belong to this
  // restaurant, are available, and sit in an active (or no) category can be sent.
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
    include: { category: { select: { active: true } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item) return { ok: false, error: "Uno de los platos ya no existe en la carta." };
    if (!item.available) return { ok: false, error: `"${item.name}" está agotado.` };
    if (item.category && !item.category.active) {
      return { ok: false, error: `"${item.name}" está en una categoría oculta.` };
    }
  }

  let table: { id: string; name: string } | null = null;
  if (channel === "dine_in") {
    if (!tableId) return { ok: false, error: "Elige una mesa." };
    const found = await prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId: restaurant.id },
      select: { id: true, name: true },
    });
    if (!found) return { ok: false, error: "Esa mesa no existe." };
    table = found;
  }

  // A table's open tab: any unpaid, un-voided order for it — regardless of how
  // far along the kitchen is. It stays open until it's cobrado.
  const openOrder =
    table &&
    (await prisma.order.findFirst({
      where: {
        restaurantId: restaurant.id,
        tableId: table.id,
        paidAt: null,
        voidedAt: null,
      },
      orderBy: { createdAt: "desc" },
    }));

  const round = openOrder ? openOrder.roundNumber + 1 : 1;
  const newLines: Snapshot[] = lines.map((l) => {
    const item = byId.get(l.menuItemId)!;
    return {
      name: item.name,
      price: item.price,
      quantity: l.quantity,
      ...(l.note ? { note: l.note } : {}),
      round,
    };
  });
  const addedTotal = newLines.reduce((s, l) => s + l.price * l.quantity, 0);
  const serverName = serverDisplayName(user.email);

  if (openOrder) {
    const merged = [...(openOrder.items as Snapshot[]), ...newLines];
    await prisma.order.update({
      where: { id: openOrder.id },
      data: {
        items: merged,
        total: openOrder.total + addedTotal,
        roundNumber: round,
        // A fresh round needs the kitchen's eyes again.
        status: "pending",
        readyAt: null,
        serverName,
      },
    });
    revalidateComandaPaths();
    return { ok: true, data: { orderId: openOrder.id, round, appended: true } };
  }

  const created = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      customerName: table ? table.name : channel === "delivery" ? "Delivery" : "Para llevar",
      tableId: table?.id ?? null,
      channel,
      items: newLines,
      total: addedTotal,
      roundNumber: 1,
      serverName,
    },
  });

  revalidateComandaPaths();
  return { ok: true, data: { orderId: created.id, round: 1, appended: false } };
}

const paySchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(PAYMENT_METHODS),
  // Cash tendered — only read for method "efectivo".
  amountReceived: z.coerce.number().nonnegative().optional(),
});

export type PayOrderInput = z.input<typeof paySchema>;

// Cobrar: settle an open order. Cash records the tendered amount and the
// change; card/yape just mark it paid. Once paid, the table frees up.
export async function payOrder(
  input: PayOrderInput
): Promise<ActionResult<{ change: number }>> {
  const { restaurant } = await requireComandaRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const parsed = paySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { orderId, method, amountReceived } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.voidedAt) return { ok: false, error: "Ese pedido fue anulado." };
  if (order.paidAt) return { ok: false, error: "Ese pedido ya está cobrado." };

  let received: number | null = null;
  let change = 0;
  if (method === "efectivo") {
    if (amountReceived == null) return { ok: false, error: "Ingresa el monto recibido." };
    if (amountReceived + 1e-6 < order.total) {
      return { ok: false, error: "El monto recibido es menor que el total." };
    }
    received = amountReceived;
    change = Math.round((amountReceived - order.total) * 100) / 100;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paidAt: new Date(),
      paymentMethod: method,
      amountReceived: received,
      changeGiven: method === "efectivo" ? change : null,
    },
  });

  revalidateComandaPaths();
  return { ok: true, data: { change } };
}

// Anular: close an open order without charging (mistake, comp, walkout). Frees
// the table. Kept out of revenue in the dashboard sums.
export async function voidOrder(orderId: string): Promise<ActionResult> {
  const { restaurant } = await requireComandaRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.paidAt) return { ok: false, error: "Ese pedido ya está cobrado; no se puede anular." };
  if (order.voidedAt) return { ok: true, data: undefined };

  await prisma.order.update({
    where: { id: order.id },
    data: { voidedAt: new Date(), status: "delivered" },
  });

  revalidateComandaPaths();
  return { ok: true, data: undefined };
}
