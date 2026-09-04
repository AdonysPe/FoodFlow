-- Facturación electrónica: each restaurant configures and pays for its own
-- OSE/PSE. FoodFlow stores the configuration, never the money.

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('nota_venta', 'boleta', 'factura');

-- AlterEnum
-- Postgres allows ADD VALUE inside a transaction as long as the value is not
-- used in the same one; nothing below writes these, so this is safe.
ALTER TYPE "PaymentMethod" ADD VALUE 'tarjeta_credito';
ALTER TYPE "PaymentMethod" ADD VALUE 'tarjeta_debito';
ALTER TYPE "PaymentMethod" ADD VALUE 'transferencia';
ALTER TYPE "PaymentMethod" ADD VALUE 'mixto';

-- AlterTable
ALTER TABLE "ReceiptSettings"
  ADD COLUMN "tradeName"       TEXT,
  ADD COLUMN "sunatEmail"      TEXT,
  ADD COLUMN "boletaSeries"    TEXT    NOT NULL DEFAULT 'B001',
  ADD COLUMN "boletaCounter"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "facturaSeries"   TEXT    NOT NULL DEFAULT 'F001',
  ADD COLUMN "facturaCounter"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creditSeries"    TEXT    NOT NULL DEFAULT 'FC01',
  ADD COLUMN "creditCounter"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "oseProvider"     TEXT,
  ADD COLUMN "oseEndpoint"     TEXT,
  ADD COLUMN "logoDataUrl"     TEXT,
  ADD COLUMN "showQr"          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCustomerRuc" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order"
  ADD COLUMN "documentType"   "DocumentType",
  ADD COLUMN "docSeries"      TEXT,
  ADD COLUMN "docNumber"      INTEGER,
  ADD COLUMN "billingDocType" TEXT,
  ADD COLUMN "billingDocId"   TEXT,
  ADD COLUMN "billingName"    TEXT,
  ADD COLUMN "billingAddress" TEXT,
  ADD COLUMN "billingEmail"   TEXT,
  ADD COLUMN "sunatStatus"    TEXT,
  ADD COLUMN "sunatHash"      TEXT,
  ADD COLUMN "sunatMessage"   TEXT,
  ADD COLUMN "sunatLink"      TEXT;

-- CreateTable
CREATE TABLE "BillingCredentials" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "oseApiKeyEnc" TEXT,
    "oseApiSecretEnc" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "certFileName" TEXT,
    "certDataEnc" TEXT,
    "certPasswordEnc" TEXT,
    "certSubject" TEXT,
    "certExpiresAt" TIMESTAMP(3),
    "certUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingCredentials_restaurantId_key" ON "BillingCredentials"("restaurantId");

-- AddForeignKey
ALTER TABLE "BillingCredentials" ADD CONSTRAINT "BillingCredentials_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
