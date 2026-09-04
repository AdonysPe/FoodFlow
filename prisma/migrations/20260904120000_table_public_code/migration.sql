-- AlterTable
ALTER TABLE "RestaurantTable" ADD COLUMN     "publicCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_publicCode_key" ON "RestaurantTable"("publicCode");
