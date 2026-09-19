-- ---------------------------------------------------------------------------
-- Platform admin role + restaurant configuration audit.
--
-- NON-DESTRUCTIVE. No row is deleted and no user loses access: the three
-- existing enum values are RENAMED in place, so every User row keeps the
-- identity it already had and the column default follows the rename
-- automatically (Postgres stores it by OID, not by label).
--
--   admin  -> platform_admin     the FoodFlow operator. Never a tenant.
--   client -> restaurant_owner   the person who signed the restaurant up.
--   mozo   -> restaurant_staff   a waiter, scoped to one venue.
--
-- `restaurant_admin` is added as a fourth value: a manager INSIDE a restaurant.
-- It is deliberately restaurant-scoped and is rejected by every platform-level
-- guard, so it can never inherit operator powers by being "an admin".
--
-- Old session JWTs still carry the pre-rename labels. They are translated on
-- read in lib/auth/session.ts rather than invalidated here, so nobody is
-- logged out by this deploy; the legacy claims age out with the 7-day TTL.
--
-- Rollback: rename the three values back. The new enum value and the audit
-- table can stay — old readers never look at either.
-- ---------------------------------------------------------------------------

ALTER TYPE "UserRole" RENAME VALUE 'admin' TO 'platform_admin';
ALTER TYPE "UserRole" RENAME VALUE 'client' TO 'restaurant_owner';
ALTER TYPE "UserRole" RENAME VALUE 'mozo' TO 'restaurant_staff';

-- Safe inside a transaction on PG 12+ as long as the value is not USED here.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'restaurant_admin';

-- ---------------------------------------------------------------------------
-- Who changed which restaurant's identity, when, and from what to what.
--
-- Separate from the generic AuditLog on purpose. AuditLog is written
-- best-effort and swallows its own failures, which is right for a login trail
-- and wrong here: this row is written INSIDE the same transaction as the
-- update, so a restaurant's category can never move without a record of who
-- moved it. `performedByUserId` is ON DELETE SET NULL so removing an operator
-- account blanks the actor without erasing the fact that the change happened.
-- ---------------------------------------------------------------------------

CREATE TABLE "RestaurantConfigurationAudit" (
    "id"                 TEXT NOT NULL,
    "restaurantId"       TEXT NOT NULL,
    "performedByUserId"  TEXT,
    "performedByEmail"   TEXT,
    "action"             TEXT NOT NULL,
    "previousCategoryId" TEXT,
    "newCategoryId"      TEXT,
    "previousTemplate"   TEXT,
    "newTemplate"        TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestaurantConfigurationAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestaurantConfigurationAudit_restaurantId_createdAt_idx"
  ON "RestaurantConfigurationAudit"("restaurantId", "createdAt");
CREATE INDEX "RestaurantConfigurationAudit_performedByUserId_idx"
  ON "RestaurantConfigurationAudit"("performedByUserId");
CREATE INDEX "RestaurantConfigurationAudit_createdAt_idx"
  ON "RestaurantConfigurationAudit"("createdAt");

ALTER TABLE "RestaurantConfigurationAudit"
  ADD CONSTRAINT "RestaurantConfigurationAudit_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantConfigurationAudit"
  ADD CONSTRAINT "RestaurantConfigurationAudit_performedByUserId_fkey"
  FOREIGN KEY ("performedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
