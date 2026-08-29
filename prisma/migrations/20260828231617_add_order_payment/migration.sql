-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('efectivo', 'tarjeta', 'yape');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amountReceived" DOUBLE PRECISION,
ADD COLUMN     "changeGiven" DOUBLE PRECISION,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "voidedAt" TIMESTAMP(3);
