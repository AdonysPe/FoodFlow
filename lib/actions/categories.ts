"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { bumpCarta } from "@/lib/db/carta";
import type { ActionResult } from "@/lib/actions/auth";

const MENU_PATH = "/dashboard/app/menu";

// Same choke point as lib/actions/menu.ts — hiding a category changes what a
// diner sees just as much as changing a price does.
async function revalidateMenuPaths(restaurantId: string) {
  revalidatePath(MENU_PATH);
  revalidatePath("/dashboard/app/orders");
  await bumpCarta(restaurantId);
}

const nameSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
});

async function requireOwnedCategory(id: string, restaurantId: string) {
  return prisma.menuCategory.findFirst({ where: { id, restaurantId } });
}

export async function createCategory(input: { name: string }): Promise<ActionResult<{ id: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };

  const last = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: parsed.data.name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  await revalidateMenuPaths(restaurant.id);
  return { ok: true, data: { id: created.id } };
}

export async function updateCategory(id: string, input: { name: string }): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };

  const existing = await requireOwnedCategory(id, restaurant.id);
  if (!existing) return { ok: false, error: "Categoría no encontrada." };

  await prisma.menuCategory.update({ where: { id }, data: { name: parsed.data.name } });

  await revalidateMenuPaths(restaurant.id);
  return { ok: true, data: undefined };
}

export async function toggleCategoryActive(id: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const existing = await requireOwnedCategory(id, restaurant.id);
  if (!existing) return { ok: false, error: "Categoría no encontrada." };

  await prisma.menuCategory.update({ where: { id }, data: { active: !existing.active } });

  await revalidateMenuPaths(restaurant.id);
  return { ok: true, data: undefined };
}

// Persists a full new order. `orderedIds` must be exactly the restaurant's
// categories — anything missing or foreign is rejected so a stale client can't
// silently drop a category to the bottom.
export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = z.array(z.string()).min(1).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Orden no válido." };

  const owned = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((c) => c.id));
  if (
    parsed.data.length !== ownedIds.size ||
    !parsed.data.every((id) => ownedIds.has(id))
  ) {
    return { ok: false, error: "La lista de categorías no coincide." };
  }

  await prisma.$transaction(
    parsed.data.map((id, i) =>
      prisma.menuCategory.update({ where: { id }, data: { sortOrder: i } })
    )
  );

  await revalidateMenuPaths(restaurant.id);
  return { ok: true, data: undefined };
}

// Deleting a category never deletes its dishes — they fall back to
// "Sin categoría" (categoryId becomes null via the FK's ON DELETE SET NULL)
// so the admin can re-file them.
export async function deleteCategory(id: string): Promise<ActionResult<{ orphaned: number }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const existing = await requireOwnedCategory(id, restaurant.id);
  if (!existing) return { ok: false, error: "Categoría no encontrada." };

  const orphaned = await prisma.menuItem.count({ where: { categoryId: id } });
  await prisma.menuCategory.delete({ where: { id } });

  await revalidateMenuPaths(restaurant.id);
  return { ok: true, data: { orphaned } };
}
