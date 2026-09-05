// El sobre de toda respuesta de la API de facturación, y el registro de lo que
// pasó dentro.
//
// UN SOLO FORMATO. `{ ok: true, data }` o `{ ok: false, error: { code, message,
// details? } }`. `message` siempre en español y siempre apto para enseñárselo
// tal cual a quien está en la caja; `code` es lo que lee el cliente para
// decidir. Un error con un código y sin frase obliga al frontend a inventarse
// el texto, y ahí es donde aparecen los "Error 500" en pantalla.
//
// LO QUE NUNCA SALE. Ni un stack, ni un mensaje de Prisma, ni un fragmento de
// token. Lo que el servidor necesita para depurar se registra con el
// `requestId` y se queda en el log; hacia afuera va la frase y ese id.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "billing_not_configured"
  | "rate_limited"
  | "ose_unavailable"
  | "conflict"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 422,
  billing_not_configured: 409,
  rate_limited: 429,
  ose_unavailable: 502,
  conflict: 409,
  internal: 500,
};

export type ApiErrorBody = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Problemas por campo, cuando los hay. */
    details?: unknown;
    requestId: string;
  };
};

export type ApiOkBody<T> = { ok: true; data: T; requestId: string };

export function newRequestId(): string {
  return randomUUID().slice(0, 8);
}

export function ok<T>(data: T, requestId: string, init: ResponseInit = {}) {
  return NextResponse.json<ApiOkBody<T>>(
    { ok: true, data, requestId },
    {
      ...init,
      headers: {
        // Nada de lo que sirve esta API es cacheable: son datos de un solo
        // inquilino y, en la mitad de los casos, dinero.
        "cache-control": "no-store",
        "x-request-id": requestId,
        ...(init.headers ?? {}),
      },
    }
  );
}

export function fail(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  options: { details?: unknown; headers?: Record<string, string> } = {}
) {
  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      error: { code, message, requestId, ...(options.details ? { details: options.details } : {}) },
    },
    {
      status: STATUS[code],
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
        ...(options.headers ?? {}),
      },
    }
  );
}

/**
 * Un error que el handler puede lanzar sabiendo que `withApi` lo convierte en
 * la respuesta correcta. Para todo lo demás — un throw que nadie previó — sale
 * un 500 genérico y el detalle se queda en el log.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type LogFields = Record<string, string | number | boolean | null | undefined>;

/**
 * Registro estructurado, en una línea por evento.
 *
 * Lleva SIEMPRE requestId y restaurantId: sin el segundo, un error de
 * facturación en producción no se puede atribuir a un local, y con un incidente
 * de por medio eso es la diferencia entre una llamada y una tarde entera.
 *
 * Lo que no lleva nunca: credenciales, el certificado, el XML completo ni el
 * documento del cliente. Se registran identificadores, no contenidos.
 */
export function logBilling(
  level: "info" | "warn" | "error",
  event: string,
  fields: LogFields = {}
) {
  const line = { ts: new Date().toISOString(), scope: "billing", event, ...fields };
  const payload = JSON.stringify(line);
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}
