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
