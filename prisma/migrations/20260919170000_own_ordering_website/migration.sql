ALTER TABLE "CartaSettings" ADD COLUMN "ordering" JSONB;
ALTER TABLE "Order"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "publicToken" TEXT,
  ADD COLUMN "checkoutKey" TEXT,
  ADD COLUMN "checkoutHash" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "fulfillmentAddress" TEXT,
  ADD COLUMN "deliveryZone" TEXT,
  ADD COLUMN "deliveryReference" TEXT,
  ADD COLUMN "customerNotes" TEXT,
  ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "estimatedMinutes" INTEGER;
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
