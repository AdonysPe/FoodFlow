// GET /api/billing/cdrs
//
// El listado de comprobantes del restaurante de la sesión. Paginado, filtrable
// y sin XML: un XML son cientos de KB y en una tabla no lo lee nadie. Para el
// XML está GET /api/billing/cdrs/:id.
//
// Query params:
//   page, pageSize (máx. 100)
//   estado         ACEPTADO | RECHAZADO | PENDIENTE
//   tipo           01 factura | 03 boleta | 07 nota de crédito
//   q              busca por número de documento, RUC/DNI o nombre del cliente
//   desde, hasta   ISO date, sobre la fecha de emisión

import { z } from "zod";
import { withApi } from "@/lib/api/guard";
import { ApiError } from "@/lib/api/respond";
import { cdrSummary, listCdrs } from "@/lib/billing/cdr-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  estado: z.enum(["ACEPTADO", "RECHAZADO", "PENDIENTE"]).optional(),
  tipo: z.enum(["01", "03", "07"]).optional(),
  q: z.string().trim().max(120).optional(),
  desde: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  hasta: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  /** Añade el conteo por estado del mes en curso, para la cabecera. */
  resumen: z.enum(["1", "0"]).optional(),
});

export const GET = withApi(async (request, ctx) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw new ApiError(
      "validation_error",
      "Los filtros de la búsqueda no son válidos.",
      parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }
  const q = parsed.data;

  const result = await listCdrs(ctx.restaurantId, {
    page: q.page,
    pageSize: q.pageSize,
    estado: q.estado ?? null,
    tipoDocumento: q.tipo ?? null,
    search: q.q ?? null,
    from: q.desde ? new Date(q.desde) : null,
    // Una fecha suelta ("2026-03-31") significa el día entero, no su medianoche.
    to: q.hasta ? endOfDay(new Date(q.hasta), q.hasta) : null,
  });

  if (q.resumen === "1") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return { ...result, resumen: await cdrSummary(ctx.restaurantId, monthStart) };
  }

  return result;
});

function endOfDay(date: Date, raw: string): Date {
  if (raw.length > 10) return date;
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
