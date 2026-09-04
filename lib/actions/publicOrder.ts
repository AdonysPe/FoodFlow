"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { callerIpHash } from "@/lib/security/clientHash";
import { rateLimit } from "@/lib/security/rateLimit";
import { normalizeTableCode } from "@/lib/tableCode";
import { QR_ORIGIN_LABEL } from "@/lib/comandaMeta";

/**
 * Ordering from the QR on the table.
 *
 * This is the only write in the product that runs with no session at all, so
 * the table code is the credential: it is unguessable, it is physically on the
 * table, and it is the single thing that says which table the round belongs
 * to. Everything else is re-read from the database — the client sends dish ids
 * and quantities, never names or prices, so a tampered request cannot invent a
 * S/ 1 lomo saltado.
 *
 * A round lands on the table's open tab if there is one, exactly as a waiter's
 * round would. That is what makes "otra ronda" work: the kitchen sees the new
 * round, the waiter sees one growing bill, and nobody has two accounts open on
 * the same table.
 */
export type PublicOrderResult =
  | { ok: true; round: number; total: number }
  | {
      ok: false;
      code: "invalid" | "unknown_table" | "closed" | "unavailable" | "rate_limited" | "server";
      detail?: string;
    };

/** Enough for a big table ordering twice; far short of a script's appetite. */
const MAX_ROUNDS_PER_HOUR = 6;
const MAX_LINES = 20;
const MAX_QTY = 20;

const schema = z.object({
  code: z.string().transform(normalizeTableCode).pipe(z.string().length(10)),
  lines: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(MAX_QTY),
        note: z.string().trim().max(140).optional().or(z.literal("")),
      })
    )
    .min(1)
    .max(MAX_LINES),
  // Optional: what the diner wants the bill under.
  customerName: z.string().trim().max(60).optional().or(z.literal("")),
});

export type PublicOrderInput = z.input<typeof schema>;

type Snapshot = {
  name: string;
  price: number;
  quantity: number;
  note?: string;
  round: number;
};

export async function submitTableOrder(
  input: PublicOrderInput
): Promise<PublicOrderResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { code, lines, customerName } = parsed.data;

  const table = await prisma.restaurantTable.findUnique({
    where: { publicCode: code },
    select: { id: true, name: true, active: true, restaurantId: true },
  });
  if (!table) return { ok: false, code: "unknown_table" };
  if (!table.active) return { ok: false, code: "closed" };

  // Limited per table, not per address: a party of eight behind one router
  // shares an IP, and turning them away would be the wrong failure.
  const limit = await rateLimit(`qr-order:${table.id}`, await callerIpHash(), {
    max: MAX_ROUNDS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return { ok: false, code: "rate_limited" };

  // Prices and names come from the menu, never from the request.
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: table.restaurantId },
    select: {
      id: true,
      name: true,
      price: true,
      available: true,
      category: { select: { active: true } },
    },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item) return { ok: false, code: "unavailable" };
    if (!item.available || (item.category && !item.category.active)) {
      return { ok: false, code: "unavailable", detail: item.name };
    }
  }

  const openOrder = await prisma.order.findFirst({
    where: {
      restaurantId: table.restaurantId,
      tableId: table.id,
      paidAt: null,
      voidedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, items: true, total: true, roundNumber: true },
  });

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
  const addedTotal = newLines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  try {
    if (openOrder) {
      const merged = [...(openOrder.items as Snapshot[]), ...newLines];
      const updated = await prisma.order.update({
        where: { id: openOrder.id },
        data: {
          items: merged,
          total: openOrder.total + addedTotal,
          roundNumber: round,
          // A fresh round needs the kitchen's eyes again.
          status: "pending",
          readyAt: null,
          serverName: QR_ORIGIN_LABEL,
        },
        select: { total: true },
      });
      revalidateService();
      return { ok: true, round, total: updated.total };
    }

    await prisma.order.create({
      data: {
        restaurantId: table.restaurantId,
        customerName: customerName?.trim() || table.name,
        tableId: table.id,
        channel: "dine_in",
        items: newLines,
        total: addedTotal,
        roundNumber: 1,
        serverName: QR_ORIGIN_LABEL,
      },
    });
  } catch {
    return { ok: false, code: "server" };
  }

  revalidateService();
  return { ok: true, round, total: addedTotal };
}

function revalidateService() {
  for (const path of [
    "/dashboard/app/kitchen",
    "/dashboard/app/mesas",
    "/dashboard/app/orders",
    "/dashboard/comanda",
  ]) {
    revalidatePath(path);
  }
}
