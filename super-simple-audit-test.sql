-- ============================================================
-- SUPER SIMPLE TEST: Audit Trail (UPDATE Only)
-- ============================================================

-- STEP 1: Lihat data existing (ambil 1 row untuk test)
SELECT no, no_id, description, created_at, updated_at, updated_by
FROM daftaralat
ORDER BY no DESC
LIMIT 5;

-- STEP 2: Test UPDATE pada data existing (pilih no paling kecil)
UPDATE daftaralat
SET 
  description = description || ' [AUDIT TEST]',
  updated_by = 'audit-test-user'
WHERE no = (SELECT MIN(no) FROM daftaralat)
RETURNING no, no_id, description, updated_at, updated_by;

-- STEP 3: Cek apakah masuk audit log
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  old_data->>'description' as old_desc,
  new_data->>'description' as new_desc
FROM daftaralat_audit_log
ORDER BY changed_at DESC
LIMIT 5;

-- STEP 4: Test UPDATE lagi dengan data berbeda
UPDATE daftaralat
SET 
  location = 'Test Location Updated',
  updated_by = 'test-user-2'
WHERE no = (SELECT MIN(no) FROM daftaralat)
RETURNING no, no_id, location, updated_at, updated_by;

-- STEP 5: Cek audit log lagi
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  old_data->>'location' as old_loc,
  new_data->>'location' as new_loc
FROM daftaralat_audit_log
ORDER BY changed_at DESC
LIMIT 5;

-- STEP 6: FINAL SUMMARY
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
ORDER BY changed_at DESC
LIMIT 10;

-- Count by action
SELECT 
  action,
  COUNT(*) as total
FROM daftaralat_audit_log
GROUP BY action
ORDER BY total DESC;
