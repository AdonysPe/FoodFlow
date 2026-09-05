-- El archivo de CDRs: una fila por comprobante enviado al OSE, con el XML y la
-- respuesta de SUNAT. Es un registro tributario (5 años), no un campo del
-- pedido, por eso vive aparte de "Order".

-- CreateEnum
CREATE TYPE "CdrEstado" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "cdrs" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "order_id" TEXT,
    "tipo_documento" VARCHAR(2) NOT NULL,
    "serie" VARCHAR(10) NOT NULL,
    "correlativo" VARCHAR(10) NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "cliente_tipo_documento" VARCHAR(2),
    "cliente_numero_documento" VARCHAR(20),
    "cliente_denominacion" VARCHAR(255),
    "cliente_email" VARCHAR(255),
    "hash" VARCHAR(255),
    "xml_content" TEXT,
    "xml_url" VARCHAR(500),
    "pdf_url" VARCHAR(500),
    "backup_url" VARCHAR(500),
    "estado" "CdrEstado" NOT NULL DEFAULT 'PENDIENTE',
    "mensaje_sunat" TEXT,
    "codigo_sunat" VARCHAR(10),
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "gravada" DECIMAL(10,2),
    "igv" DECIMAL(10,2),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cdrs_pkey" PRIMARY KEY ("id")
);

-- Un correlativo pertenece a un solo documento, para siempre. Es la última
-- defensa contra el único error que SUNAT no perdona: dos comprobantes con el
-- mismo número.
-- CreateIndex
CREATE UNIQUE INDEX "cdrs_restaurant_id_serie_correlativo_key" ON "cdrs"("restaurant_id", "serie", "correlativo");

-- CreateIndex
CREATE INDEX "cdrs_restaurant_id_created_at_idx" ON "cdrs"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "cdrs_restaurant_id_estado_idx" ON "cdrs"("restaurant_id", "estado");

-- CreateIndex
CREATE INDEX "cdrs_order_id_idx" ON "cdrs"("order_id");

-- AddForeignKey
ALTER TABLE "cdrs" ADD CONSTRAINT "cdrs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdrs" ADD CONSTRAINT "cdrs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
