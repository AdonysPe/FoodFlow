"use server";

import { createHash, randomBytes } from "node:crypto";
import { planAllows } from "@/lib/plans";
import { resolvePublicOrderLines } from "@/lib/db/orderPricing";
import { OrderingProblem, onlineOrderSchema, readOrderingSettings, orderingAvailability, deliveryQuote, type OnlineOrderInput } from "@/lib/orderingWebsite";
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

  let resolved;
  try { resolved = await resolvePublicOrderLines(prisma, table.restaurantId, lines); }
  catch { return { ok: false, code: "unavailable" }; }

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
  const newLines: Snapshot[] = resolved.items.map(line => ({ ...line, round }));
  const addedTotal = resolved.subtotal;

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

// Same menu snapshots, Order model and kitchen states as the table flow.
export async function submitOnlineOrder(input: OnlineOrderInput): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const parsed = onlineOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del pedido." };
  const data = parsed.data;
  const checkoutKey = createHash("sha256").update(`${data.slug}:${data.checkoutKey}`).digest("hex");
  const checkoutHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  try {
    const limit = await rateLimit("online-order", await callerIpHash(), { max: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) return { ok: false, error: "Has enviado varios pedidos. Espera unos minutos antes de continuar." };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const token = await prisma.$transaction(async tx => {
          const existing = await tx.order.findUnique({ where: { checkoutKey }, select: { publicToken: true, checkoutHash: true } });
          if (existing) {
            if (existing.checkoutHash !== checkoutHash) throw new OrderingProblem("Este intento ya fue enviado con otros datos. Consulta su confirmación.");
            return existing.publicToken!;
          }
          const restaurant = await tx.restaurant.findUnique({ where: { slug: data.slug }, include: { carta: true } });
          if (!restaurant || !planAllows(restaurant.plan, "own_ordering_website")) throw new OrderingProblem("Esta web no está disponible para pedidos.");
          const settings = readOrderingSettings(restaurant.carta?.ordering);
          const availability = orderingAvailability(settings, restaurant.carta?.hours);
          if (!availability.open) throw new OrderingProblem(availability.reason);
          if (!settings.payments.some(p => p.method === data.paymentMethod)) throw new OrderingProblem("El método de pago ya no está disponible.");
          if (!restaurant.carta?.address) throw new OrderingProblem("El local aún no tiene una dirección configurada.");
          const priced = await resolvePublicOrderLines(tx, restaurant.id, data.lines);
          const quote = deliveryQuote(settings, data.channel, data.zoneId, priced.subtotal);
          if (data.expectedTotal != null && Math.round(data.expectedTotal * 100) !== Math.round(quote.total * 100)) throw new OrderingProblem("Los precios o la tarifa cambiaron. Revisa el total actualizado y confirma de nuevo.");
          const publicToken = randomBytes(32).toString("hex");
          await tx.order.create({ data: {
            restaurantId: restaurant.id, source: "online_store", channel: data.channel, tableId: null,
            customerName: data.customerName, customerPhone: data.customerPhone,
            fulfillmentAddress: data.channel === "delivery" ? data.address : restaurant.carta.address,
            deliveryZone: quote.zone?.name ?? null, deliveryReference: data.channel === "delivery" ? data.reference : null,
            customerNotes: data.notes || null, deliveryFee: quote.fee,
            estimatedMinutes: data.channel === "delivery" ? settings.deliveryMinutes : settings.pickupMinutes,
            items: priced.items, total: quote.total, paymentMethod: data.paymentMethod,
            publicToken, checkoutKey, checkoutHash,
          } });
          return publicToken;
        }, { isolationLevel: "Serializable" });
        revalidateService();
        return { ok: true, token };
      } catch (error) {
        const code = (error as { code?: string }).code;
        if ((code === "P2034" || code === "P2002") && attempt < 2) continue;
        throw error;
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof OrderingProblem ? error.message : "No pudimos enviar tu pedido. Reintenta con el mismo carrito." };
  }
  return { ok: false, error: "No pudimos enviar tu pedido. Inténtalo de nuevo." };
}
