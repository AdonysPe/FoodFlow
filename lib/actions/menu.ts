"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { ActionResult } from "@/lib/actions/auth";

const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  price: z.coerce.number().nonnegative("Price must be zero or more"),
  category: z.string().trim().min(1, "Category is required").max(50),
});

function revalidateMenuPaths() {
  revalidatePath("/dashboard/app/menu");
  revalidatePath("/dashboard/app/orders");
}

async function requireOwnedMenuItem(id: string, restaurantId: string) {
  return prisma.menuItem.findFirst({ where: { id, restaurantId } });
}

export async function createMenuItem(input: {
  name: string;
  price: number;
  category: string;
}): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No restaurant is linked to your account." };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.menuItem.create({ data: { restaurantId: restaurant.id, ...parsed.data } });

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}

export async function updateMenuItem(
  id: string,
  input: { name: string; price: number; category: string }
): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No restaurant is linked to your account." };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = await requireOwnedMenuItem(id, restaurant.id);
  if (!existing) return { ok: false, error: "Menu item not found." };

  await prisma.menuItem.update({ where: { id }, data: parsed.data });

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}

export async function toggleMenuItemActive(id: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No restaurant is linked to your account." };

  const existing = await requireOwnedMenuItem(id, restaurant.id);
  if (!existing) return { ok: false, error: "Menu item not found." };

  await prisma.menuItem.update({ where: { id }, data: { isActive: !existing.isActive } });

  revalidateMenuPaths();
  return { ok: true, data: undefined };
}
