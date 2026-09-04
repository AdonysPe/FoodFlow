"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import { PAYMENT_METHODS, needsCashSplit } from "@/lib/paymentMeta";
import { nextReceiptNumber } from "@/lib/db/receiptSettings";
import { nextElectronicNumber, readOseCredentials } from "@/lib/db/billing";
import { emitComprobante, type EmissionFailureCode } from "@/lib/billing/emit";
import { isOseProvider } from "@/lib/billing/providers";
import { checkDni, checkEmail, checkRuc } from "@/lib/billing/validation";
import { SUNAT_ACCEPTED } from "@/lib/receipt";
import type { ActionResult } from "@/lib/actions/auth";

const lineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

const sendSchema = z.object({
  channel: z.enum(["dine_in", "delivery", "pickup"]),
  tableId: z.string().trim().optional().or(z.literal("")),
  // Who the account is under, asked once when the order is opened. Optional:
  // a busy service should never be blocked on a name nobody gave.
  customerName: z.string().trim().max(60).optional().or(z.literal("")),
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
  const { channel, tableId, customerName, lines } = parsed.data;

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
      // Falls back to the table (or the channel) so the kitchen board and
      // the orders list always have something to print.
      customerName:
        customerName?.trim() ||
        (table ? table.name : channel === "delivery" ? "Delivery" : "Para llevar"),
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

const customerSchema = z.object({
  docType: z.enum(["dni", "ruc"]).optional(),
  docId: z.string().trim().max(11).optional().or(z.literal("")),
  name: z.string().trim().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
});

const paySchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(PAYMENT_METHODS),
  // Cash tendered — read for "efectivo" (vuelto) and "mixto" (the cash half).
  amountReceived: z.coerce.number().nonnegative().optional(),
  // What the diner asked for at the till. Defaults to the internal ticket,
  // which is what every charge was before the comprobante picker existed.
  documentType: z.enum(["nota_venta", "boleta", "factura"]).default("nota_venta"),
  customer: customerSchema.optional(),
});

export type PayOrderInput = z.input<typeof paySchema>;

export type EmissionOutcome =
  | { status: "none" }
  | { status: "accepted"; documentNo: string; hash: string | null; message: string }
  | { status: "failed"; code: EmissionFailureCode; message: string };

export type PayOrderResult = {
  change: number;
  orderId: string;
  emission: EmissionOutcome;
};

/**
 * Checks the customer block against what the document type actually requires.
 *
 * A factura without a valid RUC, a razón social and an address is rejected by
 * SUNAT every time, so it is rejected here first — at the till, where the
 * diner is still standing and can give the missing datum.
 */
function checkCustomerFor(
  documentType: "nota_venta" | "boleta" | "factura",
  customer: z.infer<typeof customerSchema> | undefined
): string | null {
  if (documentType === "nota_venta") return null;

  if (documentType === "factura") {
    if (customer?.docType !== "ruc") return "Una factura se emite a un RUC.";
    const problem = checkRuc(customer.docId ?? "");
    if (problem) return problem;
    if (!customer.name) return "Ingresa la razón social del cliente.";
    if (!customer.address) return "Ingresa la dirección del cliente.";
    const emailProblem = checkEmail(customer.email ?? "", { required: true });
    if (emailProblem) return emailProblem;
    return null;
  }

  // Boleta: the DNI is optional under SUNAT rules below S/700, so it is only
  // validated when the waiter actually typed one.
  if (customer?.docId) {
    const problem = checkDni(customer.docId);
    if (problem) return problem;
  }
  if (customer?.email) {
    const problem = checkEmail(customer.email);
    if (problem) return problem;
  }
  return null;
}

// Cobrar: settle an open order, then — only if the diner asked for a boleta or
// a factura — try to emit it through the venue's OSE.
//
// The order of those two matters. The money is recorded first and unconditionally:
// a diner who paid has paid, whatever SUNAT or the OSE answer a second later.
// A failed emission leaves the charge standing and the till falls back to the
// internal nota de venta, which is exactly what the error state offers.
export async function payOrder(
  input: PayOrderInput
): Promise<ActionResult<PayOrderResult>> {
  const { restaurant } = await requireComandaRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const parsed = paySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { orderId, method, amountReceived, documentType, customer } = parsed.data;

  const customerProblem = checkCustomerFor(documentType, customer);
  if (customerProblem) return { ok: false, error: customerProblem };

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
  } else if (needsCashSplit(method)) {
    if (amountReceived == null) {
      return { ok: false, error: "Ingresa cuánto se paga en efectivo." };
    }
    if (amountReceived - 1e-6 > order.total) {
      return { ok: false, error: "La parte en efectivo no puede superar el total." };
    }
    received = amountReceived;
  }

  // The document number is drawn before the write so the order is never left
  // paid-but-unnumbered: if the counter fails, nothing was charged and the
  // waiter can try again. A number burned on a failed charge is the cheaper
  // mistake than a settled order with no ticket to hand over.
  const receipt = await nextReceiptNumber(restaurant.id);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paidAt: new Date(),
      paymentMethod: method,
      amountReceived: received,
      changeGiven: method === "efectivo" ? change : null,
      receiptSeries: receipt.series,
      receiptNumber: receipt.number,
      documentType,
      billingDocType: customer?.docType ?? null,
      billingDocId: customer?.docId || null,
      billingName: customer?.name || null,
      billingAddress: customer?.address || null,
      billingEmail: customer?.email || null,
    },
  });

  const emission =
    documentType === "nota_venta"
      ? ({ status: "none" } as EmissionOutcome)
      : await attemptEmission(restaurant.id, order.id, documentType);

  revalidateComandaPaths();
  return { ok: true, data: { change, orderId: order.id, emission } };
}

