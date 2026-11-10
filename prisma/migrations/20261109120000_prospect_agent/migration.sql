-- The social-media agent's settings: paused or not, and the districts it
-- searches. One row, created here with the zone it has used so far. A new
-- table only; rollback is DROP TABLE "prospect_agent".

-- CreateTable
CREATE TABLE "prospect_agent" (
    "id" TEXT NOT NULL DEFAULT 'redes',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "districts" TEXT[] DEFAULT ARRAY['San Juan de Lurigancho']::TEXT[],
    "last_run_at" TIMESTAMP(3),
    "last_run_created" INTEGER,
    "last_run_updated" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_agent_pkey" PRIMARY KEY ("id")
);

INSERT INTO "prospect_agent" ("id", "paused", "districts", "last_run_at", "last_run_created", "last_run_updated", "updated_at")
VALUES ('redes', false, ARRAY['San Juan de Lurigancho']::TEXT[], '2026-11-10 00:20:00', 6, 2, CURRENT_TIMESTAMP);
