-- ---------------------------------------------------------------------------
-- New billing states for the card subscription (docs/SUSCRIPCIONES-CONTRATO.md).
--
-- On its own migration on purpose: a value added with ALTER TYPE cannot be
-- used in the same transaction that adds it, and the next migration writes
-- billing states. Nothing here changes a row.
-- ---------------------------------------------------------------------------

ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'trialing';
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'suspended';
