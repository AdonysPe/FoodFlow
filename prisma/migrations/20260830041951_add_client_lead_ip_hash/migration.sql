-- AlterTable
ALTER TABLE "ClientLead" ADD COLUMN     "ip_hash" TEXT;

-- CreateIndex
CREATE INDEX "ClientLead_ip_hash_createdAt_idx" ON "ClientLead"("ip_hash", "createdAt");
