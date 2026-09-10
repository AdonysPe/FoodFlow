CREATE TYPE "BillingStatus" AS ENUM ('pending', 'active', 'cancelled');

ALTER TABLE "Restaurant"
ADD COLUMN "billing_status" "BillingStatus" NOT NULL DEFAULT 'pending';
