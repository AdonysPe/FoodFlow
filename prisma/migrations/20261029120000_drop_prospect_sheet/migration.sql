-- Undoes 20261028120000_prospect_sheet_templates: the agent's sheet import
-- was dropped (Adonis works the leads from the sheet itself). Checked before
-- writing this: no row used source 'sheet', the four columns were all null and
-- prospect_templates was empty, so nothing is lost. The prospects table and
-- its OpenStreetMap rows stay.

-- AlterEnum
BEGIN;
CREATE TYPE "ProspectSource_new" AS ENUM ('google', 'osm');
ALTER TABLE "prospects" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "prospects" ALTER COLUMN "source" TYPE "ProspectSource_new" USING ("source"::text::"ProspectSource_new");
ALTER TYPE "ProspectSource" RENAME TO "ProspectSource_old";
ALTER TYPE "ProspectSource_new" RENAME TO "ProspectSource";
DROP TYPE "ProspectSource_old";
ALTER TABLE "prospects" ALTER COLUMN "source" SET DEFAULT 'google';
COMMIT;

-- AlterTable
ALTER TABLE "prospects" DROP COLUMN "custom_follow_up",
DROP COLUMN "custom_message",
DROP COLUMN "notes",
DROP COLUMN "variant";

-- DropTable
DROP TABLE "prospect_templates";

