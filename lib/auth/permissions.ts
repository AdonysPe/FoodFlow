import type { UserRole } from "@prisma/client";

/**
 * What each role is allowed to do, in one table.
 *
 * WHY NOT `roles` / `permissions` / `user_roles` TABLES. FoodFlow gives every
 * account exactly one role (`User.role`), and who may do what is a product
 * decision that ships with the code, not data an operator edits at runtime.
 * Three join tables would add a second source of truth — a row could disagree
 * with the guard that reads it — and a migration for every permission. The map
 * below is the same model with the ambiguity removed: one place to read, one
 * place to change, and the type checker catches a role nobody handled.
 *
 * Swap this for tables the day permissions have to be editable per account
 * without a deploy. `can()` is the seam: nothing outside this module knows how
 * the answer is stored.
 */

export const PERMISSIONS = {
  /**
   * Set a restaurant's category and the carta template it renders with.
   *
   * Platform-only by design: the category decides how a venue is presented
   * across the product, so it is part of FoodFlow's own catalogue rather than
   * a preference the venue sets. An owner who could flip it would also be able
   * to hand themselves a template they were never sold.
   */
  MANAGE_CATEGORY_TEMPLATE: "restaurants.manage_category_template",
  /** List and open any restaurant on the platform, not just one's own. */
  VIEW_ALL_RESTAURANTS: "restaurants.view_all",
  /** Read the platform-wide audit trail. */
  VIEW_AUDIT_LOG: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role → permissions.
 *
 * `Record<UserRole, …>` is load-bearing: adding a value to the enum without
 * deciding what it may do stops the build here instead of silently granting or
 * denying it at runtime. The three restaurant-scoped roles hold no permission
 * from this list on purpose — their access is tenant-scoped and resolved by
 * the restaurant guards, never by a platform permission.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  platform_admin: [
    PERMISSIONS.MANAGE_CATEGORY_TEMPLATE,
    PERMISSIONS.VIEW_ALL_RESTAURANTS,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  restaurant_owner: [],
  restaurant_admin: [],
  restaurant_staff: [],
};

/** Does this role carry this permission? The only way to ask. */
export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Is this the FoodFlow operator? Never true for a restaurant-scoped role. */
export function isPlatformAdmin(role: UserRole): boolean {
  return role === "platform_admin";
}

/**
 * Roles that belong to a venue rather than to FoodFlow.
 *
 * Kept as data so a new tenant role is added in one place, and so the negative
 * check (`!isPlatformAdmin`) is never the thing standing between a tenant and
 * a platform screen.
 */
export const TENANT_ROLES = [
  "restaurant_owner",
  "restaurant_admin",
  "restaurant_staff",
] as const satisfies readonly UserRole[];

/** Roles that open the full venue dashboard (not the waiter-only comanda). */
export const VENUE_MANAGER_ROLES = [
  "restaurant_owner",
  "restaurant_admin",
] as const satisfies readonly UserRole[];

export function isVenueManager(role: UserRole): boolean {
  return (VENUE_MANAGER_ROLES as readonly UserRole[]).includes(role);
}
