-- ============================================================
-- Audit Trail Columns untuk Jadwal Kalibrasi
-- ============================================================
-- File ini menambahkan kolom audit trail dan trigger otomatis
-- untuk tabel kalibrasi (jadwal kalibrasi)
-- Run di Supabase SQL Editor

-- 1. Tambahkan kolom audit trail ke tabel kalibrasi
ALTER TABLE kalibrasi
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by varchar(100),
ADD COLUMN IF NOT EXISTS updated_by varchar(100);

-- 2. Tambahkan index untuk performa query
CREATE INDEX IF NOT EXISTS idx_kalibrasi_created_at ON kalibrasi(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kalibrasi_updated_at ON kalibrasi(updated_at DESC);

-- 3. Buat fungsi untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_kalibrasi_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Buat trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS trg_kalibrasi_updated_at ON kalibrasi;
CREATE TRIGGER trg_kalibrasi_updated_at
  BEFORE UPDATE ON kalibrasi
  FOR EACH ROW
  EXECUTE FUNCTION update_kalibrasi_updated_at_column();

-- 5. (Opsional) Buat tabel audit log untuk history lengkap
CREATE TABLE IF NOT EXISTS kalibrasi_audit_log (
  id bigserial PRIMARY KEY,
  alat_no_id text NOT NULL,
  calibration_id text,
  action text NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by varchar(100),
  changed_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kalibrasi_audit_no_id ON kalibrasi_audit_log(alat_no_id);
CREATE INDEX IF NOT EXISTS idx_kalibrasi_audit_cal_id ON kalibrasi_audit_log(calibration_id);
CREATE INDEX IF NOT EXISTS idx_kalibrasi_audit_changed_at ON kalibrasi_audit_log(changed_at DESC);

-- 6. Fungsi untuk insert ke audit log
CREATE OR REPLACE FUNCTION log_kalibrasi_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Gunakan EXCEPTION handling agar tidak break main operation
  BEGIN
    IF (TG_OP = 'INSERT') THEN
      INSERT INTO kalibrasi_audit_log (alat_no_id, calibration_id, action, new_data, changed_by)
      VALUES (NEW.no_id, NEW.calibration_id, 'INSERT', to_jsonb(NEW), COALESCE(NEW.created_by, 'system'));
      RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
      INSERT INTO kalibrasi_audit_log (alat_no_id, calibration_id, action, old_data, new_data, changed_by)
      VALUES (NEW.no_id, NEW.calibration_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), COALESCE(NEW.updated_by, 'system'));
      RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
      INSERT INTO kalibrasi_audit_log (alat_no_id, calibration_id, action, old_data, changed_by)
      VALUES (OLD.no_id, OLD.calibration_id, 'DELETE', to_jsonb(OLD), 'system');
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Jika audit log gagal, tetap lanjutkan operasi utama
    RAISE WARNING 'Kalibrasi audit log failed for % on no_id %: %', TG_OP,
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

-- 7. Trigger untuk audit log
DROP TRIGGER IF EXISTS trg_kalibrasi_audit ON kalibrasi;
CREATE TRIGGER trg_kalibrasi_audit
  AFTER INSERT OR UPDATE OR DELETE ON kalibrasi
  FOR EACH ROW
  EXECUTE FUNCTION log_kalibrasi_changes();

-- 8. Comment untuk dokumentasi
COMMENT ON COLUMN kalibrasi.created_at IS 'Timestamp saat data dibuat';
COMMENT ON COLUMN kalibrasi.updated_at IS 'Timestamp saat data terakhir diupdate (auto)';
COMMENT ON COLUMN kalibrasi.created_by IS 'User yang membuat data (email/ID)';
COMMENT ON COLUMN kalibrasi.updated_by IS 'User yang update data terakhir (email/ID)';

-- 9. Update data existing dengan default values
UPDATE kalibrasi
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  created_by = COALESCE(created_by, 'migration'),
  updated_by = COALESCE(updated_by, 'migration')
WHERE created_at IS NULL;

-- 10. Verify
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'kalibrasi'
  AND column_name IN ('created_at', 'updated_at', 'created_by', 'updated_by')
ORDER BY column_name;
