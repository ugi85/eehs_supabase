-- ============================================================
-- FIX: Bulk Delete Error - Audit Trail Issue
-- ============================================================
-- File ini untuk memperbaiki error bulk delete
-- Run di Supabase SQL Editor

-- OPSI 1: Disable trigger audit trail sementara (RECOMMENDED untuk fix cepat)
-- Uncomment baris di bawah ini jika bulk delete masih error

-- DROP TRIGGER IF EXISTS trg_daftaralat_audit ON daftaralat;
-- DROP FUNCTION IF EXISTS log_daftaralat_changes();

-- OPSI 2: Pastikan tabel audit_log sudah ada (jika belum)
-- Run ini dulu jika tabel daftaralat_audit_log belum terbuat

CREATE TABLE IF NOT EXISTS daftaralat_audit_log (
  id bigserial PRIMARY KEY,
  alat_no_id text NOT NULL,
  action text NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by varchar(100),
  changed_at timestamptz DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_daftaralat_audit_no_id ON daftaralat_audit_log(alat_no_id);
CREATE INDEX IF NOT EXISTS idx_daftaralat_audit_changed_at ON daftaralat_audit_log(changed_at DESC);

-- OPSI 3: Recreate trigger dengan error handling (LEBIH AMAN)
-- Drop trigger lama dulu
DROP TRIGGER IF EXISTS trg_daftaralat_audit ON daftaralat;
DROP FUNCTION IF EXISTS log_daftaralat_changes();

-- Buat fungsi baru dengan exception handling
CREATE OR REPLACE FUNCTION log_daftaralat_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Gunakan block untuk catch exception
  BEGIN
    IF (TG_OP = 'INSERT') THEN
      INSERT INTO daftaralat_audit_log (alat_no_id, action, new_data, changed_by)
      VALUES (NEW.no_id, 'INSERT', to_jsonb(NEW), COALESCE(NEW.created_by, 'system'));
      RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
      INSERT INTO daftaralat_audit_log (alat_no_id, action, old_data, new_data, changed_by)
      VALUES (NEW.no_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), COALESCE(NEW.updated_by, 'system'));
      RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
      INSERT INTO daftaralat_audit_log (alat_no_id, action, old_data, changed_by)
      VALUES (OLD.no_id, 'DELETE', to_jsonb(OLD), 'system');
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Jika audit log gagal, tetap lanjutkan operasi utama
    RAISE WARNING 'Audit log failed for % on no_id %: %', TG_OP, 
      CASE WHEN TG_OP = 'DELETE' THEN OLD.no_id ELSE NEW.no_id END,
      SQLERRM;
    -- Tetap return agar operasi utama tidak gagal
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trg_daftaralat_audit
  AFTER INSERT OR UPDATE OR DELETE ON daftaralat
  FOR EACH ROW
  EXECUTE FUNCTION log_daftaralat_changes();

-- TEST: Coba delete 1 row untuk verify
-- Uncomment untuk test (akan delete 1 row paling bawah)
-- DELETE FROM daftaralat WHERE no = (SELECT MIN(no) FROM daftaralat) LIMIT 1;

-- Verify trigger masih ada
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'daftaralat'
  AND trigger_name = 'trg_daftaralat_audit';
