-- Prospección: restaurants found on Google Maps or OpenStreetMap that FoodFlow
-- may write to. A new table and three new enums; nothing existing is touched,
-- so it applies and rolls back (DROP TABLE "prospects"; DROP TYPE ...) on its own.

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('nuevo', 'contactado', 'respondio', 'cliente', 'descartado');

-- CreateEnum
CREATE TYPE "ProspectSource" AS ENUM ('google', 'osm');

-- CreateEnum
CREATE TYPE "ProspectSegment" AS ENUM ('mesas', 'cafe', 'delivery', 'menu');

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "source" "ProspectSource" NOT NULL DEFAULT 'google',
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "maps_url" TEXT,
    "category" TEXT,
    "segment" "ProspectSegment" NOT NULL,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "delivery" BOOLEAN,
    "dine_in" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,
    "suggested_plan" "Plan" NOT NULL,
    "is_chain" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProspectStatus" NOT NULL DEFAULT 'nuevo',
    "touches" INTEGER NOT NULL DEFAULT 0,
    "last_touch_at" TIMESTAMP(3),
    "found_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospects_place_id_key" ON "prospects"("place_id");

-- CreateIndex
CREATE INDEX "prospects_status_score_idx" ON "prospects"("status", "score");

-- CreateIndex
CREATE INDEX "prospects_district_idx" ON "prospects"("district");

