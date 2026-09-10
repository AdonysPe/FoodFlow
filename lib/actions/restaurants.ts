"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { seedDefaultCategories } from "@/lib/menu/seedCategories";
import { logAudit } from "@/lib/audit/log";
import { PLANS, type PlanValue } from "@/lib/plans";
import type { ActionResult } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { buildWhatsAppUrl } from "@/lib/contact";

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
  if (!user || (user.role !== "client" && user.role !== "mozo")) {
    return { ok: false, error: "Sesión no válida." };
  }

  const allowed =
    user.role === "client"
      ? await prisma.restaurant.findFirst({
          where: { id: parsed.data, ownerId: user.id },
          select: { id: true },
        })
      : await prisma.staffMembership.findFirst({
          where: { restaurantId: parsed.data, userId: user.id },
          select: { restaurantId: true },
        });

  if (!allowed) return { ok: false, error: "No tienes acceso a ese restaurante." };

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    restaurantId: parsed.data,
  });
  await setSessionCookie(token);
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
  await requireAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail, plan } = parsed.data;

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "client" },
  });

  const restaurant = await prisma.restaurant.create({
    data: { name, ownerId: owner.id, plan },
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
  await requireAdmin();

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, ownerEmail, plan } = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { email: ownerEmail, role: "client" },
  });

  await prisma.restaurant.update({
    where: { id },
    data: { name, ownerId: owner.id, plan },
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
  await requireAdmin();

  const parsed = z.enum(PLANS).safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Invalid plan." };

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

  await prisma.restaurant.update({ where: { id }, data: { plan: parsed.data } });

  revalidatePath("/dashboard/admin/overview");
  revalidatePath("/dashboard/admin/restaurants");
  revalidatePath("/dashboard/app", "layout");

  return { ok: true, data: undefined };
}

// Removes the restaurant and everything scoped to it (orders, menu, customers).
// The owner account itself is only deleted if they don't own any other
// restaurant — otherwise it'd still be needed for that other restaurant.
export async function deleteRestaurant(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) return { ok: false, error: "Restaurant not found." };

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
        .deleteMany({ where: { id: userId, role: "mozo", restaurants: { none: {} } } })
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
