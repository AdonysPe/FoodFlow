// GET/POST /api/restaurants/:id/billing-config
//
// El `:id` del path NO elige el restaurante: lo elige la sesión. El middleware
// compara los dos y responde 404 si difieren, así que la ruta puede leer
// `ctx.restaurantId` sin volver a comprobar nada.
//
// Solo el dueño entra aquí (`ownerOnly`): un mozo cobra mesas, no cambia el RUC
// del negocio.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withApi, readJson } from "@/lib/api/guard";
import { ApiError, fail, logBilling } from "@/lib/api/respond";
import { getConfig, saveConfig } from "@/lib/billing/config-service";
import { OSE_PROVIDERS } from "@/lib/billing/providers";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_request, ctx) => {
    const config = await getConfig(ctx.restaurantId);
    // Lo que sale de aquí ya viene sin secretos: `readBillingConfig` solo
    // devuelve pistas ("••••••••3f2a") y banderas de "hay credencial guardada".
    return {
      restaurantId: ctx.restaurantId,
      ...config,
    };
  },
  { ownerOnly: true, feature: "orders" }
);

const text = (max: number) => z.string().trim().max(max);

const bodySchema = z
  .object({
    ruc: text(11).optional(),
    razonSocial: text(160).optional(),
    nombreComercial: text(120).optional(),
    direccion: text(200).optional(),
    telefono: text(40).optional(),
    correoNotificacion: text(255).optional(),

    oseProvider: z.enum(["", ...OSE_PROVIDERS]).optional(),
    oseEndpoint: text(300).optional(),
    oseApiKey: text(400).optional(),
    oseApiSecret: text(400).optional(),

    serieBoleta: text(10).optional(),
    serieFactura: text(10).optional(),
    serieNc: text(10).optional(),
    correlativoBoleta: z.coerce.number().int().optional(),
    correlativoFactura: z.coerce.number().int().optional(),
    correlativoNc: z.coerce.number().int().optional(),
  })
  .strict();

export const POST = withApi(
  async (request, ctx) => {
    const body = await readJson(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "validation_error",
        "Hay campos que no podemos guardar tal como llegaron.",
        parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      );
    }

    const result = await saveConfig(ctx.restaurantId, parsed.data);
    if (!result.ok) {
      // 422 con el detalle por campo, que es lo que el formulario pinta al lado
      // de cada input.
      return fail(
        "validation_error",
        result.problems[0]?.message ?? "Revisa los datos.",
        ctx.requestId,
        { details: result.problems }
      );
    }

    // El rastro guarda QUÉ campos se tocaron, nunca sus valores: un audit log
    // con el token del OSE dentro sería el mismo secreto en un segundo sitio.
    await logAudit({
      action: "billing.config.save",
      actor: { id: ctx.actor.userId, email: ctx.actor.email },
      entity: "ReceiptSettings",
      entityId: ctx.restaurantId,
      after: { fields: Object.keys(parsed.data).sort() },
      restaurantId: ctx.restaurantId,
    });
    logBilling("info", "billing.config.saved", {
      requestId: ctx.requestId,
      restaurantId: ctx.restaurantId,
      fields: Object.keys(parsed.data).length,
    });

    revalidatePath("/dashboard/app/configuracion/facturacion");
    revalidatePath("/dashboard/comanda");

    return { restaurantId: ctx.restaurantId, ...result.config };
  },
  { ownerOnly: true, feature: "orders", rateLimit: { bucket: "billing-config", max: 60, windowMs: 60 * 60 * 1000 } }
);
