-- ---------------------------------------------------------------------------
-- FoodFlow's own subscriptions: who decided the plan (billing_source), until
-- when it was paid (access_until), and the tables for the card checkout.
-- Contract: docs/SUSCRIPCIONES-CONTRATO.md.
--
-- BACKFILL, AND WHY IT IS HERE. Until now nothing ever wrote billing_status:
-- every venue is 'pending' no matter what it pays, and plans were granted by
-- hand. Access is about to depend on billing state, so every existing venue
-- becomes a manual grant, active, with no end date — exactly what it has
-- today. One SubscriptionTransition row per venue records that the backfill,
-- not a person, did it. New venues default to billing_source 'none'.
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "BillingSource" AS ENUM ('none', 'manual', 'provider');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('culqi');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('created', 'requires_action', 'processing', 'completed', 'failed', 'expired', 'canceled');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processing', 'processed', 'ignored', 'failed');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "access_until" TIMESTAMP(3),
ADD COLUMN     "billing_source" "BillingSource" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "restaurantName" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerCustomerId" TEXT,
    "providerCardId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerPlanId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "netAmountCents" INTEGER NOT NULL,
    "igvAmountCents" INTEGER NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "igvRateBps" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "trialUsedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionCheckout" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'created',
    "plan" "Plan" NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerPlanId" TEXT NOT NULL,
    "withTrial" BOOLEAN NOT NULL,
    "trialDays" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "netAmountCents" INTEGER NOT NULL,
    "igvAmountCents" INTEGER NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "igvRateBps" INTEGER NOT NULL,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "customerFirstName" TEXT NOT NULL,
    "customerLastName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "billingDocType" TEXT NOT NULL,
    "billingRuc" TEXT,
    "billingLegalName" TEXT,
    "returnPath" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "subscriptionId" TEXT,
    "failureCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SubscriptionWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTransition" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "fromStatus" "BillingStatus",
    "toStatus" "BillingStatus" NOT NULL,
    "fromSource" "BillingSource",
    "toSource" "BillingSource" NOT NULL,
    "fromPlan" "Plan",
    "toPlan" "Plan" NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_restaurantId_createdAt_idx" ON "Subscription"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_provider_providerSubscriptionId_key" ON "Subscription"("provider", "providerSubscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionCheckout_restaurantId_status_idx" ON "SubscriptionCheckout"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionCheckout_status_expiresAt_idx" ON "SubscriptionCheckout"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionCheckout_restaurantId_idempotencyKey_key" ON "SubscriptionCheckout"("restaurantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SubscriptionWebhookEvent_status_receivedAt_idx" ON "SubscriptionWebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionWebhookEvent_provider_providerEventId_key" ON "SubscriptionWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "SubscriptionTransition_restaurantId_createdAt_idx" ON "SubscriptionTransition"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionTransition_subscriptionId_idx" ON "SubscriptionTransition"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCheckout" ADD CONSTRAINT "SubscriptionCheckout_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCheckout" ADD CONSTRAINT "SubscriptionCheckout_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill ------------------------------------------------------------------
-- The trail first, so it captures the state before the update.
INSERT INTO "SubscriptionTransition"
  ("id", "restaurantId", "fromStatus", "toStatus", "fromSource", "toSource", "fromPlan", "toPlan", "reason")
SELECT
  'bkf_' || md5(r."id" || ':backfill.manual'),
  r."id",
  r."billing_status",
  'active',
  'none',
  'manual',
  r."plan",
  r."plan",
  'backfill.manual'
FROM "Restaurant" r;

UPDATE "Restaurant"
SET "billing_source" = 'manual',
    "billing_status" = 'active',
    "access_until" = NULL;
