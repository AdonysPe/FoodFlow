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
import { restaurantEntitlement } from "@/lib/subscriptions/access";

// The plan whose seat cap applies right now. A downgrade that is only
// scheduled already lowers the ceiling: otherwise the owner could fill the
// higher plan's seats while waiting for the date, and nothing would trim them
// when it lands.
async function seatCapPlan(restaurantId: string, current: PlanValue): Promise<PlanValue> {
  const pending = await prisma.subscription.findFirst({
    where: {
      restaurantId,
      endedAt: null,
      status: { not: "cancelled" },
      pendingPlan: { not: null },
    },
    select: { pendingPlan: true },
  });
  const next = pending?.pendingPlan as PlanValue | null | undefined;
  return next && PLAN_MAX_USERS[next] < PLAN_MAX_USERS[current] ? next : current;
}

function seatLimitMessage(cap: PlanValue, current: PlanValue): string {
  return cap === current
    ? `Tu plan ${PLAN_LABELS[current]} llega hasta ${PLAN_MAX_USERS[current]} usuarios (dueño incluido). Quita a alguien o sube de plan.`
    : `Tienes un cambio al plan ${PLAN_LABELS[cap]} programado y llega hasta ${PLAN_MAX_USERS[cap]} usuarios (dueño incluido). Quita a alguien o cancela el cambio.`;
}

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

// The owner adds a waiter by email. Their first login starts password setup.
export async function addStaffMember(input: { email: string }): Promise<ActionResult> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado a tu cuenta." };

  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const { email } = parsed.data;

  if (email === user.email.toLowerCase()) {
    return { ok: false, error: "Ese es tu propio correo." };
  }

  // The plan caps how many people can use the dashboard, owner included —
  // the plan that is paid for right now, not merely the one on the row.
  const entitlement = restaurantEntitlement(restaurant);
  if (entitlement.effectivePlan == null) {
    return {
      ok: false,
      error: "Tu suscripción no está activa. Revisa tu plan en Configuración para agregar mozos.",
    };
  }
  const plan: PlanValue = entitlement.effectivePlan;
  if (!planAllows(plan, "staff")) {
    return {
      ok: false,
      error: `El plan ${PLAN_LABELS[plan]} es de un solo usuario. Sube a ${PLAN_LABELS[firstPlanWith("staff")]} para agregar mozos.`,
    };
  }
  const capPlan = await seatCapPlan(restaurant.id, plan);
  const currentStaff = await prisma.staffMembership.count({
    where: { restaurantId: restaurant.id },
  });
  if (staffSeatsLeft(capPlan, currentStaff) <= 0) {
    return { ok: false, error: seatLimitMessage(capPlan, plan) };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "restaurant_staff") {
    return { ok: false, error: "Ese correo ya tiene una cuenta con otro rol." };
  }

  const staffUser =
    existing ??
    (await prisma.user.create({
      data: { email, role: "restaurant_staff", requiresPasswordSetup: true },
    }));

  // The check above only spares the common case. Two invites sent together
  // would both read the same count, so the authoritative one runs under a lock
  // on the venue: every invite for it waits its turn and counts again.
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Restaurant" WHERE "id" = ${restaurant.id} FOR UPDATE`;
    const seated = await tx.staffMembership.count({ where: { restaurantId: restaurant.id } });
    if (staffSeatsLeft(capPlan, seated) <= 0) return "full" as const;
    const already = await tx.staffMembership.findUnique({
      where: { restaurantId_userId: { restaurantId: restaurant.id, userId: staffUser.id } },
    });
    if (already) return "already" as const;
    await tx.staffMembership.create({
      data: { restaurantId: restaurant.id, userId: staffUser.id },
    });
    return "added" as const;
  });
  if (outcome !== "added") {
    // An account created a moment ago for this invite must not outlive it.
    if (!existing) await prisma.user.delete({ where: { id: staffUser.id } }).catch(() => {});
    return outcome === "already"
      ? { ok: false, error: "Esa persona ya está en el equipo." }
      : { ok: false, error: seatLimitMessage(capPlan, plan) };
  }

  await logAudit({
    action: "staff.add",
    actor: { id: user.id, email: user.email },
    entity: "StaffMembership",
    entityId: staffUser.id,
    restaurantId: restaurant.id,
    after: { email, role: "restaurant_staff" },
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
    before: { email: membership.user.email, role: "restaurant_staff" },
  });

  // If that mozo has no other job and owns nothing, drop the empty account too.
  const [otherMemberships, ownedRestaurants, staffUser] = await Promise.all([
    prisma.staffMembership.count({ where: { userId: membership.userId } }),
    prisma.restaurant.count({ where: { ownerId: membership.userId } }),
    prisma.user.findUnique({ where: { id: membership.userId }, select: { role: true } }),
  ]);
  if (otherMemberships === 0 && ownedRestaurants === 0 && staffUser?.role === "restaurant_staff") {
    await prisma.user.delete({ where: { id: membership.userId } }).catch(() => {});
  }

  revalidatePath(EQUIPO_PATH);
  return { ok: true, data: undefined };
}
