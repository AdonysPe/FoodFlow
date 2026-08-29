"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { ActionResult } from "@/lib/actions/auth";

const EQUIPO_PATH = "/dashboard/app/equipo";

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
});

export type StaffMemberDTO = {
  membershipId: string;
  userId: string;
  email: string;
  createdAt: string;
  active: boolean; // has ever signed in (the account exists with a session-capable role)
};

// The owner adds a waiter by email. They then sign in with the normal email
// code and land straight on the comanda.
export async function addStaffMember(input: { email: string }): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const { email } = parsed.data;

  if (email === user.email.toLowerCase()) {
    return { ok: false, error: "Ese es tu propio correo." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "mozo") {
    return { ok: false, error: "Ese correo ya tiene una cuenta con otro rol." };
  }

  const staffUser =
    existing ??
    (await prisma.user.create({ data: { email, role: "mozo" } }));

  const already = await prisma.staffMembership.findUnique({
    where: { restaurantId_userId: { restaurantId: restaurant.id, userId: staffUser.id } },
  });
  if (already) return { ok: false, error: "Esa persona ya está en el equipo." };

  await prisma.staffMembership.create({
    data: { restaurantId: restaurant.id, userId: staffUser.id },
  });

  revalidatePath(EQUIPO_PATH);
  return { ok: true, data: undefined };
}

export async function removeStaffMember(membershipId: string): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const membership = await prisma.staffMembership.findFirst({
    where: { id: membershipId, restaurantId: restaurant.id },
  });
  if (!membership) return { ok: false, error: "Esa persona no está en tu equipo." };

  await prisma.staffMembership.delete({ where: { id: membership.id } });

  // If that mozo has no other job and owns nothing, drop the empty account too.
  const [otherMemberships, ownedRestaurants, staffUser] = await Promise.all([
    prisma.staffMembership.count({ where: { userId: membership.userId } }),
    prisma.restaurant.count({ where: { ownerId: membership.userId } }),
    prisma.user.findUnique({ where: { id: membership.userId }, select: { role: true } }),
  ]);
  if (otherMemberships === 0 && ownedRestaurants === 0 && staffUser?.role === "mozo") {
    await prisma.user.delete({ where: { id: membership.userId } }).catch(() => {});
  }

  revalidatePath(EQUIPO_PATH);
  return { ok: true, data: undefined };
}
