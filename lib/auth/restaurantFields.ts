import type { Prisma } from "@prisma/client";

/**
 * The columns on `Restaurant` that only FoodFlow may set.
 *
 * Every write path in the app today names its columns one by one, so nothing
 * currently spreads a request body into an update and no field can be
 * smuggled in. This module exists so that stays true by construction rather
 * than by luck: the list is written down once, the type below makes an
 * owner-facing update that touches one of these a compile error, and
 * `stripProtectedFields` is here for any future code that really does have to
 * take a loose object.
 *
 * `plan` and `billingStatus` are on the list for the same reason as the
 * category: they are what FoodFlow sold, not a preference the venue sets. A
 * restaurant that could write its own `plan` could grant itself every module.
 * `billingSource` and `accessUntil` are the other half of that decision (see
 * lib/subscriptions/entitlement.ts): only lib/subscriptions and the platform
 * admin's manual grant write them.
 */
export const PROTECTED_RESTAURANT_FIELDS = [
  "categoryId",
  "menuTemplateOverride",
  "plan",
  "billingStatus",
  "billingSource",
  "accessUntil",
  "ownerId",
] as const;

export type ProtectedRestaurantField = (typeof PROTECTED_RESTAURANT_FIELDS)[number];

/**
 * What a tenant-facing update is allowed to hand Prisma.
 *
 * Type it onto the `data` of any restaurant update reachable by an owner and
 * the build fails the moment someone adds a protected column to it — which is
 * the point: the guard should fire while the code is being written, not after
 * it ships.
 */
export type OwnerWritableRestaurantData = Omit<
  Prisma.RestaurantUpdateInput,
  ProtectedRestaurantField | "category" | "owner"
>;

/**
 * Drop every protected field from a loose object.
 *
 * Defence in depth, not the primary defence: the primary defence is that each
 * update names its own columns, and that owner-facing input is parsed by a zod
 * schema which discards unknown keys. Reach for this only where neither of
 * those applies.
 */
export function stripProtectedFields<T extends Record<string, unknown>>(
  input: T
): Omit<T, ProtectedRestaurantField> {
  const clean = { ...input };
  for (const field of PROTECTED_RESTAURANT_FIELDS) {
    delete clean[field];
  }
  return clean as Omit<T, ProtectedRestaurantField>;
}
