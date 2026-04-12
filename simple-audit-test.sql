-- ============================================================
-- SIMPLE TEST: Audit Trail (Bypass Sequence Issue)
-- ============================================================

-- STEP 1: Cek data existing (ambil 1 row untuk test)
SELECT no, no_id, description, created_at, updated_at
FROM daftaralat
ORDER BY no DESC
LIMIT 3;

-- STEP 2: Test UPDATE pada data existing (ini pasti jalan)
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

-- STEP 4: Test INSERT dengan OVERRIDING SYSTEM VALUE
INSERT INTO daftaralat
OVERRIDING SYSTEM VALUE
("no", no_id, description, type_model, location, status)
VALUES
(999999, 'TEST-AUDIT-SIMPLE', 'Test Audit Simple', 'Test', 'Test Location', 'active')
RETURNING "no", no_id, created_at, updated_at;

-- STEP 5: Cek audit log setelah INSERT
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  new_data->>'description' as description
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-SIMPLE'
ORDER BY changed_at DESC;

-- STEP 6: Test UPDATE pada data test
UPDATE daftaralat
SET 
  description = 'Test Audit - UPDATED',
  updated_by = 'test-user-2'
WHERE no_id = 'TEST-AUDIT-SIMPLE'
RETURNING no_id, description, updated_at, updated_by;

-- STEP 7: Cek audit log setelah UPDATE
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  old_data->>'description' as old_desc,
  new_data->>'description' as new_desc
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-SIMPLE'
ORDER BY changed_at DESC;

-- STEP 8: Test DELETE
DELETE FROM daftaralat WHERE no = 999999;

-- STEP 9: Cek audit log setelah DELETE
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-SIMPLE'
ORDER BY changed_at DESC;

-- STEP 10: FINAL SUMMARY
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
  COUNT(*) as total,
  MIN(changed_at) as first_record,
  MAX(changed_at) as last_record
FROM daftaralat_audit_log
GROUP BY action
ORDER BY total DESC;
