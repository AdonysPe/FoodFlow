ALTER TABLE "User"
ADD COLUMN "password_hash" TEXT,
ADD COLUMN "verification_code" TEXT,
ADD COLUMN "verification_code_expires_at" TIMESTAMP(3),
ADD COLUMN "password_reset_at" TIMESTAMP(3),
ADD COLUMN "password_reset_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "requires_password_setup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "login_locked_until" TIMESTAMP(3);

UPDATE "User"
SET "requires_password_setup" = true
WHERE "password_hash" IS NULL;
