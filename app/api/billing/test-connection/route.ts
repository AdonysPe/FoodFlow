// POST /api/billing/test-connection
//
// Prueba la cuenta del OSE. Dos modos:
//
//   {}                        prueba lo que está guardado y anota el resultado
//   { apiKey, provider, … }   prueba una credencial que el dueño acaba de
//                             escribir, ANTES de guardarla
//
// El segundo modo existe porque probar-después-de-guardar obliga a persistir
// una credencial que quizá esté mal. Lo que llega por el cuerpo se usa una vez
// y se descarta: no se guarda, no se registra, no vuelve en la respuesta.
//
// Cuota baja a propósito (20/hora): cada llamada golpea un servicio de un
// tercero al que el restaurante le paga.

import { z } from "zod";
import { withApi, readJson } from "@/lib/api/guard";
import { ApiError, logBilling } from "@/lib/api/respond";
import { testConnection, testStoredConnection } from "@/lib/billing/ose-service";
import { OSE_PROVIDERS } from "@/lib/billing/providers";
import { checkApiKey, checkEndpoint } from "@/lib/billing/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    apiKey: z.string().trim().max(400).optional(),
    apiSecret: z.string().trim().max(400).optional(),
    provider: z.enum(OSE_PROVIDERS).optional(),
    endpoint: z.string().trim().max(300).optional(),
  })
  .strict();

export const POST = withApi(
  async (request, ctx) => {
    // El cuerpo vacío es válido — significa "prueba lo guardado" — así que no
    // se puede usar `readJson`, que exige un objeto.
    const raw = (await request.text()).trim();
    let payload: unknown = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new ApiError("validation_error", "El cuerpo de la petición no es JSON válido.");
      }
    }
    const body = bodySchema.safeParse(payload);
    if (!body.success) {
      throw new ApiError("validation_error", "No pudimos leer los datos de la prueba.");
    }

    const { apiKey, apiSecret, provider, endpoint } = body.data;

    // --- Modo "credencial en mano"
    if (apiKey) {
      if (!provider) {
        throw new ApiError("validation_error", "Indica de qué proveedor OSE es esa credencial.");
      }
      const keyProblem = checkApiKey(apiKey);
      if (keyProblem) throw new ApiError("validation_error", keyProblem);
      if (endpoint) {
        const urlProblem = checkEndpoint(endpoint);
        if (urlProblem) throw new ApiError("validation_error", urlProblem);
      }

      const result = await testConnection(apiKey, provider, {
        endpoint: endpoint ?? null,
        apiSecret: apiSecret ?? null,
      });
      logBilling("info", "billing.test_connection", {
        requestId: ctx.requestId,
        restaurantId: ctx.restaurantId,
        provider,
        passed: result.passed,
        stored: false,
      });
      return { ...result, savedResult: false };
    }

    // --- Modo "lo que ya está guardado"
    const result = await testStoredConnection(ctx.restaurantId);
    logBilling("info", "billing.test_connection", {
      requestId: ctx.requestId,
      restaurantId: ctx.restaurantId,
      passed: result.passed,
      stored: true,
    });
    return { ...result, savedResult: true };
  },
  { ownerOnly: true, feature: "orders", rateLimit: { bucket: "billing-test", max: 20, windowMs: 60 * 60 * 1000 } }
);
