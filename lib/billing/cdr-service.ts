// El archivo de comprobantes: crear, listar y cerrar filas de `cdrs`.
//
// TODA consulta de aquí lleva `restaurantId` en el WHERE, sin excepción. No es
// una convención de estilo: un CDR es un documento tributario ajeno, y una
// consulta que se olvide del filtro le enseña a un local las ventas de otro.
// Por eso las funciones reciben el id del restaurante como PRIMER parámetro y
// ninguna acepta un `where` libre desde fuera.
//
// Server only.

import { Prisma, type Cdr, type CdrEstado } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { round2 } from "@/lib/billing/igv";

export type CdrDTO = {
  id: string;
  orderId: string | null;
  tipoDocumento: string;
  serie: string;
  correlativo: string;
  numeroDocumento: string;
  cliente: {
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    denominacion: string | null;
    email: string | null;
  };
  estado: CdrEstado;
  mensajeSunat: string | null;
  codigoSunat: string | null;
  hash: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  /** Si hay XML guardado. El XML entero NO viaja en los listados. */
  hasXml: boolean;
  fechaEmision: string;
  total: number;
  gravada: number | null;
  igv: number | null;
  attempts: number;
  emailedAt: string | null;
  createdAt: string;
};

export function toDTO(row: Cdr): CdrDTO {
  return {
    id: row.id,
    orderId: row.orderId,
    tipoDocumento: row.tipoDocumento,
    serie: row.serie,
    correlativo: row.correlativo,
    numeroDocumento: row.numeroDocumento,
    cliente: {
      tipoDocumento: row.clienteTipoDocumento,
      numeroDocumento: row.clienteNumeroDocumento,
      denominacion: row.clienteDenominacion,
      email: row.clienteEmail,
    },
    estado: row.estado,
    mensajeSunat: row.mensajeSunat,
    codigoSunat: row.codigoSunat,
    hash: row.hash,
    pdfUrl: row.pdfUrl,
    xmlUrl: row.xmlUrl,
    hasXml: row.xmlContent != null && row.xmlContent.length > 0,
    fechaEmision: row.fechaEmision.toISOString(),
    total: Number(row.total),
    gravada: row.gravada == null ? null : Number(row.gravada),
    igv: row.igv == null ? null : Number(row.igv),
    attempts: row.attempts,
    emailedAt: row.emailedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function decimal(value: number | null | undefined): Prisma.Decimal | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Prisma.Decimal(round2(value).toFixed(2));
}

export type OpenCdrInput = {
  orderId: string | null;
  tipoDocumento: string;
  serie: string;
  correlativo: string;
  numeroDocumento: string;
  cliente: {
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    denominacion: string | null;
    email: string | null;
  };
  fechaEmision: Date;
  total: number;
  gravada: number | null;
  igv: number | null;
};

/**
 * Abre la fila en PENDIENTE, en el mismo momento en que se saca el correlativo
 * y antes de hablar con el OSE.
 *
 * Es lo que impide que un número quede gastado sin rastro: si el proceso muere
 * a medio envío, mañana hay una fila que dice qué se hizo con B001-00000124.
 *
 * Idempotente sobre (restaurante, serie, correlativo): un reintento reusa su
 * propia fila en vez de crear una segunda con el mismo número.
 */
export async function openCdr(restaurantId: string, input: OpenCdrInput): Promise<Cdr> {
  const data = {
    restaurantId,
    orderId: input.orderId,
    tipoDocumento: input.tipoDocumento,
    serie: input.serie.toUpperCase(),
    correlativo: input.correlativo,
    numeroDocumento: input.numeroDocumento.toUpperCase(),
    clienteTipoDocumento: input.cliente.tipoDocumento,
    clienteNumeroDocumento: input.cliente.numeroDocumento,
    clienteDenominacion: input.cliente.denominacion,
    clienteEmail: input.cliente.email,
    fechaEmision: input.fechaEmision,
    total: decimal(input.total) ?? new Prisma.Decimal("0.00"),
    gravada: decimal(input.gravada),
    igv: decimal(input.igv),
  };

  return prisma.cdr.upsert({
    where: {
      restaurantId_serie_correlativo: {
        restaurantId,
        serie: data.serie,
        correlativo: data.correlativo,
      },
    },
    create: data,
    // Un reintento puede traer datos del cliente corregidos; el número y el
    // estado nunca se tocan aquí.
    update: {
      orderId: data.orderId,
      clienteTipoDocumento: data.clienteTipoDocumento,
      clienteNumeroDocumento: data.clienteNumeroDocumento,
      clienteDenominacion: data.clienteDenominacion,
      clienteEmail: data.clienteEmail,
      total: data.total,
      gravada: data.gravada,
      igv: data.igv,
    },
  });
}

export type SettleCdrInput = {
  estado: CdrEstado;
  mensajeSunat: string;
  codigoSunat?: string | null;
  hash?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  xmlContent?: string | null;
};

/**
 * Escribe la respuesta del OSE.
 *
 * ACEPTADO y RECHAZADO son terminales: una fila que ya llegó a uno de los dos
 * no se vuelve a mover, porque eso reescribiría un hecho tributario. Solo
 * PENDIENTE admite otra pasada, que es lo que hace el job de reintentos.
 */
export async function settleCdr(
  restaurantId: string,
  cdrId: string,
  input: SettleCdrInput
): Promise<void> {
  await prisma.cdr.updateMany({
    where: { id: cdrId, restaurantId, estado: "PENDIENTE" },
    data: {
      estado: input.estado,
      mensajeSunat: input.mensajeSunat.slice(0, 2000),
      codigoSunat: input.codigoSunat?.slice(0, 10) ?? null,
      hash: input.hash ?? null,
      pdfUrl: input.pdfUrl ?? null,
      xmlUrl: input.xmlUrl ?? null,
      xmlContent: input.xmlContent ?? null,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
}

/** Un intento fallido que SÍ se reintenta: sigue PENDIENTE, sube el contador. */
export async function recordAttempt(
  restaurantId: string,
  cdrId: string,
  message: string
): Promise<void> {
  await prisma.cdr.updateMany({
    where: { id: cdrId, restaurantId, estado: "PENDIENTE" },
    data: {
      mensajeSunat: message.slice(0, 2000),
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
}

export type CdrListQuery = {
  page?: number;
  pageSize?: number;
  estado?: CdrEstado | null;
  tipoDocumento?: string | null;
  /** Busca por número de documento o por documento/nombre del cliente. */
  search?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export type CdrListResult = {
  items: CdrDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const MAX_PAGE_SIZE = 100;

export async function listCdrs(
  restaurantId: string,
  query: CdrListQuery = {}
): Promise<CdrListResult> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(query.pageSize ?? 25)));

  const search = query.search?.trim();
  const where: Prisma.CdrWhereInput = {
    // El filtro del inquilino va primero y no es opcional.
    restaurantId,
    ...(query.estado ? { estado: query.estado } : {}),
    ...(query.tipoDocumento ? { tipoDocumento: query.tipoDocumento } : {}),
    ...(query.from || query.to
      ? {
          fechaEmision: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { numeroDocumento: { contains: search, mode: "insensitive" } },
            { clienteNumeroDocumento: { contains: search } },
            { clienteDenominacion: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.cdr.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      // El XML se excluye del listado a propósito: son cientos de KB por fila
      // y nadie los lee en una tabla. `getCdr` sí los trae.
      omit: { xmlContent: true },
    }),
    prisma.cdr.count({ where }),
  ]);

  return {
    items: rows.map((row) => toDTO({ ...row, xmlContent: null } as Cdr)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Un CDR, siempre dentro del restaurante que lo pide. */
export async function getCdr(restaurantId: string, cdrId: string): Promise<Cdr | null> {
  return prisma.cdr.findFirst({ where: { id: cdrId, restaurantId } });
}

/** Resumen para la cabecera del listado. Una sola consulta agrupada. */
export async function cdrSummary(restaurantId: string, since?: Date) {
  const grouped = await prisma.cdr.groupBy({
    by: ["estado"],
    where: { restaurantId, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
    _sum: { total: true },
  });

  const base = { ACEPTADO: 0, RECHAZADO: 0, PENDIENTE: 0 } as Record<CdrEstado, number>;
  let importe = 0;
  for (const g of grouped) {
    base[g.estado] = g._count._all;
    if (g.estado === "ACEPTADO") importe += Number(g._sum.total ?? 0);
  }
  return { counts: base, aceptadoTotal: round2(importe) };
}
