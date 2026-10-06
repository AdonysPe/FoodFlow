// POST /api/billing/send-email
//
// Reenvía el PDF/XML de un comprobante ya aceptado. El caso real: el diner dio
// mal su correo, o lo pide dos días después.
//
// La dirección de destino puede venir en el cuerpo, y entonces sustituye a la
// guardada — con la cuota puesta bien baja (30/hora) justamente porque un
// endpoint que manda correo a una dirección arbitraria es, si se deja abierto,
// un relay. Solo lo puede llamar el dueño, solo sobre comprobantes de su propio
// local, y solo sobre los que SUNAT ya aceptó.

import { z } from "zod";
import { withApi, readJson } from "@/lib/api/guard";
import { ApiError, logBilling } from "@/lib/api/respond";
import { sendCdrEmail } from "@/lib/billing/delivery";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    cdrId: z.string().trim().min(1, "Falta el comprobante a enviar."),
    email: z.email("Ese correo no tiene un formato válido.").max(255).optional(),
  })
  .strict();

const REASON_CODE = {
  not_found: "not_found",
  not_accepted: "conflict",
  no_email: "validation_error",
  send_failed: "internal",
} as const;

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

    const result = await sendCdrEmail(
      ctx.restaurantId,
      parsed.data.cdrId,
      parsed.data.email ?? null
    );

    if (!result.ok) {
      logBilling("warn", "billing.email.failed", {
        requestId: ctx.requestId,
        restaurantId: ctx.restaurantId,
        cdrId: parsed.data.cdrId,
        reason: result.reason,
      });
      throw new ApiError(REASON_CODE[result.reason], result.message);
    }

    logBilling("info", "billing.email.sent", {
      requestId: ctx.requestId,
      restaurantId: ctx.restaurantId,
      cdrId: parsed.data.cdrId,
      // El correo del cliente no se registra: es dato personal y el id del CDR
      // ya permite encontrarlo cuando de verdad hace falta.
      redirected: Boolean(parsed.data.email),
    });

    await logAudit({
      action: "billing.cdr.email",
      actor: { id: ctx.actor.userId, email: ctx.actor.email },
      entity: "Cdr",
      entityId: parsed.data.cdrId,
      after: { redirected: Boolean(parsed.data.email) },
      restaurantId: ctx.restaurantId,
    });

    return { sentAt: result.at.toISOString(), to: result.to };
  },
  { ownerOnly: true, feature: "orders", rateLimit: { bucket: "billing-email", max: 30, windowMs: 60 * 60 * 1000 } }
);
