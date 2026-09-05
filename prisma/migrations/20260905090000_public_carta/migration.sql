-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "cartaVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "CartaSettings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "tagline" TEXT,
    "address" TEXT,
    "mapsUrl" TEXT,
    "whatsapp" TEXT,
    "hours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartaSettings_restaurantId_key" ON "CartaSettings"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- AddForeignKey
ALTER TABLE "CartaSettings" ADD CONSTRAINT "CartaSettings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

