"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { featureRefusal } from "@/lib/auth/plan";
import type { ActionResult } from "@/lib/actions/auth";
import {
  RESERVATION_STATUSES,
  BLOCKING_RESERVATION_STATUSES,
  MIN_RESERVATION_BLOCK_MIN,
  intervalsOverlap,
  timeToMinutes,
} from "@/lib/tableMeta";

const MESAS_PATH = "/dashboard/app/mesas";

// A bare yyyy-mm-dd. Stored at UTC midnight so it round-trips as a pure
// calendar day regardless of server timezone.
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

const timeSchema = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, "Hora no válida")
  .refine((v) => !Number.isNaN(timeToMinutes(v)), "Hora no válida");

const baseReservationSchema = z.object({
  customerName: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  date: dateSchema,
  startTime: timeSchema,
  durationMin: z.coerce.number().int().min(15, "Mínimo 15 minutos").max(600),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 persona").max(60),
  tableId: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(RESERVATION_STATUSES).optional(),
});

export type ReservationInput = z.infer<typeof baseReservationSchema>;

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const blockWindow = (startMin: number, durationMin: number): [number, number] => [
  startMin,
  startMin + Math.max(durationMin, MIN_RESERVATION_BLOCK_MIN),
];

// Rejects a table assignment that would overlap an already-blocking (confirmed
// or seated) reservation on the same table and day. Every reservation is
// treated as holding its table for at least 3 hours, so bookings can't be
// stacked closer than that even if their stated durations are short.
async function findConflict(params: {
  restaurantId: string;
  tableId: string;
  date: Date;
  startMin: number;
  durationMin: number;
  excludeId?: string;
}) {
  const { restaurantId, tableId, date, startMin, durationMin, excludeId } = params;
  const [aStart, aEnd] = blockWindow(startMin, durationMin);

  const sameDay = await prisma.reservation.findMany({
    where: {
      restaurantId,
      tableId,
      date,
      status: { in: BLOCKING_RESERVATION_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, startTime: true, durationMin: true, customerName: true },
  });

  return sameDay.find((r) => {
    const s = timeToMinutes(r.startTime);
    const [bStart, bEnd] = blockWindow(s, r.durationMin);
    return intervalsOverlap(aStart, aEnd, bStart, bEnd);
  });
}

async function requireOwnedReservation(id: string, restaurantId: string) {
  return prisma.reservation.findFirst({ where: { id, restaurantId } });
}

async function assertTableOwned(tableId: string, restaurantId: string) {
  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, restaurantId },
  });
  return Boolean(table);
}

export async function createReservation(
  input: ReservationInput & { source?: "manual" | "web" }
): Promise<ActionResult<{ id: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const parsed = baseReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const data = parsed.data;
  const source = input.source === "web" ? "web" : "manual";
  // Web requests always land as "pendiente" for the admin to confirm; a manual
  // entry defaults to "confirmada" but respects an explicit choice.
  const status = source === "web" ? "pendiente" : data.status ?? "confirmada";

  const tableId = data.tableId ? data.tableId : null;
  if (tableId && !(await assertTableOwned(tableId, restaurant.id))) {
    return { ok: false, error: "Mesa no encontrada." };
  }

  const date = parseDate(data.date);
  const startMin = timeToMinutes(data.startTime);

  // Only a reservation that will actually hold the table needs the slot free.
  if (tableId && BLOCKING_RESERVATION_STATUSES.includes(status)) {
    const conflict = await findConflict({
      restaurantId: restaurant.id,
      tableId,
      date,
      startMin,
      durationMin: data.durationMin,
    });
    if (conflict) {
      return {
        ok: false,
        error: `Esa mesa ya está ocupada cerca de esa hora (${conflict.customerName}, ${conflict.startTime}). Cada reserva bloquea la mesa 3 h.`,
      };
    }
  }

  const created = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      tableId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      date,
      startTime: data.startTime,
      durationMin: data.durationMin,
      partySize: data.partySize,
      status,
      source,
      notes: data.notes || null,
    },
  });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: { id: created.id } };
}

export async function updateReservation(
  id: string,
  input: ReservationInput
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const existing = await requireOwnedReservation(id, restaurant.id);
  if (!existing) return { ok: false, error: "Reserva no encontrada." };

  const parsed = baseReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const data = parsed.data;
  const status = data.status ?? existing.status;

  const tableId = data.tableId ? data.tableId : null;
  if (tableId && !(await assertTableOwned(tableId, restaurant.id))) {
    return { ok: false, error: "Mesa no encontrada." };
  }

  const date = parseDate(data.date);
  const startMin = timeToMinutes(data.startTime);

  if (tableId && BLOCKING_RESERVATION_STATUSES.includes(status)) {
    const conflict = await findConflict({
      restaurantId: restaurant.id,
      tableId,
      date,
      startMin,
      durationMin: data.durationMin,
      excludeId: id,
    });
    if (conflict) {
      return {
        ok: false,
        error: `Esa mesa ya está ocupada cerca de esa hora (${conflict.customerName}, ${conflict.startTime}). Cada reserva bloquea la mesa 3 h.`,
      };
    }
  }

  await prisma.reservation.update({
    where: { id },
    data: {
      tableId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      date,
      startTime: data.startTime,
      durationMin: data.durationMin,
      partySize: data.partySize,
      status,
      notes: data.notes || null,
    },
  });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}

export async function updateReservationStatus(
  id: string,
  rawStatus: string
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const parsed = z.enum(RESERVATION_STATUSES).safeParse(rawStatus);
  if (!parsed.success) return { ok: false, error: "Estado no válido." };

  const existing = await requireOwnedReservation(id, restaurant.id);
  if (!existing) return { ok: false, error: "Reserva no encontrada." };

  // Confirming (or seating) a reservation that owns a table must not collide
  // with another booking already holding that slot.
  if (
    existing.tableId &&
    BLOCKING_RESERVATION_STATUSES.includes(parsed.data) &&
    !BLOCKING_RESERVATION_STATUSES.includes(existing.status)
  ) {
    const conflict = await findConflict({
      restaurantId: restaurant.id,
      tableId: existing.tableId,
      date: existing.date,
      startMin: timeToMinutes(existing.startTime),
      durationMin: existing.durationMin,
      excludeId: id,
    });
    if (conflict) {
      return {
        ok: false,
        error: `No se puede confirmar: la mesa ya está ocupada cerca de esa hora (${conflict.customerName}, ${conflict.startTime}).`,
      };
    }
  }

  await prisma.reservation.update({ where: { id }, data: { status: parsed.data } });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}

export async function deleteReservation(id: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const existing = await requireOwnedReservation(id, restaurant.id);
  if (!existing) return { ok: false, error: "Reserva no encontrada." };

  await prisma.reservation.delete({ where: { id } });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}
