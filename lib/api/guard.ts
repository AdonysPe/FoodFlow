// El middleware de las rutas de facturación, compuesto en una sola función.
//
// Son cuatro capas y el orden entre ellas no es decorativo:
//
//   authMiddleware        ¿hay sesión válida? → 401
//   multiTenantMiddleware ¿a qué restaurante pertenece? → todo lo de abajo
//                         queda encerrado en ese id
//   rateLimiter           ¿se pasó de la cuota? → 429
//   billingConfigValidator ¿puede emitir siquiera? → 409
//
// El aislamiento va segundo a propósito: el limitador cuenta POR restaurante
// (un local ruidoso no puede consumir la cuota de otro) y el validador de
// configuración lee la de ese mismo local. Ninguna de las dos cosas se puede
// hacer antes de saber de quién es la petición.
//
// LA REGLA DEL INQUILINO. El handler recibe `ctx.restaurantId` y no tiene
// manera de mirar otro: el id sale de la sesión, nunca de la URL ni del cuerpo.
// Cuando la ruta lleva un id en el path (/api/restaurants/:id/...) se compara
// contra el de la sesión y, si no coinciden, la respuesta es 404 — no 403. Un
// 403 confirmaría que ese restaurante existe.
//
// Server only.

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rateLimit";
import { checkEmissionReadiness } from "@/lib/billing/config-service";
import { ApiError, fail, logBilling, newRequestId, ok } from "@/lib/api/respond";

export type ApiActor = {
  userId: string;
  email: string;
  role: "admin" | "client" | "mozo";
};

export type ApiContext = {
  requestId: string;
  actor: ApiActor;
  /** El id del restaurante de la sesión. Es el único que el handler puede usar. */
  restaurantId: string;
  restaurantName: string;
  /** Solo el dueño puede tocar la configuración; un mozo cobra pero no configura. */
  isOwner: boolean;
  /** Parámetros de la ruta, ya resueltos. */
  params: Record<string, string>;
};

export type GuardOptions = {
  /** Cuota por restaurante. Sin esto la ruta no lleva limitador. */
  rateLimit?: { bucket: string; max: number; windowMs: number };
  /** Exige configuración de facturación completa antes de entrar al handler. */
  requireBillingConfig?: boolean;
  /** Exige que sea el dueño, no un mozo. */
  ownerOnly?: boolean;
};

type Handler<T> = (
  request: NextRequest,
  context: ApiContext
) => Promise<Response | T>;

// La forma que Next exige del segundo argumento de un route handler: presente
// y con `params` siempre ahí (en una ruta sin segmento dinámico, resuelto a un
// objeto vacío). Ni el argumento ni la propiedad pueden ser opcionales o el
// chequeo de tipos de Next rechaza el handler.
type RouteArgs = { params: Promise<Record<string, string>> };

/**
 * authMiddleware + multiTenantMiddleware.
 *
 * Verifica la cookie y RELEE el usuario de la base: el JWT lleva el rol, pero
 * un rol revocado hace diez minutos seguiría viajando dentro de un token
 * válido. Lo que decide es siempre la fila, no la afirmación.
 */
async function resolveActor(): Promise<
  | { ok: true; actor: ApiActor; restaurantId: string; restaurantName: string; isOwner: boolean }
  | { ok: false; reason: "no_session" | "no_restaurant" }
> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, reason: "no_session" };

  const payload = await verifySessionToken(token);
  if (!payload) return { ok: false, reason: "no_session" };

  const [user, owned, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.sub } }),
    prisma.restaurant.findMany({
      where: { ownerId: payload.sub },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.staffMembership.findMany({
      where: { userId: payload.sub },
      select: { restaurant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) return { ok: false, reason: "no_session" };

  const actor: ApiActor = { userId: user.id, email: user.email, role: user.role };
  const venues = user.role === "client" ? owned : memberships.map((item) => item.restaurant);
  const venue =
    venues.find((restaurant) => restaurant.id === payload.restaurantId) ?? venues.at(0) ?? null;
  if (!venue) return { ok: false, reason: "no_restaurant" };

  return {
    ok: true,
    actor,
    restaurantId: venue.id,
    restaurantName: venue.name,
    isOwner: user.role === "client",
  };
}

/**
 * Envuelve un handler de ruta con las cuatro capas.
 *
 * Devuelve el `Response` que arme el handler, o serializa lo que devuelva como
 * `{ ok: true, data }`. Un throw inesperado sale como 500 sin filtrar nada.
 */
export function withApi<T>(handler: Handler<T>, options: GuardOptions = {}) {
  return async function handleRoute(request: NextRequest, args: RouteArgs): Promise<Response> {
    const requestId = newRequestId();
    const path = new URL(request.url).pathname;

    // --- authMiddleware + multiTenantMiddleware
    const resolved = await resolveActor();
    if (!resolved.ok) {
      logBilling("warn", "api.denied", { requestId, path, reason: resolved.reason });
      return resolved.reason === "no_session"
        ? fail("unauthorized", "Inicia sesión para continuar.", requestId)
        : fail("forbidden", "Tu cuenta no está vinculada a un restaurante.", requestId);
    }

    const { actor, restaurantId, restaurantName, isOwner } = resolved;

    if (options.ownerOnly && !isOwner) {
      logBilling("warn", "api.denied", {
        requestId,
        path,
        restaurantId,
        reason: "owner_only",
      });
      return fail(
        "forbidden",
        "Solo el dueño de la cuenta puede cambiar la configuración de facturación.",
        requestId
      );
    }

    const params = args?.params ? await args.params : {};

    // El id de la URL nunca elige el inquilino: solo se comprueba que sea el
    // mismo de la sesión. 404 y no 403, para no confirmar que existe.
    if (typeof params.id === "string" && path.includes("/restaurants/") && params.id !== restaurantId) {
      logBilling("warn", "api.tenant_mismatch", {
        requestId,
        path,
        restaurantId,
        requested: params.id,
      });
      return fail("not_found", "No encontramos ese restaurante.", requestId);
    }

    // --- rateLimiter
    if (options.rateLimit) {
      const { bucket, max, windowMs } = options.rateLimit;
      const limit = await rateLimit(bucket, restaurantId, { max, windowMs });
      if (!limit.ok) {
        const seconds = Math.ceil(limit.retryAfterMs / 1000);
        logBilling("warn", "api.rate_limited", { requestId, path, restaurantId, bucket });
        return fail(
          "rate_limited",
          `Demasiadas peticiones. Vuelve a intentarlo en ${Math.max(1, Math.ceil(seconds / 60))} minuto(s).`,
          requestId,
          { headers: { "retry-after": String(seconds) } }
        );
      }
    }

    // --- billingConfigValidator
    if (options.requireBillingConfig) {
      const readiness = await checkEmissionReadiness(restaurantId);
      if (!readiness.ready) {
        logBilling("warn", "api.billing_not_configured", {
          requestId,
          path,
          restaurantId,
          missing: readiness.missing.join(","),
        });
        return fail("billing_not_configured", readiness.message, requestId, {
          details: { missing: readiness.missing },
        });
      }
    }

    const context: ApiContext = {
      requestId,
      actor,
      restaurantId,
      restaurantName,
      isOwner,
      params,
    };

    const startedAt = Date.now();
    try {
      const result = await handler(request, context);
      const response = result instanceof Response ? result : ok(result, requestId);
      logBilling("info", "api.ok", {
        requestId,
        path,
        restaurantId,
        status: response.status,
        ms: Date.now() - startedAt,
      });
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        logBilling("warn", "api.error", {
          requestId,
          path,
          restaurantId,
          code: err.code,
          ms: Date.now() - startedAt,
        });
        return fail(err.code, err.message, requestId, { details: err.details });
      }
      // Lo inesperado: el detalle al log, al cliente una frase y el id.
      logBilling("error", "api.unhandled", {
        requestId,
        path,
        restaurantId,
        ms: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      if (err instanceof Error && err.stack) console.error(err.stack);
      return fail(
        "internal",
        `Algo falló de nuestro lado. Si vuelve a pasar, pásanos este código: ${requestId}`,
        requestId
      );
    }
  };
}

/** Cuerpo JSON del request, o 422 si no lo es. Nunca deja pasar un `any`. */
export async function readJson<T = Record<string, unknown>>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object") {
      throw new ApiError("validation_error", "El cuerpo de la petición debe ser un objeto JSON.");
    }
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("validation_error", "El cuerpo de la petición no es JSON válido.");
  }
}

/** La cuota de emisiones: 100 por hora y por restaurante, como pide el brief. */
export const EMISSION_RATE_LIMIT = {
  bucket: "billing-emit",
  max: 100,
  windowMs: 60 * 60 * 1000,
} as const;
