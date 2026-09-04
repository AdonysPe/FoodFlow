-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiptNumber" INTEGER,
ADD COLUMN     "receiptSeries" TEXT;

-- CreateTable
CREATE TABLE "ReceiptSettings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "legalName" TEXT,
    "ruc" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "footerNote" TEXT,
    "paperWidth" INTEGER NOT NULL DEFAULT 80,
    "showIgv" BOOLEAN NOT NULL DEFAULT false,
    "igvRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "autoPrint" BOOLEAN NOT NULL DEFAULT true,
    "series" TEXT NOT NULL DEFAULT 'NV01',
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSettings_restaurantId_key" ON "ReceiptSettings"("restaurantId");

-- AddForeignKey
ALTER TABLE "ReceiptSettings" ADD CONSTRAINT "ReceiptSettings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

