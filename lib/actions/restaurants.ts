"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ActionResult } from "@/lib/actions/auth";

const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid owner email"),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}

export async function createRestaurant(input: {
  name: string;
  ownerEmail: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail } = parsed.data;

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "client" },
  });

  await prisma.restaurant.create({
    data: { name, ownerId: owner.id },
  });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");

  return { ok: true, data: undefined };
}

export async function updateRestaurant(
  id: string,
  input: { name: string; ownerEmail: string }
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail } = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "client" },
  });

  await prisma.restaurant.update({ where: { id }, data: { name, ownerId: owner.id } });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");

  return { ok: true, data: undefined };
}

// Removes the restaurant and everything scoped to it (orders, menu, customers).
// The owner account itself is only deleted if they don't own any other
// restaurant — otherwise it'd still be needed for that other restaurant.
export async function deleteRestaurant(id: string): Promise<ActionResult> {
  await requireAdmin();

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

  await prisma.$transaction([
    prisma.order.deleteMany({ where: { restaurantId: id } }),
    prisma.menuItem.deleteMany({ where: { restaurantId: id } }),
    prisma.customer.deleteMany({ where: { restaurantId: id } }),
    prisma.restaurant.delete({ where: { id } }),
  ]);

  const ownerHasOtherRestaurants = await prisma.restaurant.count({
    where: { ownerId: restaurant.ownerId },
  });
  if (ownerHasOtherRestaurants === 0) {
    await prisma.user.delete({ where: { id: restaurant.ownerId } }).catch(() => {});
  }

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");

  return { ok: true, data: undefined };
}
