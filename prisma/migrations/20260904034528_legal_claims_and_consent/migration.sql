-- CreateEnum
CREATE TYPE "ClaimKind" AS ENUM ('reclamo', 'queja');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('recibido', 'en_proceso', 'respondido');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "consent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "kind" "ClaimKind" NOT NULL,
    "detalle" TEXT NOT NULL,
    "pedido" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'recibido',
    "responded_at" TIMESTAMP(3),
    "respuesta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "claims_code_key" ON "claims"("code");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_created_at_idx" ON "claims"("created_at");
