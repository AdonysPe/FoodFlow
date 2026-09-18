"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { ActionResult } from "@/lib/actions/auth";

const inputSchema = z.object({ categoryId: z.string().min(1).max(80) });

/** The current owner may change only their active restaurant's identity. */
export async function saveRestaurantCategory(input: { categoryId: string }): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Categoría no válida." };

  const category = await prisma.restaurantCategory.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true, isActive: true },
  });
  if (!category?.isActive) return { ok: false, error: "Esta categoría ya no está disponible." };

  const result = await prisma.restaurant.updateMany({
    where: { id: restaurant.id, ownerId: user.id },
    data: { categoryId: category.id, cartaVersion: { increment: 1 } },
  });
  if (result.count !== 1) return { ok: false, error: "No tienes acceso a este restaurante." };

  revalidatePath("/dashboard/app/configuracion");
  revalidatePath("/m/[code]", "page");
  if (restaurant.slug) revalidatePath(`/carta/${restaurant.slug}`);
  return { ok: true, data: undefined };
}