/**
 * Retry the emission of an already-charged order.
 *
 * Reuses the correlative drawn the first time instead of taking a new one: a
 * gap in a SUNAT series has to be justified, and the first attempt never
 * reached them.
 */
export async function retryEmission(
  orderId: string
): Promise<ActionResult<EmissionOutcome>> {
  const { restaurant } = await requireComandaRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: { id: true, paidAt: true, documentType: true, sunatStatus: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (!order.paidAt) return { ok: false, error: "Ese pedido todavía no está cobrado." };
  if (order.documentType == null || order.documentType === "nota_venta") {
    return { ok: false, error: "Ese cobro se hizo como ticket interno, no hay nada que emitir." };
  }
  if (order.sunatStatus === SUNAT_ACCEPTED) {
    return { ok: false, error: "Ese comprobante ya fue aceptado por SUNAT." };
  }

  const emission = await attemptEmission(restaurant.id, order.id, order.documentType);
  revalidateComandaPaths();
  return { ok: true, data: emission };
}

/**
 * Everything between a charged order and the OSE.
 *
 * Never throws: whatever goes wrong ends up written on the order as a status
 * plus a sentence in Spanish, because that sentence is what the waiter reads
 * on the till with the diner still at the table.
 */
async function attemptEmission(
  restaurantId: string,
  orderId: string,
  documentType: "boleta" | "factura"
): Promise<EmissionOutcome> {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      select: {
        items: true,
        total: true,
        docSeries: true,
        docNumber: true,
        billingDocType: true,
        billingDocId: true,
        billingName: true,
        billingAddress: true,
        billingEmail: true,
      },
    }),
    prisma.receiptSettings.findUnique({
      where: { restaurantId },
      select: {
        ruc: true,
        legalName: true,
        tradeName: true,
        address: true,
        showIgv: true,
        igvRate: true,
        oseProvider: true,
        oseEndpoint: true,
        boletaSeries: true,
        facturaSeries: true,
      },
    }),
  ]);

  if (!order) return { status: "failed", code: "not_configured", message: "Pedido no encontrado." };

  const provider = isOseProvider(settings?.oseProvider) ? settings.oseProvider : null;
  const missing: string[] = [];
  if (!settings?.ruc) missing.push("tu RUC");
  if (!settings?.legalName) missing.push("tu razón social");
  if (!provider) missing.push("tu proveedor OSE");

  const credentials = provider ? await readOseCredentials(restaurantId) : null;
  if (provider && !credentials) missing.push("la credencial del OSE");
  if (provider && credentials && !credentials.certificate) missing.push("tu certificado digital");

  if (missing.length > 0) {
    const message = `Falta ${missing.join(", ")} en Configuración › Facturación. El cobro quedó registrado; entrega la nota de venta.`;
    await recordEmission(orderId, { status: "no_emitido", message });
    return { status: "failed", code: "not_configured", message };
  }

  // Reuse the correlative of a previous attempt; only a first attempt draws.
  const drawn =
    order.docNumber != null && order.docSeries
      ? { series: order.docSeries, number: order.docNumber }
      : await nextElectronicNumber(restaurantId, documentType);

  if (order.docNumber == null) {
    await prisma.order.update({
      where: { id: orderId },
      data: { docSeries: drawn.series, docNumber: drawn.number },
    });
  }

  const lines = (Array.isArray(order.items) ? order.items : []) as {
    name: string;
    price: number;
    quantity: number;
  }[];

  const result = await emitComprobante(provider, {
    documentType,
    series: drawn.series,
    number: drawn.number,
    issuedAt: new Date(),
    issuer: {
      ruc: settings!.ruc!,
      legalName: settings!.legalName!,
      tradeName: settings!.tradeName,
      address: settings!.address,
    },
    customer: order.billingDocId
      ? {
          docType: order.billingDocType === "ruc" ? "ruc" : "dni",
          docId: order.billingDocId,
          name: order.billingName,
          address: order.billingAddress,
          email: order.billingEmail,
        }
      : null,
    lines: lines.map((l) => ({
      description: l.name,
      quantity: l.quantity,
      unitPrice: l.price,
    })),
    total: order.total,
    igvRate: settings!.igvRate,
    taxed: settings!.showIgv,
    credentials: {
      apiKey: credentials!.apiKey,
      apiSecret: credentials!.apiSecret,
      endpoint: settings!.oseEndpoint,
      certificate: credentials!.certificate,
      certificatePassword: credentials!.certificatePassword,
    },
  });

  if (result.ok) {
    await recordEmission(orderId, {
      status: SUNAT_ACCEPTED,
      message: result.message,
      hash: result.hash,
      link: result.link,
    });
    return {
      status: "accepted",
      documentNo: result.documentNo,
      hash: result.hash,
      message: result.message,
    };
  }

  await recordEmission(orderId, { status: result.code, message: result.message });
  return { status: "failed", code: result.code, message: result.message };
}

async function recordEmission(
  orderId: string,
  patch: { status: string; message: string; hash?: string | null; link?: string | null }
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      sunatStatus: patch.status,
      sunatMessage: patch.message.slice(0, 400),
      sunatHash: patch.hash ?? null,
      sunatLink: patch.link ?? null,
    },
  });
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
