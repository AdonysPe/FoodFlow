-- Prospección, second step: rows from the lead-finding agent's Google Sheet
-- (source 'sheet', its notes and drafted messages) and the editable WhatsApp
-- templates. Additive only: a new enum value, four nullable columns and a new
-- table, so every existing row and query keeps working.

-- AlterEnum
ALTER TYPE "ProspectSource" ADD VALUE 'sheet';

-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "custom_follow_up" TEXT,
ADD COLUMN     "custom_message" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "variant" TEXT;

-- CreateTable
CREATE TABLE "prospect_templates" (
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_templates_pkey" PRIMARY KEY ("key")
);

