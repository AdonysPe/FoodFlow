-- Prospección por redes: the social-media agent adds venues it found on
-- Instagram or Facebook, and enriches the ones OpenStreetMap already had.
-- Additive only: a new enum value and six nullable columns. Code that predates
-- it never reads the columns, but would fail on a row with source 'redes', so
-- the agent writes its first rows only after this code is deployed.
-- Rollback: drop the six columns (the enum value can stay unused).

-- AlterEnum
ALTER TYPE "ProspectSource" ADD VALUE 'redes';

-- AlterTable
ALTER TABLE "prospects"
    ADD COLUMN "instagram" TEXT,
    ADD COLUMN "facebook" TEXT,
    ADD COLUMN "tiktok" TEXT,
    ADD COLUMN "followers" INTEGER,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "opener" TEXT;
