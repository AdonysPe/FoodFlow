import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

// Cached per-request so every page/component in the client dashboard tree
// can call this without re-querying the same restaurant row.
export const requireClientRestaurant = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: user.id } });
  return { user, restaurant };
});

// The comanda screen is shared by the owner (role "client") and their waiters
// (role "mozo"). Resolves the one restaurant either of them belongs to.
// `isOwner` lets the UI hide owner-only affordances from a mozo.
export const requireComandaRestaurant = cache(async () => {
  const user = await getCurrentUser();
  if (!user || (user.role !== "client" && user.role !== "mozo")) redirect("/login");

  const restaurant =
    user.role === "client"
      ? await prisma.restaurant.findFirst({ where: { ownerId: user.id } })
      : await prisma.staffMembership
          .findFirst({ where: { userId: user.id }, include: { restaurant: true } })
          .then((m) => m?.restaurant ?? null);

  return { user, restaurant, isOwner: user.role === "client" };
});
