-- ---------------------------------------------------------------------------
-- Subscription lifecycle (Fase 3): payments, activation, provider-side
-- cancellation, scheduled downgrades and the review flag. Additive only: no
-- existing row changes meaning. Contract: docs/SUSCRIPCIONES-CONTRATO.md.
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "CheckoutPurpose" AS ENUM ('new', 'upgrade', 'downgrade');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('succeeded', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingPlan" "Plan",
ADD COLUMN     "pendingPlanEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "providerCanceledAt" TIMESTAMP(3),
ADD COLUMN     "replacesSubscriptionId" TEXT,
ADD COLUMN     "reviewReason" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionCheckout" ADD COLUMN     "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN     "purpose" "CheckoutPurpose" NOT NULL DEFAULT 'new';

-- AlterTable
ALTER TABLE "SubscriptionWebhookEvent" ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "restaurantId" TEXT,
    "provider" "SubscriptionProvider" NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "failureCode" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_occurredAt_idx" ON "SubscriptionPayment"("subscriptionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_provider_providerPaymentId_key" ON "SubscriptionPayment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "Subscription_providerCardId_idx" ON "Subscription"("providerCardId");

-- CreateIndex
CREATE INDEX "Subscription_pendingPlanEffectiveAt_idx" ON "Subscription"("pendingPlanEffectiveAt");

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

