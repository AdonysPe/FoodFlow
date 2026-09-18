-- Expand only: existing restaurants keep their ids, menu, tables and QR codes.
-- Rollback strategy: deploy the previous app version while retaining these new
-- columns and rows. Old readers ignore them; do not drop customer selections.
CREATE TABLE "RestaurantCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultMenuTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestaurantCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestaurantCategory_slug_key" ON "RestaurantCategory"("slug");

INSERT INTO "RestaurantCategory" ("id", "name", "slug", "description", "defaultMenuTemplate", "isActive", "createdAt", "updatedAt")
VALUES
  ('criolla', 'Restaurante criollo', 'criolla', 'Restaurantes de comida criolla y tradicional peruana', 'criolla', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cevicheria', 'Cevichería', 'cevicheria', 'Cevicherías y restaurantes especializados en comida marina', 'cevicheria', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Restaurant"
  ADD COLUMN "categoryId" TEXT NOT NULL DEFAULT 'criolla',
  ADD COLUMN "menuTemplateOverride" TEXT;

CREATE INDEX "Restaurant_categoryId_idx" ON "Restaurant"("categoryId");
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "RestaurantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
