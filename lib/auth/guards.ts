import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can, isPlatformAdmin, type Permission } from "@/lib/auth/permissions";

/**
 * Canonical authorization surface. Every server action and protected page
 * should reach for one of these instead of re-deriving the check.
 *
 * Vocabulary:
 *   - "user"            any authenticated account
 *   - "platform admin"  FoodFlow itself (role `platform_admin`). Owns leads,
 *                       restaurants, categories, templates and the audit
 *                       trail. Never a tenant of any restaurant.
 *   - "owner"           a restaurant tenant (`restaurant_owner`) + their one
 *                       restaurant. Use `requireClientRestaurant` from
 *                       ./restaurant.
 *   - "comanda"         owner OR one of their waiters (`restaurant_staff`).
 *                       Use `requireComandaRestaurant` from ./restaurant.
 *
 * THE ROLE COMES FROM THE DATABASE, NEVER FROM THE REQUEST. `getCurrentUser()`
 * verifies the session cookie and then re-reads the `User` row, so a role
 * revoked a minute ago cannot keep working inside a still-valid token — and a
 * role asserted in a body, a header, a query string or local storage is not
 * read at all.
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
 * The platform operator. Throws (rather than redirecting) so it is safe to
 * call from a server action: the throw aborts the action before any write.
 * Protected *pages* under /dashboard/admin are gated by the admin layout,
 * which redirects.
 *
 * A restaurant's own manager (`restaurant_admin`) is rejected here like any
 * other tenant — the name says "admin", the permissions do not.
 */
export async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user.role)) throw new Error("Not authorized");
  return user;
}

/**
 * The same check, expressed as the capability being exercised rather than the
 * role that happens to carry it. Prefer this at the call site: it states what
 * the action needs, and it keeps working when a permission moves between
 * roles.
 */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) throw new Error("Not authorized");
  return user;
}
