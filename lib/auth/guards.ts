import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Canonical authorization surface. Every server action and protected page
 * should reach for one of these instead of re-deriving the check.
 *
 * Vocabulary:
 *   - "user"       any authenticated account (admin | client | mozo)
 *   - "admin"      the FoodFlow platform operator. Owns leads, restaurants,
 *                  audit logs. Never a restaurant tenant.
 *   - "owner"      a restaurant tenant (role "client") + their one restaurant.
 *                  Use `requireClientRestaurant` from ./restaurant.
 *   - "comanda"    owner OR one of their waiters (role "mozo"). Use
 *                  `requireComandaRestaurant` from ./restaurant.
 *
 * The restaurant-scoped guards live in ./restaurant because they also resolve
 * the tenant row; they are re-exported here so `@/lib/auth/guards` is the one
 * import path callers need to know.
 */

export {
  requireClientRestaurant,
  requireComandaRestaurant,
} from "@/lib/auth/restaurant";

/** Any signed-in account, or bounce to the login screen. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The platform operator. Throws (rather than redirecting) so it is safe to call
 * from a server action: the throw aborts the action before any write. Protected
 * *pages* under /dashboard/admin are gated by the admin layout, which redirects.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Not authorized");
  return user;
}
