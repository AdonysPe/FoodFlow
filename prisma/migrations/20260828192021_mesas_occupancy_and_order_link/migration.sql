-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tableId" TEXT;

-- AlterTable
ALTER TABLE "RestaurantTable" ADD COLUMN     "occupiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
