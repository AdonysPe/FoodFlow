-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'mozo';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "serverName" TEXT;

-- CreateTable
CREATE TABLE "StaffMembership" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffMembership_userId_idx" ON "StaffMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMembership_restaurantId_userId_key" ON "StaffMembership"("restaurantId", "userId");

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembership" ADD CONSTRAINT "StaffMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
