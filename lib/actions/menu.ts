"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { logAudit } from "@/lib/audit/log";
import type { ActionResult } from "@/lib/actions/auth";

function revalidateMenuPaths() {
  revalidatePath("/dashboard/app/menu");
  revalidatePath("/dashboard/app/orders");
}

const menuItemSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  price: z.coerce.number().positive("El precio debe ser mayor que 0"),
  categoryId: z.string().trim().optional().or(z.literal("")),
  prepMin: z.coerce.number().int().min(0).max(240).optional(),
  photoUrl: z.string().trim().url("Enlace de foto no válido").max(500).optional().or(z.literal("")),
});

export type MenuItemInput = z.input<typeof menuItemSchema>;

async function requireOwnedMenuItem(id: string, restaurantId: string) {
  return prisma.menuItem.findFirst({ where: { id, restaurantId } });
}

// A categoryId coming from the form is only accepted if it belongs to this
// restaurant; anything else (including "") is stored as null → "Sin categoría".
async function resolveCategoryId(
  restaurantId: string,
  raw: string | undefined
): Promise<string | null> {
  if (!raw) return null;
  const found = await prisma.menuCategory.findFirst({
    where: { id: raw, restaurantId },
    select: { id: true },
  });
  return found?.id ?? null;
}

export async function createMenuItem(input: MenuItemInput): Promise<ActionResult<{ id: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };

  const categoryId = await resolveCategoryId(restaurant.id, parsed.data.categoryId);

  const last = await prisma.menuItem.findFirst({
    where: { restaurantId: restaurant.id, categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      prepMin: parsed.data.prepMin ?? null,
      photoUrl: parsed.data.photoUrl || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidateMenuPaths();
  return { ok: true, data: { id: created.id } };
}

export async function updateMenuItem(id: string, input: MenuItemInput): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };

  const existing = await requireOwnedMenuItem(id, restaurant.id);
  if (!existing) return { ok: false, error: "Plato no encontrado." };

  const categoryId = await resolveCategoryId(restaurant.id, parsed.data.categoryId);

  if (existing.price !== parsed.data.price) {
    await logAudit({
      action: "menu.item.price_change",
      actor: { id: user.id, email: user.email },
      entity: "MenuItem",
      entityId: id,
      restaurantId: restaurant.id,
      before: { name: existing.name, price: existing.price },
      after: { name: parsed.data.name, price: parsed.data.price },
    });
  }

  await prisma.menuItem.update({
    where: { id },
    data: {
      categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      prepMin: parsed.data.prepMin ?? null,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}

// The quick "Disponible / Agotado" switch on each card.
export async function toggleMenuItemAvailable(id: string): Promise<ActionResult<{ available: boolean }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const existing = await requireOwnedMenuItem(id, restaurant.id);
  if (!existing) return { ok: false, error: "Plato no encontrado." };

  const updated = await prisma.menuItem.update({
    where: { id },
    data: { available: !existing.available },
    select: { available: true },
  });

  revalidateMenuPaths();
  return { ok: true, data: { available: updated.available } };
}

export async function duplicateMenuItem(id: string): Promise<ActionResult<{ id: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const original = await requireOwnedMenuItem(id, restaurant.id);
  if (!original) return { ok: false, error: "Plato no encontrado." };

  const last = await prisma.menuItem.findFirst({
    where: { restaurantId: restaurant.id, categoryId: original.categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const copy = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: original.categoryId,
      name: `${original.name} (copia)`,
      description: original.description,
      price: original.price,
      prepMin: original.prepMin,
      photoUrl: original.photoUrl,
      available: original.available,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidateMenuPaths();
  return { ok: true, data: { id: copy.id } };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const existing = await requireOwnedMenuItem(id, restaurant.id);
  if (!existing) return { ok: false, error: "Plato no encontrado." };

  await prisma.menuItem.delete({ where: { id } });

  await logAudit({
    action: "menu.item.delete",
    actor: { id: user.id, email: user.email },
    entity: "MenuItem",
    entityId: id,
    restaurantId: restaurant.id,
    before: { name: existing.name, price: existing.price, categoryId: existing.categoryId },
  });

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}

// Drag-to-reorder within one category. Ids must be exactly that category's
// items so a stale board can't reshuffle a partial list.
export async function reorderMenuItems(
  categoryId: string | null,
  orderedIds: string[]
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = z.array(z.string()).min(1).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Orden no válido." };

  const owned = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id, categoryId: categoryId ?? null },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((i) => i.id));
  if (parsed.data.length !== ownedIds.size || !parsed.data.every((id) => ownedIds.has(id))) {
    return { ok: false, error: "La lista de platos no coincide." };
  }

  await prisma.$transaction(
    parsed.data.map((id, i) => prisma.menuItem.update({ where: { id }, data: { sortOrder: i } }))
  );

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}
