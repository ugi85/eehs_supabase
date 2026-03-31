-- ============================================================
-- Tambah kolom backlog untuk tracking follow-up action
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom backlog_status
ALTER TABLE logaktivitas 
ADD COLUMN IF NOT EXISTS backlog_status VARCHAR(20) DEFAULT NULL;

-- 2. Tambah kolom backlog_notes untuk catatan detail
ALTER TABLE logaktivitas 
ADD COLUMN IF NOT EXISTS backlog_notes TEXT DEFAULT NULL;

-- 3. Tambah kolom audit trail backlog
ALTER TABLE logaktivitas
ADD COLUMN IF NOT EXISTS backlog_updated_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE logaktivitas
ADD COLUMN IF NOT EXISTS backlog_updated_by VARCHAR(100) DEFAULT NULL;

-- 4. Tambah kolom history backlog (JSONB array untuk audit trail lengkap)
ALTER TABLE logaktivitas
ADD COLUMN IF NOT EXISTS backlog_history JSONB DEFAULT '[]'::jsonb;

-- 4. Index untuk query performa
CREATE INDEX IF NOT EXISTS idx_logaktivitas_backlog_status 
ON logaktivitas(backlog_status) 
WHERE backlog_status IS NOT NULL;

-- 5. Verifikasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'logaktivitas' 
  AND column_name IN ('backlog_status', 'backlog_notes', 'backlog_updated_at', 'backlog_updated_by')
ORDER BY column_name;
