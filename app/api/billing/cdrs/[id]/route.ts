// GET /api/billing/cdrs/:id
//
// Un comprobante, con todo lo que se guardó de él. A diferencia del listado,
// aquí sí viaja el XML — pero solo si se pide con `?incluirXml=1`, porque el
// caso normal (abrir la ficha) no lo necesita y son cientos de KB.
//
// `getCdr` filtra por restaurante en el mismo WHERE: el id de un comprobante de
// otro local devuelve 404, igual que uno inventado. No hay forma de distinguir
// los dos casos desde fuera, que es justamente la intención.

import { withApi } from "@/lib/api/guard";
import { ApiError } from "@/lib/api/respond";
import { getCdr, toDTO } from "@/lib/billing/cdr-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw new ApiError("validation_error", "Falta el identificador del comprobante.");

  const cdr = await getCdr(ctx.restaurantId, id);
  if (!cdr) throw new ApiError("not_found", "No encontramos ese comprobante.");

  const includeXml = new URL(request.url).searchParams.get("incluirXml") === "1";

  return {
    ...toDTO(cdr),
    ...(includeXml ? { xmlContent: cdr.xmlContent } : {}),
  };
});
