"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import type { OwnerWritableRestaurantData } from "@/lib/auth/restaurantFields";
import { logAudit } from "@/lib/audit/log";
import { rateLimit } from "@/lib/security/rateLimit";
import { restaurantNameSchema } from "@/lib/restaurantName";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Lets the owner change the name their restaurant is shown under.
 *
 * Only the name moves. The public address (`slug`) is deliberately left alone:
 * it is printed on QR codes and linked from the ordering website, and a rename
 * must never break a code that is already on a table. Everything else that
 * shows the name (the carta, the order pages, receipts, the dashboard) reads it
 * from this one column on each request, so there is nothing to keep in sync
 * except the carta's live-update counter, which is bumped in the same write.
 *
 * Owner only: a manager the owner promoted can run the venue day to day but
 * the venue's identity is the owner's call.
 */
export async function renameRestaurant(input: {
  name: string;
}): Promise<ActionResult<{ name: string }>> {
  const { user, restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  if (!isOwner) return { ok: false, error: "Solo el dueño puede cambiar el nombre del restaurante." };

  const parsed = restaurantNameSchema.safeParse(input?.name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nombre no válido." };
  }
  const name = parsed.data;
  if (name === restaurant.name) {
    return { ok: false, error: "Ese ya es el nombre de tu restaurante." };
  }

  // A rename is rare. A loop of them is somebody probing, or a stuck client.
  const limit = await rateLimit("restaurant-rename", restaurant.id, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return { ok: false, error: "Cambiaste el nombre varias veces seguidas. Inténtalo de nuevo más tarde." };
  }

  // Typed as owner-writable so this update stops compiling the day it touches a
  // column that belongs to FoodFlow (plan, billing, owner…).
  const data: OwnerWritableRestaurantData = {
    name,
    // The carta shows the name; this makes open cartas refresh on their own.
    cartaVersion: { increment: 1 },
  };

  // `ownerId` in the filter: the id comes from the session, but the write still
  // refuses to land on a venue this user does not own.
  try {
    await prisma.restaurant.update({ where: { id: restaurant.id, ownerId: user.id }, data });
  } catch (err) {
    if (typeof err === "object" && err && (err as { code?: string }).code === "P2025") {
      return { ok: false, error: "No se pudo cambiar el nombre. Inténtalo de nuevo." };
    }
    throw err;
  }

  await logAudit({
    action: "restaurant.rename",
    actor: { id: user.id, email: user.email },
    entity: "Restaurant",
    entityId: restaurant.id,
    restaurantId: restaurant.id,
    before: { name: restaurant.name },
    after: { name },
  });

  revalidatePath("/dashboard", "layout");
  if (restaurant.slug) revalidatePath(`/carta/${restaurant.slug}`);

  return { ok: true, data: { name } };
}
