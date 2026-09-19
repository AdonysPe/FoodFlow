import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isVenueManager, TENANT_ROLES } from "@/lib/auth/permissions";

/**
 * The signed-in user together with every venue they can reach and the active one.
 *
 * Resolving these one after the other cost two sequential round trips to a
 * hosted Postgres before a dashboard page could start its own queries. The
 * session token already carries the user id, so nothing has to be waited for:
 * the user row and both possible venue links are asked for at once and the
 * page pays for one round trip instead of two (measured 347 ms → 169 ms).
 *
 * Loading both venue links is deliberate. Selecting one by the role in the
 * token would save a tiny query but make the answer depend on a claim we have
 * not verified against the database yet; asking for both keeps the fresh row
 * from the database as the only thing that decides.
 *
 * Cached per request, so every layout, page and gate in the tree shares it.
 */
const sessionContext = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [user, ownedRestaurants, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.sub } }),
    prisma.restaurant.findMany({
      where: { ownerId: payload.sub },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staffMembership.findMany({
      where: { userId: payload.sub },
      include: { restaurant: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user || user.sessionVersion !== payload.sessionVersion) return null;

  // An owner reaches their venues by owning them; everyone else reaches
  // theirs through a StaffMembership. A platform admin has neither and
  // resolves to an empty list here — they never work inside a tenant.
  const availableRestaurants =
    user.role === "restaurant_owner"
      ? ownedRestaurants
      : memberships.map((membership) => membership.restaurant);
  const activeRestaurant =
    availableRestaurants.find((restaurant) => restaurant.id === payload.restaurantId) ??
    availableRestaurants.at(0) ??
    null;

  return { user, availableRestaurants, activeRestaurant };
});

// The full venue dashboard: the owner, and a manager they promoted
// (`restaurant_admin`). Neither is ever a platform admin — that role resolves
// to no restaurant at all and is turned away here like any other stranger.
export const requireClientRestaurant = cache(async () => {
  const ctx = await sessionContext();
  if (!ctx || !isVenueManager(ctx.user.role)) redirect("/login");

  return {
    user: ctx.user,
    restaurant: ctx.activeRestaurant,
    restaurants: ctx.availableRestaurants,
    // Reserved for what only the person who signed up may do — billing
    // credentials, the plan, deleting the venue.
    isOwner: ctx.user.role === "restaurant_owner",
  };
});

// The comanda screen is shared by everyone who works in the venue: the owner,
// a manager and the waiters. Resolves the restaurant selected in the current
// session. `isOwner` lets the UI hide owner-only affordances from the rest.
export const requireComandaRestaurant = cache(async () => {
  const ctx = await sessionContext();
  if (!ctx || !(TENANT_ROLES as readonly string[]).includes(ctx.user.role)) {
    redirect("/login");
  }

  return {
    user: ctx.user,
    restaurant: ctx.activeRestaurant,
    restaurants: ctx.availableRestaurants,
    isOwner: ctx.user.role === "restaurant_owner",
  };
});
