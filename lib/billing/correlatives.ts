// Los correlativos de los comprobantes electrónicos.
//
// SUNAT numera cada serie por su cuenta y no perdona dos cosas: un número
// repetido (el segundo documento se rechaza y el primero queda en disputa) y un
// hueco sin explicación. Todo lo que sigue existe para eso.
//
// LA REGLA. Un correlativo se saca UNA vez, con el increment del propio
// Postgres, y a partir de ahí pertenece a ese documento aunque el envío falle.
// Un reintento reusa el número que ya sacó; nunca toma uno nuevo. Por eso hay
// dos funciones distintas y no una: `peekCorrelative` es para pintar en
// pantalla "el próximo será B001-00000124", `drawCorrelative` es la única que
// mueve el contador y la única que puede llamar el emisor.
//
// Server only: toca la base.

import { prisma } from "@/lib/db/prisma";
import { formatElectronicNo } from "@/lib/billing/validation";

/** Los tres talonarios que lleva un local. */
export type SeriesKind = "boleta" | "factura" | "credit";

export type Correlative = {
  series: string;
  number: number;
  /** "B001-00000124", como se imprime y como se busca. */
  formatted: string;
  /** "00000124": el correlativo solo, que es como lo guarda la tabla cdrs. */
  padded: string;
};

const FIELDS = {
  boleta: { series: "boletaSeries", counter: "boletaCounter", fallback: "B001" },
  factura: { series: "facturaSeries", counter: "facturaCounter", fallback: "F001" },
  credit: { series: "creditSeries", counter: "creditCounter", fallback: "FC01" },
} as const;

function shape(series: string, number: number): Correlative {
  return {
    series,
    number,
    formatted: formatElectronicNo(series, number),
    padded: String(Math.max(1, Math.trunc(number))).padStart(8, "0"),
  };
}

/**
 * Qué número tocaría, sin tocarlo.
 *
 * Para pantallas y previews. NO sirve para emitir: entre esta lectura y la
 * escritura cabe otra caja cobrando, y las dos se llevarían el mismo número.
 */
export async function peekCorrelative(
  restaurantId: string,
  kind: SeriesKind
): Promise<Correlative> {
  const f = FIELDS[kind];
  const row = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: { [f.series]: true, [f.counter]: true },
  });
  const data = (row ?? {}) as Record<string, string | number | undefined>;
  return shape(String(data[f.series] ?? f.fallback), Number(data[f.counter] ?? 0) + 1);
}

/** Alias del contrato pedido en el brief. Es la lectura, no la reserva. */
export const getNextCorrelative = peekCorrelative;

/**
 * Saca el siguiente correlativo y lo reserva, en una sola sentencia.
 *
 * El `increment` lo resuelve Postgres, así que dos cajas cobrando en el mismo
 * segundo se llevan números distintos sin que aquí haya transacción alguna que
 * mantener abierta (lo que en serverless sería caro y frágil).
 *
 * Se llama ANTES de hablar con el OSE, a propósito: si el envío falla, prefiero
 * un número gastado y trazable (queda la fila en `cdrs` en PENDIENTE) que un
 * pedido cobrado sin documento que entregar.
 */
export async function drawCorrelative(
  restaurantId: string,
  kind: SeriesKind
): Promise<Correlative> {
  const f = FIELDS[kind];
  const bumped = await prisma.receiptSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, [f.counter]: 1 },
    update: { [f.counter]: { increment: 1 } },
    select: { [f.series]: true, [f.counter]: true },
  });
  const data = bumped as unknown as Record<string, string | number>;
  return shape(String(data[f.series] ?? f.fallback), Number(data[f.counter]));
}

/** Alias del contrato pedido en el brief. */
export const incrementCorrelative = drawCorrelative;

/**
 * Sube el contador hasta `number` sin bajarlo nunca.
 *
 * Lo usa la migración de un local que ya venía emitiendo con otro sistema y
 * entra a FoodFlow por el comprobante 4 312. Monótono a propósito: bajar un
 * contador es fabricar un número repetido.
 */
export async function raiseCorrelativeTo(
  restaurantId: string,
  kind: SeriesKind,
  number: number
): Promise<Correlative> {
  const f = FIELDS[kind];
  const target = Math.max(0, Math.trunc(number));
  const current = await prisma.receiptSettings.findUnique({
    where: { restaurantId },
    select: { [f.counter]: true },
  });
  const now = Number((current as Record<string, number> | null)?.[f.counter] ?? 0);
  if (target <= now) return peekCorrelative(restaurantId, kind);

  const saved = await prisma.receiptSettings.upsert({
    where: { restaurantId },
    create: { restaurantId, [f.counter]: target },
    update: { [f.counter]: target },
    select: { [f.series]: true, [f.counter]: true },
  });
  const data = saved as unknown as Record<string, string | number>;
  return shape(String(data[f.series] ?? f.fallback), Number(data[f.counter]) + 1);
}

/** Catálogo 01 de SUNAT, que es como se guarda el tipo en `cdrs`. */
export const SUNAT_DOC_CODE: Record<"boleta" | "factura" | "credit", string> = {
  factura: "01",
  boleta: "03",
  credit: "07",
};
