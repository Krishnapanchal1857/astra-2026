-- Reverses ONLY the objects added for the college/CL feature. Run ONLY if you want to undo it.
-- It does not touch events, registrations rows, participants rows, payments, or admin_users.
-- WARNING: dropping the college_id columns discards which college each registration belonged to.
DROP TRIGGER IF EXISTS trg_participants_college_lock ON participants;
DROP TRIGGER IF EXISTS trg_registrations_college_lock ON registrations;
DROP FUNCTION IF EXISTS forbid_college_change();
DROP INDEX IF EXISTS ux_participant_once_per_event;
ALTER TABLE participants   DROP COLUMN IF EXISTS college_id;
ALTER TABLE participants   DROP COLUMN IF EXISTS event_id;
ALTER TABLE participants   DROP COLUMN IF EXISTS active;
ALTER TABLE registrations  DROP COLUMN IF EXISTS college_id;
DROP TABLE IF EXISTS payment_batch_items;
DROP TABLE IF EXISTS payment_batches;
DROP TABLE IF EXISTS college_leaders;
DROP TABLE IF EXISTS colleges;
DROP TABLE IF EXISTS auth_attempts;
