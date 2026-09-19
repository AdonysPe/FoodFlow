-- ---------------------------------------------------------------------------
-- Grant the first platform administrator.
--
-- IDEMPOTENT AND NON-FATAL. If the account does not exist yet the UPDATE
-- matches zero rows and the migration still succeeds — a fresh database must
-- not be blocked on a person having signed up. Run
-- `npm run grant:platform-admin` once the account exists to finish the job.
--
-- The email is only used to FIND the account. Authorization itself is the
-- persisted `role` column from here on, so changing this address later does
-- not move the permission, and no request is ever authorized by comparing an
-- email. `lower(trim(...))` on both sides so a stray space or a capital letter
-- in the stored value still matches.
--
-- `session_version` is bumped so the change takes effect on the next request
-- instead of the next week: middleware routes on the role claim inside the
-- session JWT, which was minted before this ran. Bumping invalidates that
-- token, the account signs in once more, and the new token carries
-- platform_admin.
--
-- Rollback: set the role back to 'restaurant_owner' for the same address.
-- ---------------------------------------------------------------------------

UPDATE "User"
SET
  "role" = 'platform_admin',
  "session_version" = "session_version" + 1
WHERE lower(trim("email")) = 'adonispereda1@gmail.com'
  AND "role" <> 'platform_admin';
