DROP TABLE IF EXISTS "SubscriptionPayment";
DROP INDEX IF EXISTS "Subscription_providerCardId_idx";
DROP INDEX IF EXISTS "Subscription_pendingPlanEffectiveAt_idx";
ALTER TABLE "Subscription"
  DROP COLUMN IF EXISTS "activatedAt", DROP COLUMN IF EXISTS "lastPaymentAt",
  DROP COLUMN IF EXISTS "needsReview", DROP COLUMN IF EXISTS "pendingPlan",
  DROP COLUMN IF EXISTS "pendingPlanEffectiveAt", DROP COLUMN IF EXISTS "providerCanceledAt",
  DROP COLUMN IF EXISTS "replacesSubscriptionId", DROP COLUMN IF EXISTS "reviewReason";
ALTER TABLE "SubscriptionCheckout" DROP COLUMN IF EXISTS "lastReconciledAt", DROP COLUMN IF EXISTS "purpose";
ALTER TABLE "SubscriptionWebhookEvent" DROP COLUMN IF EXISTS "lockedUntil", DROP COLUMN IF EXISTS "subscriptionId";
DROP TYPE IF EXISTS "SubscriptionPaymentStatus";
DROP TYPE IF EXISTS "CheckoutPurpose";
