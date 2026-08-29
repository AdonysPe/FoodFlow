-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('web_form', 'calculadora', 'whatsapp');

-- CreateEnum
CREATE TYPE "LeadPipelineStatus" AS ENUM ('nuevo', 'contactado', 'cita', 'cliente', 'archivado');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "restaurante" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "source" "LeadSource" NOT NULL,
    "perdida_mensual" INTEGER,
    "perdida_anual" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadPipelineStatus" NOT NULL DEFAULT 'nuevo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");
