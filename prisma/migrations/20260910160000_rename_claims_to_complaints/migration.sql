ALTER TABLE "claims" RENAME TO "complaints";

ALTER TABLE "complaints"
RENAME CONSTRAINT "claims_pkey" TO "complaints_pkey";

ALTER INDEX "claims_code_key" RENAME TO "complaints_code_key";
ALTER INDEX "claims_status_idx" RENAME TO "complaints_status_idx";
ALTER INDEX "claims_created_at_idx" RENAME TO "complaints_created_at_idx";
