// POST /api/billing/emit
//
// Emite (o reintenta) el comprobante de un pedido ya cobrado.
//
// TRES GUARDIAS ANTES DEL HANDLER, puestos por `withApi`: sesión, inquilino y
// cuota de 100 emisiones/hora. El cuarto, `requireBillingConfig`, es el que
// evita el peor caso: sacar un correlativo con la configuración a medias y
// dejarle al local un hueco en la serie que tendrá que explicarle a SUNAT.
//
// LO QUE ESTA RUTA NO HACE: cobrar. Cobrar es de la comanda. Aquí solo se emite
// lo de un pedido que ya tiene `paidAt` y un tipo de documento electrónico.
//
// IDEMPOTENCIA. Un pedido ya aceptado devuelve 409 con su propio número en vez
// de emitir otra vez. Un pedido pendiente reintenta con el MISMO correlativo.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { withApi, readJson, EMISSION_RATE_LIMIT } from "@/lib/api/guard";
import { ApiError, fail, logBilling } from "@/lib/api/respond";
import { emitForOrder } from "@/lib/billing/emission";
import { getCdr, toDTO } from "@/lib/billing/cdr-service";
import { logAudit } from "@/lib/audit/log";
import { SUNAT_ACCEPTED } from "@/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Un OSE lento no puede tumbar la petición antes de que lleguemos a archivar
// la respuesta: 20 s de timeout en el adaptador, 60 s aquí.
export const maxDuration = 60;

const bodySchema = z
  .object({
    orderId: z.string().trim().min(1, "Falta el pedido a facturar."),
    /** Opcional: por defecto se respeta lo que el diner pidió en la caja. */
    documentType: z.enum(["boleta", "factura"]).optional(),
  })
  .strict();

export const POST = withApi(
  async (request, ctx) => {
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(
        "validation_error",
        parsed.error.issues[0]?.message ?? "Datos incompletos.",
        parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      );
    }
    const { orderId } = parsed.data;

    // El pedido se busca DENTRO del restaurante de la sesión. Un id de otro
    // local simplemente no existe desde aquí.
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: ctx.restaurantId },
      select: {
        id: true,
        paidAt: true,
        voidedAt: true,
        documentType: true,
        sunatStatus: true,
        docSeries: true,
        docNumber: true,
      },
    });

    if (!order) throw new ApiError("not_found", "No encontramos ese pedido.");
    if (order.voidedAt) throw new ApiError("conflict", "Ese pedido está anulado.");
    if (!order.paidAt) {
      throw new ApiError("conflict", "Ese pedido todavía no está cobrado; no hay nada que emitir.");
    }

    const documentType = parsed.data.documentType ?? order.documentType;
    if (documentType !== "boleta" && documentType !== "factura") {
      throw new ApiError(
        "conflict",
        "Ese cobro se hizo como nota de venta interna. Para emitir un comprobante electrónico, cóbralo como boleta o factura."
      );
    }

    // Ya aceptado: no se vuelve a emitir. Se devuelve lo que ya existe.
    if (order.sunatStatus === SUNAT_ACCEPTED) {
      const existing =
        order.docSeries && order.docNumber != null
          ? await prisma.cdr.findFirst({
              where: {
                restaurantId: ctx.restaurantId,
                serie: order.docSeries,
                correlativo: String(order.docNumber).padStart(8, "0"),
              },
            })
          : null;
      return fail(
        "conflict",
        "Ese comprobante ya fue aceptado por SUNAT.",
        ctx.requestId,
        { details: existing ? { cdr: toDTO(existing) } : undefined }
      );
    }

    const outcome = await emitForOrder(ctx.restaurantId, order.id, documentType);

    logBilling(outcome.status === "accepted" ? "info" : "warn", "billing.emit", {
      requestId: ctx.requestId,
      restaurantId: ctx.restaurantId,
      orderId: order.id,
      documentType,
      status: outcome.status,
      ...(outcome.status === "failed" ? { code: outcome.code, retryable: outcome.retryable } : {}),
    });

    await logAudit({
      action: "billing.emit",
      actor: { id: ctx.actor.userId, email: ctx.actor.email },
      entity: "Order",
      entityId: order.id,
      after: {
        status: outcome.status,
        documentNo: outcome.status === "accepted" ? outcome.documentNo : null,
      },
      restaurantId: ctx.restaurantId,
    });

    revalidatePath("/dashboard/comanda");
    revalidatePath(`/dashboard/boleta/${order.id}`);

    const cdr =
      outcome.status !== "none" && outcome.cdrId
        ? await getCdr(ctx.restaurantId, outcome.cdrId)
        : null;

    // Un fallo de emisión NO es un fallo de la petición: la llamada se procesó,
    // el pedido sigue cobrado y el ticket interno se entrega igual. Por eso
    // sale 200 con el desenlace dentro, y no un 5xx que el frontend tendría que
    // interpretar como "quizá se emitió, quizá no".
    return {
      outcome,
      cdr: cdr ? toDTO(cdr) : null,
    };
  },
  { rateLimit: EMISSION_RATE_LIMIT, requireBillingConfig: true }
);
