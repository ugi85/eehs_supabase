-- ============================================================
-- RECREATE TRIGGER (Force Create)
-- ============================================================

-- 1. Drop trigger lama (jika ada)
DROP TRIGGER IF EXISTS trg_daftaralat_audit ON daftaralat;

-- 2. Recreate trigger
CREATE TRIGGER trg_daftaralat_audit
  AFTER INSERT OR UPDATE OR DELETE ON daftaralat
  FOR EACH ROW
  EXECUTE FUNCTION log_daftaralat_changes();

-- 3. Verify trigger sudah terbuat
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'daftaralat'
  AND trigger_name = 'trg_daftaralat_audit'
ORDER BY event_manipulation;

-- 4. Test UPDATE untuk verify
UPDATE daftaralat
SET description = description || ' [TRIGGER TEST]'
WHERE no = (SELECT MIN(no) FROM daftaralat)
RETURNING no, no_id, description;

-- 5. Cek audit log - HARUS ADA DATA!
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
ORDER BY id DESC
LIMIT 5;

-- 6. Jika masih kosong, test manual insert ke audit log
INSERT INTO daftaralat_audit_log (alat_no_id, action, changed_by)
VALUES ('MANUAL-TEST', 'MANUAL INSERT', 'test-user')
RETURNING *;

-- 7. Clean up test manual
DELETE FROM daftaralat_audit_log WHERE alat_no_id = 'MANUAL-TEST';

-- 8. Final check
SELECT COUNT(*) as total_audit_logs FROM daftaralat_audit_log;
