-- Drops the subscription tables and the two new Restaurant columns. The
-- billing_status the backfill set ('active') is left as is: before this
-- migration nothing read it, so it is harmless.
DROP TABLE IF EXISTS "SubscriptionTransition";
DROP TABLE IF EXISTS "SubscriptionWebhookEvent";
DROP TABLE IF EXISTS "SubscriptionCheckout";
DROP TABLE IF EXISTS "Subscription";
ALTER TABLE "Restaurant" DROP COLUMN IF EXISTS "access_until", DROP COLUMN IF EXISTS "billing_source";
DROP TYPE IF EXISTS "WebhookEventStatus";
DROP TYPE IF EXISTS "CheckoutStatus";
DROP TYPE IF EXISTS "SubscriptionProvider";
DROP TYPE IF EXISTS "BillingSource";
