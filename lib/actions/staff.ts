"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { logAudit } from "@/lib/audit/log";
import {
  PLAN_LABELS,
  PLAN_MAX_USERS,
  firstPlanWith,
  planAllows,
  staffSeatsLeft,
  type PlanValue,
} from "@/lib/plans";
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

  // The plan caps how many people can use the dashboard, owner included.
  const plan = restaurant.plan as PlanValue;
  if (!planAllows(plan, "staff")) {
    return {
      ok: false,
      error: `El plan ${PLAN_LABELS[plan]} es de un solo usuario. Sube a ${PLAN_LABELS[firstPlanWith("staff")]} para agregar mozos.`,
    };
  }
  const currentStaff = await prisma.staffMembership.count({
    where: { restaurantId: restaurant.id },
  });
  if (staffSeatsLeft(plan, currentStaff) <= 0) {
    return {
      ok: false,
      error: `Tu plan ${PLAN_LABELS[plan]} llega hasta ${PLAN_MAX_USERS[plan]} usuarios (dueño incluido). Quita a alguien o sube de plan.`,
    };
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

  await logAudit({
    action: "staff.add",
    actor: { id: user.id, email: user.email },
    entity: "StaffMembership",
    entityId: staffUser.id,
    restaurantId: restaurant.id,
    after: { email, role: "mozo" },
  });

  revalidatePath(EQUIPO_PATH);
  return { ok: true, data: undefined };
}

export async function removeStaffMember(membershipId: string): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const membership = await prisma.staffMembership.findFirst({
    where: { id: membershipId, restaurantId: restaurant.id },
    include: { user: { select: { email: true } } },
  });
  if (!membership) return { ok: false, error: "Esa persona no está en tu equipo." };

  await prisma.staffMembership.delete({ where: { id: membership.id } });

  await logAudit({
    action: "staff.remove",
    actor: { id: user.id, email: user.email },
    entity: "StaffMembership",
    entityId: membership.userId,
    restaurantId: restaurant.id,
    before: { email: membership.user.email, role: "mozo" },
  });

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
