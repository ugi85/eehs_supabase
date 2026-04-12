-- ============================================================
-- DEBUG: Audit Trail Not Working
-- ============================================================
-- Run script ini di Supabase SQL Editor untuk debug & fix

-- STEP 1: Cek apakah tabel audit_log ada
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'daftaralat_audit_log';

-- STEP 2: Cek apakah kolom audit trail ada di daftaralat
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daftaralat'
  AND column_name IN ('created_at', 'updated_at', 'created_by', 'updated_by')
ORDER BY column_name;

-- STEP 3: Cek apakah trigger ada
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'daftaralat';

-- STEP 4: Cek apakah fungsi trigger ada
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'log_daftaralat_changes';

-- ============================================================
-- FIX: Jika ada yang kurang, run script di bawah ini
-- ============================================================

-- 1. Buat tabel audit_log jika belum ada
CREATE TABLE IF NOT EXISTS daftaralat_audit_log (
  id bigserial PRIMARY KEY,
  alat_no_id text NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_by varchar(100),
  changed_at timestamptz DEFAULT NOW()
);

-- 2. Tambah kolom audit trail ke daftaralat jika belum ada
ALTER TABLE daftaralat 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by varchar(100),
ADD COLUMN IF NOT EXISTS updated_by varchar(100);

-- 3. Buat index
CREATE INDEX IF NOT EXISTS idx_daftaralat_created_at ON daftaralat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daftaralat_updated_at ON daftaralat(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_daftaralat_audit_no_id ON daftaralat_audit_log(alat_no_id);
CREATE INDEX IF NOT EXISTS idx_daftaralat_audit_changed_at ON daftaralat_audit_log(changed_at DESC);

-- 4. Drop trigger & function lama (jika ada)
DROP TRIGGER IF EXISTS trg_daftaralat_audit ON daftaralat;
DROP FUNCTION IF EXISTS log_daftaralat_changes();
DROP TRIGGER IF EXISTS trg_daftaralat_updated_at ON daftaralat;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 5. Buat fungsi untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Buat trigger untuk auto-update updated_at
CREATE TRIGGER trg_daftaralat_updated_at
  BEFORE UPDATE ON daftaralat
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Buat fungsi audit log dengan error handling
CREATE OR REPLACE FUNCTION log_daftaralat_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by varchar(100);
BEGIN
  -- Tentukan siapa yang mengubah
  IF (TG_OP = 'INSERT') THEN
    v_changed_by := COALESCE(NEW.created_by, 'system');
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changed_by := COALESCE(NEW.updated_by, 'system');
  ELSE
    v_changed_by := 'system';
  END IF;

  -- Insert ke audit log
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO daftaralat_audit_log (alat_no_id, action, new_data, changed_by)
    VALUES (NEW.no_id, 'INSERT', to_jsonb(NEW), v_changed_by);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO daftaralat_audit_log (alat_no_id, action, old_data, new_data, changed_by)
    VALUES (NEW.no_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_changed_by);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO daftaralat_audit_log (alat_no_id, action, old_data, changed_by)
    VALUES (OLD.no_id, 'DELETE', to_jsonb(OLD), v_changed_by);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Jika audit log gagal, tetap lanjutkan operasi utama
  RAISE WARNING 'Audit log failed for % on no_id %: %', TG_OP, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.no_id ELSE NEW.no_id END,
    SQLERRM;
  
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Buat trigger audit log
CREATE TRIGGER trg_daftaralat_audit
  AFTER INSERT OR UPDATE OR DELETE ON daftaralat
  FOR EACH ROW
  EXECUTE FUNCTION log_daftaralat_changes();

-- ============================================================
-- TEST: Insert 1 row untuk verify trigger jalan
-- ============================================================

-- Insert test data
INSERT INTO daftaralat (no_id, description, type_model, location, status)
VALUES ('TEST-AUDIT-001', 'Test Audit Trail', 'Test Model', 'Test Location', 'active')
RETURNING no, no_id, created_at, updated_at;

-- Cek apakah masuk ke audit log
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-001';

-- Update test data
UPDATE daftaralat
SET description = 'Test Audit Trail - UPDATED',
    updated_by = 'test-user'
WHERE no_id = 'TEST-AUDIT-001'
RETURNING no_id, description, updated_at, updated_by;

-- Cek audit log setelah update
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  old_data->>'description' as old_description,
  new_data->>'description' as new_description
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-001'
ORDER BY changed_at DESC;

-- Delete test data
DELETE FROM daftaralat WHERE no_id = 'TEST-AUDIT-001';

-- Cek audit log setelah delete
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-001'
ORDER BY changed_at DESC;

-- ============================================================
-- FINAL: Summary
-- ============================================================

-- Tampilkan semua audit log (10 terakhir)
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
ORDER BY changed_at DESC
LIMIT 10;

-- Count audit log by action
SELECT 
  action,
  COUNT(*) as total
FROM daftaralat_audit_log
GROUP BY action
ORDER BY total DESC;
