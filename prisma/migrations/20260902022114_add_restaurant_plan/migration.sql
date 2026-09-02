-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('carta', 'servicio', 'negocio');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'carta';
