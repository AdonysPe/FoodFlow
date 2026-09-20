-- Where the diner dropped the pin on the map, plus the Google Places id when
-- one was resolved. All three are nullable and have no default: every order
-- placed before this migration (QR rounds, pickup, delivery typed by hand)
-- keeps working untouched, and so does an order placed while Maps is down.
ALTER TABLE "Order"
  ADD COLUMN "deliveryLatitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryLongitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryPlaceId" TEXT;
