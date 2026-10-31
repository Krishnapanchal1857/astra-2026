-- ASTRA 2026 schema for Neon PostgreSQL.
-- ADDITIVE ONLY: every statement is CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- It never drops, truncates or rewrites existing tables or rows. Safe to re-run.
-- Run it by pasting the whole file into the Neon console SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------- Core tables (match the ER diagram) ----------
CREATE TABLE IF NOT EXISTS departments (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id                      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                    text NOT NULL,
  category                text NOT NULL,
  subcategory             text NOT NULL DEFAULT '',
  description             text NOT NULL DEFAULT '',
  department_id           int REFERENCES departments(id),
  allow_individual        boolean NOT NULL DEFAULT true,
  allow_team              boolean NOT NULL DEFAULT false,
  min_team_size           int,
  max_team_size           int,
  max_substitutes         int NOT NULL DEFAULT 0,
  fee_paise               int NOT NULL DEFAULT 0,
  fee_per_person          boolean NOT NULL DEFAULT false,   -- true: fee x number of (non-substitute) participants
  capacity                int,
  registration_opens_at   timestamptz,
  registration_closes_at  timestamptz,
  registration_status     text NOT NULL DEFAULT 'open',
  extra_fields            jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS fee_per_person boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_events_name ON events (name);

-- ---------- Colleges and College Leaders (new) ----------
CREATE TABLE IF NOT EXISTS colleges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_key    text NOT NULL,                         -- normalised name; prevents duplicate colleges
  join_code   text NOT NULL,                         -- shared with students; server resolves it to the college
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_colleges_name_key ON colleges (name_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_colleges_join_code ON colleges (join_code);

CREATE TABLE IF NOT EXISTS college_leaders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id     uuid NOT NULL REFERENCES colleges(id),
  full_name      text NOT NULL,
  email          text NOT NULL,
  mobile         text NOT NULL,
  department     text NOT NULL,
  course_year    text NOT NULL,
  password_hash  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  approved_by    uuid,
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cl_email  ON college_leaders (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_cl_mobile ON college_leaders (mobile);
-- Exactly ONE pending/approved CL per college (rejected/revoked CLs free the slot).
CREATE UNIQUE INDEX IF NOT EXISTS ux_cl_one_active_per_college
  ON college_leaders (college_id) WHERE status IN ('pending','approved');

-- ---------- Registrations and participants ----------
CREATE TABLE IF NOT EXISTS registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_code          text NOT NULL UNIQUE,
  event_id          int NOT NULL REFERENCES events(id),
  format            text NOT NULL,
  team_name         text,
  college_name      text NOT NULL,
  contingent_code   text,
  contact_email     text NOT NULL,
  contact_phone     text NOT NULL,
  extra             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'pending',
  payment_status    text NOT NULL DEFAULT 'not_required',
  requires_approval boolean NOT NULL DEFAULT false,
  needs_review      boolean NOT NULL DEFAULT false,
  reserved_until    timestamptz,
  consent           boolean NOT NULL DEFAULT false,
  consent_at        timestamptz NOT NULL DEFAULT now(),
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex') UNIQUE,
  access_token_hash text NOT NULL DEFAULT '',
  idempotency_key   text UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- New: the server-validated college of every registration.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id);
CREATE INDEX IF NOT EXISTS ix_registrations_college ON registrations (college_id);
CREATE INDEX IF NOT EXISTS ix_registrations_event   ON registrations (event_id);

CREATE TABLE IF NOT EXISTS participants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  uuid NOT NULL REFERENCES registrations(id),
  full_name        text NOT NULL,
  email            text,
  mobile           text,
  department       text NOT NULL,
  course_year      text NOT NULL,
  roll_number      text NOT NULL,
  role             text NOT NULL,                    -- leader | member | substitute
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES colleges(id);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS event_id   int  REFERENCES events(id);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS active     boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS ix_participants_registration ON participants (registration_id);
CREATE INDEX IF NOT EXISTS ix_participants_college      ON participants (college_id);
-- One student (college + roll number) can appear only once per event while the registration is active.
CREATE UNIQUE INDEX IF NOT EXISTS ux_participant_once_per_event
  ON participants (event_id, college_id, lower(roll_number)) WHERE active;

-- Defence in depth: a student's / registration's college can never be changed after creation.
CREATE OR REPLACE FUNCTION forbid_college_change() RETURNS trigger AS $$
BEGIN
  IF OLD.college_id IS NOT NULL AND NEW.college_id IS DISTINCT FROM OLD.college_id THEN
    RAISE EXCEPTION 'college_id cannot be changed';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_participants_college_lock') THEN
    CREATE TRIGGER trg_participants_college_lock BEFORE UPDATE ON participants
      FOR EACH ROW EXECUTE FUNCTION forbid_college_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_registrations_college_lock') THEN
    CREATE TRIGGER trg_registrations_college_lock BEFORE UPDATE ON registrations
      FOR EACH ROW EXECUTE FUNCTION forbid_college_change();
  END IF;
END $$;

-- ---------- Remaining tables from the ER diagram (kept so no existing data/structure is lost) ----------
CREATE TABLE IF NOT EXISTS payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id       uuid NOT NULL REFERENCES registrations(id),
  razorpay_order_id     text UNIQUE,
  razorpay_payment_id   text UNIQUE,
  amount_paise          int NOT NULL,
  currency              text NOT NULL DEFAULT 'INR',
  status                text NOT NULL,
  method                text,
  verified_at           timestamptz,
  refund_status         text,
  last_webhook_event_id text,
  failure_reason        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  uuid NOT NULL REFERENCES registrations(id),
  participant_id   uuid REFERENCES participants(id),
  doc_type         text NOT NULL,
  storage_path     text NOT NULL,
  content_type     text NOT NULL,
  size_bytes       int NOT NULL,
  status           text NOT NULL,
  review_notes     text,
  reviewed_by      uuid,
  reviewed_at      timestamptz,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE TABLE IF NOT EXISTS admin_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  role           text NOT NULL DEFAULT 'admin',
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_email ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id     text PRIMARY KEY,
  event_type   text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Login / signup throttling ----------
CREATE TABLE IF NOT EXISTS auth_attempts (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key           text NOT NULL,
  attempted_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_auth_attempts_key ON auth_attempts (key, attempted_at);

-- ---------- College payments (new): the College Leader pays for many registrations at once ----------
CREATE TABLE IF NOT EXISTS payment_batches (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id           uuid NOT NULL REFERENCES colleges(id),
  leader_id            uuid NOT NULL REFERENCES college_leaders(id),
  razorpay_order_id    text NOT NULL UNIQUE,
  razorpay_payment_id  text UNIQUE,
  amount_paise         int  NOT NULL CHECK (amount_paise > 0),
  currency             text NOT NULL DEFAULT 'INR',
  status               text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  verified_at          timestamptz
);
CREATE INDEX IF NOT EXISTS ix_payment_batches_college ON payment_batches (college_id);

CREATE TABLE IF NOT EXISTS payment_batch_items (
  batch_id         uuid NOT NULL REFERENCES payment_batches(id),
  registration_id  uuid NOT NULL REFERENCES registrations(id),
  amount_paise     int  NOT NULL,
  PRIMARY KEY (batch_id, registration_id)
);
CREATE INDEX IF NOT EXISTS ix_batch_items_registration ON payment_batch_items (registration_id);
