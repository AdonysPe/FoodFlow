"use server";

import { z } from "zod";
import type { BillingSource, BillingStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { TENANT_ROLES } from "@/lib/auth/permissions";
import { seedDefaultCategories } from "@/lib/menu/seedCategories";
import { logAudit } from "@/lib/audit/log";
import { PLANS, type PlanValue } from "@/lib/plans";
import type { ActionResult } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { createSessionToken, readSessionPayload, setSessionCookie } from "@/lib/auth/session";
import { buildWhatsAppUrl } from "@/lib/contact";
import { hasLiveProviderSubscription } from "@/lib/subscriptions/access";

// A plan paid by card belongs to the card subscription. Overwriting it by
// hand would leave the client charged for one plan and using another.
const PAID_PLAN_LOCKED =
  "Este local tiene una suscripción pagada con tarjeta. El plan se cambia desde la suscripción, no a mano.";

const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid owner email"),
  // Which plan the client bought — this decides the modules they can open.
  plan: z.enum(PLANS),
});

export async function selectActiveRestaurant(
  restaurantId: string
): Promise<ActionResult> {
  const parsed = z.string().cuid().safeParse(restaurantId);
  if (!parsed.success) return { ok: false, error: "Restaurante no válido." };

  const user = await getCurrentUser();
  if (!user || !(TENANT_ROLES as readonly string[]).includes(user.role)) {
    return { ok: false, error: "Sesión no válida." };
  }

  const allowed =
    user.role === "restaurant_owner"
      ? await prisma.restaurant.findFirst({
          where: { id: parsed.data, ownerId: user.id },
          select: { id: true },
        })
      : await prisma.staffMembership.findFirst({
          where: { restaurantId: parsed.data, userId: user.id },
          select: { restaurantId: true },
        });

  if (!allowed) return { ok: false, error: "No tienes acceso a ese restaurante." };

  // Switching venue re-signs the token; it must keep the length of the session
  // the person chose at login, not quietly turn it into a different one.
  const remember = (await readSessionPayload())?.remember === true;
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    restaurantId: parsed.data,
    remember,
  });
  await setSessionCookie(token, remember);
  revalidatePath("/dashboard", "layout");

  return { ok: true, data: undefined };
}

export async function getPlanManagementLinks(): Promise<
  ActionResult<{ changeByPlan: Record<PlanValue, string>; cancel: string }>
> {
  const { user, restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "No hay un restaurante vinculado." };

  const identity = `${restaurant.name} (${user.email})`;
  const changeByPlan = Object.fromEntries(
    PLANS.map((targetPlan) => [
      targetPlan,
      buildWhatsAppUrl(
        `Hola, quiero cambiar el plan de ${identity}. Plan actual: ${restaurant.plan}. Plan solicitado: ${targetPlan}.`
      ),
    ])
  ) as Record<PlanValue, string | null>;
  const cancel = buildWhatsAppUrl(
    `Hola, quiero cancelar el plan de ${identity}. Plan actual: ${restaurant.plan}.`
  );

  if (!cancel || PLANS.some((plan) => !changeByPlan[plan])) {
    return { ok: false, error: "El WhatsApp de administración no está configurado." };
  }

  return {
    ok: true,
    data: {
      changeByPlan: changeByPlan as Record<PlanValue, string>,
      cancel,
    },
  };
}

export async function createRestaurant(input: {
  name: string;
  ownerEmail: string;
  plan: PlanValue;
}): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail, plan } = parsed.data;

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "restaurant_owner", requiresPasswordSetup: true },
  });

  const restaurant = await prisma.$transaction(async (tx) => {
    // An admin creating a venue is granting its plan by hand: manual, active,
    // no end date — the same state every pre-gateway venue was backfilled to.
    const created = await tx.restaurant.create({
      data: { name, ownerId: owner.id, plan, billingSource: "manual", billingStatus: "active" },
    });
    await tx.subscriptionTransition.create({
      data: {
        restaurantId: created.id,
        toStatus: "active",
        toSource: "manual",
        toPlan: plan,
        reason: "admin.create",
        actorUserId: admin.id,
        actorEmail: admin.email,
      },
    });
    return created;
  });
  await seedDefaultCategories(prisma, restaurant.id);

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");

  return { ok: true, data: undefined };
}

