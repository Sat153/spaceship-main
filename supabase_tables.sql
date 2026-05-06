-- ─────────────────────────────────────────
-- 1. EMPLOYEES TABLE
-- ─────────────────────────────────────────
CREATE TABLE employees (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  designation TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. RAW PHOTOS TABLE
-- ─────────────────────────────────────────
CREATE SEQUENCE raw_photo_seq START 1;

CREATE TABLE raw_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id    TEXT        UNIQUE DEFAULT ('RAW-' || LPAD(nextval('raw_photo_seq')::TEXT, 6, '0')),
  image_url   TEXT        NOT NULL,
  assignee_id UUID        REFERENCES employees(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'assigned'
                          CHECK (status IN ('assigned', 'in_progress', 'completed', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- 3. PROCESSED PHOTOS TABLE
-- ─────────────────────────────────────────
CREATE SEQUENCE processed_photo_seq START 1;

CREATE TABLE processed_photos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id          TEXT        UNIQUE DEFAULT ('PROC-' || LPAD(nextval('processed_photo_seq')::TEXT, 6, '0')),
  image_url         TEXT        NOT NULL,
  assignee_id       UUID        REFERENCES employees(id) ON DELETE SET NULL,
  raw_photo_id      UUID        REFERENCES raw_photos(id) ON DELETE SET NULL,
  internal_approval BOOLEAN     NOT NULL DEFAULT false,
  approved          BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- 4. AUTO updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER raw_photos_updated_at
  BEFORE UPDATE ON raw_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER processed_photos_updated_at
  BEFORE UPDATE ON processed_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_photos ENABLE ROW LEVEL SECURITY;

-- Employees
CREATE POLICY "auth_select_employees" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_employees" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_employees" ON employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_employees" ON employees FOR DELETE TO authenticated USING (true);

-- Raw Photos
CREATE POLICY "auth_select_raw"  ON raw_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_raw"  ON raw_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_raw"  ON raw_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_raw"  ON raw_photos FOR DELETE TO authenticated USING (true);

-- Processed Photos
CREATE POLICY "auth_select_proc" ON processed_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_proc" ON processed_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_proc" ON processed_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_proc" ON processed_photos FOR DELETE TO authenticated USING (true);
