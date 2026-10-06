"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { generateTableCode } from "@/lib/tableCode";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { featureRefusal } from "@/lib/auth/plan";
import type { ActionResult } from "@/lib/actions/auth";
import { TABLE_SHAPES, TABLE_ZONES } from "@/lib/tableMeta";

const MESAS_PATH = "/dashboard/app/mesas";

const tableSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  capacity: z.coerce.number().int().min(1, "Mínimo 1 persona").max(40),
  shape: z.enum(TABLE_SHAPES),
  zone: z.enum(TABLE_ZONES),
});

// Positions are percentages of the canvas — clamped so a dragged table can
// never be saved off-plan.
const positionSchema = z.object({
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
});

export type TableInput = z.infer<typeof tableSchema>;

async function requireOwnedTable(id: string, restaurantId: string) {
  return prisma.restaurantTable.findFirst({ where: { id, restaurantId } });
}

export async function createTable(
  input: TableInput & Partial<z.infer<typeof positionSchema>>
): Promise<ActionResult<{ id: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  // When the caller gives no position (the "+ Añadir mesa" form), drop the
  // new table into the next free slot of a loose grid so fresh tables never
  // stack on the same point before they are dragged into place.
  const pos = positionSchema.partial().safeParse(input);
  let x = pos.success && pos.data.x !== undefined ? pos.data.x : null;
  let y = pos.success && pos.data.y !== undefined ? pos.data.y : null;
  if (x === null || y === null) {
    const count = await prisma.restaurantTable.count({ where: { restaurantId: restaurant.id } });
    const col = count % 4;
    const row = Math.floor(count / 4) % 3;
    x = 20 + col * 20;
    y = 22 + row * 26;
  }

  // Every table is born with its QR code, so the print sheet never has to
  // stop and mint one.
  const created = await prisma.restaurantTable.create({
    data: {
      restaurantId: restaurant.id,
      ...parsed.data,
      x,
      y,
      publicCode: generateTableCode(),
    },
  });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: { id: created.id } };
}

export async function updateTable(id: string, input: TableInput): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const existing = await requireOwnedTable(id, restaurant.id);
  if (!existing) return { ok: false, error: "Mesa no encontrada." };

  await prisma.restaurantTable.update({ where: { id }, data: parsed.data });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}

// Called from the plan editor's drag handler — kept separate from updateTable
// so a reposition is one tiny write and never touches the other fields.
export async function updateTablePosition(
  id: string,
  input: { x: number; y: number }
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Posición no válida." };

  const existing = await requireOwnedTable(id, restaurant.id);
  if (!existing) return { ok: false, error: "Mesa no encontrada." };

  await prisma.restaurantTable.update({
    where: { id },
    data: { x: parsed.data.x, y: parsed.data.y },
  });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}

// "Marcar ocupada" / "Marcar libre" from the floor plan. Occupancy is a
// manual marker; a linked active order also reads as occupied downstream.
export async function setTableOccupancy(
  id: string,
  occupied: boolean
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const existing = await requireOwnedTable(id, restaurant.id);
  if (!existing) return { ok: false, error: "Mesa no encontrada." };

  await prisma.restaurantTable.update({
    where: { id },
    data: { occupiedAt: occupied ? new Date() : null },
  });

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };
  const refused = featureRefusal(restaurant, "tables");
  if (refused) return { ok: false, error: refused };

  const existing = await requireOwnedTable(id, restaurant.id);
  if (!existing) return { ok: false, error: "Mesa no encontrada." };

  // Reservations keep their history — they just lose the table link.
  await prisma.$transaction([
    prisma.reservation.updateMany({ where: { tableId: id }, data: { tableId: null } }),
    prisma.restaurantTable.delete({ where: { id } }),
  ]);

  revalidatePath(MESAS_PATH);
  return { ok: true, data: undefined };
}