export async function updateRestaurant(
  id: string,
  input: { name: string; ownerEmail: string; plan: PlanValue }
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail, plan } = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  if (plan !== restaurant.plan && hasLiveProviderSubscription(restaurant)) {
    return { ok: false, error: PAID_PLAN_LOCKED };
  }

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "restaurant_owner", requiresPasswordSetup: true },
  });

  await prisma.$transaction(async (tx) => {
    if (plan === restaurant.plan) {
      await tx.restaurant.update({ where: { id }, data: { name, ownerId: owner.id } });
      return;
    }
    await grantManualPlan(tx, restaurant, plan, admin, "admin.update");
    await tx.restaurant.update({ where: { id }, data: { name, ownerId: owner.id } });
  });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");
  // The owner's own dashboard changes shape with the plan, so drop its cache.
  revalidatePath("/dashboard/app", "layout");

  return { ok: true, data: undefined };
}

// Downgrading below "staff" would leave waiters signed in with no comanda, so
// changing only the plan runs through the same path and the admin sees the
// staff count on the row.
export async function updateRestaurantPlan(
  id: string,
  plan: PlanValue
): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const parsed = z.enum(PLANS).safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Invalid plan." };

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  if (hasLiveProviderSubscription(restaurant)) return { ok: false, error: PAID_PLAN_LOCKED };

  await prisma.$transaction((tx) => grantManualPlan(tx, restaurant, parsed.data, admin, "admin.plan"));

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");
  revalidatePath("/dashboard/app", "layout");

  return { ok: true, data: undefined };
}

type GrantActor = { id: string; email: string };

/**
 * An admin setting the plan by hand. The venue becomes (or stays) a manual
 * grant, active, with no end date, and the change is recorded in the same
 * transaction — access cannot move without a row saying who moved it.
 * Callers check `hasLiveProviderSubscription` first.
 */
async function grantManualPlan(
  tx: Prisma.TransactionClient,
  restaurant: { id: string; plan: PlanValue; billingStatus: BillingStatus; billingSource: BillingSource },
  plan: PlanValue,
  admin: GrantActor,
  reason: string
) {
  await tx.restaurant.update({
    where: { id: restaurant.id },
    data: { plan, billingSource: "manual", billingStatus: "active", accessUntil: null },
  });
  await tx.subscriptionTransition.create({
    data: {
      restaurantId: restaurant.id,
      fromStatus: restaurant.billingStatus,
      toStatus: "active",
      fromSource: restaurant.billingSource,
      toSource: "manual",
      fromPlan: restaurant.plan,
      toPlan: plan,
      reason,
      actorUserId: admin.id,
      actorEmail: admin.email,
    },
  });
}

// Removes the restaurant and everything scoped to it (orders, menu, customers).
// The owner account itself is only deleted if they don't own any other
// restaurant — otherwise it'd still be needed for that other restaurant.
export async function deleteRestaurant(id: string): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };
  // Deleting the venue would leave Culqi charging a card for nothing. The
  // subscription has to be cancelled first; its rows survive the delete
  // (SetNull) because they are the record of what was charged.
  if (hasLiveProviderSubscription(restaurant)) {
    return {
      ok: false,
      error: "Este local tiene una suscripción pagada activa. Cancélala antes de eliminarlo.",
    };
  }

  const staff = await prisma.staffMembership.findMany({
    where: { restaurantId: id },
    select: { userId: true },
  });

  await prisma.$transaction([
    prisma.reservation.deleteMany({ where: { restaurantId: id } }),
    prisma.order.deleteMany({ where: { restaurantId: id } }),
    prisma.menuItem.deleteMany({ where: { restaurantId: id } }),
    prisma.menuCategory.deleteMany({ where: { restaurantId: id } }),
    prisma.restaurantTable.deleteMany({ where: { restaurantId: id } }),
    prisma.staffMembership.deleteMany({ where: { restaurantId: id } }),
    prisma.customer.deleteMany({ where: { restaurantId: id } }),
    prisma.restaurant.delete({ where: { id } }),
  ]);

  // Drop mozo accounts that were only tied to this restaurant.
  for (const { userId } of staff) {
    const stillUsed = await prisma.staffMembership.count({ where: { userId } });
    if (stillUsed === 0) {
      await prisma.user
        .deleteMany({ where: { id: userId, role: "restaurant_staff", restaurants: { none: {} } } })
        .catch(() => {});
    }
  }

  const ownerHasOtherRestaurants = await prisma.restaurant.count({
    where: { ownerId: restaurant.ownerId },
  });
  if (ownerHasOtherRestaurants === 0) {
    await prisma.user.delete({ where: { id: restaurant.ownerId } }).catch(() => {});
  }

  await logAudit({
    action: "restaurant.delete",
    actor: { id: admin.id, email: admin.email },
    entity: "Restaurant",
    entityId: id,
    before: { name: restaurant.name, ownerId: restaurant.ownerId },
  });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");

  return { ok: true, data: undefined };
}
