-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "ip_hash" TEXT;

-- CreateIndex
CREATE INDEX "leads_ip_hash_created_at_idx" ON "leads"("ip_hash", "created_at");
