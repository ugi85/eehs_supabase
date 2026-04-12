-- ============================================================
-- FIX: Sequence Issue & Test Audit Trail
-- ============================================================

-- STEP 1: Fix sequence untuk IDENTITY column
-- Cari sequence name yang benar
DO $$
DECLARE
  seq_name text;
  max_no bigint;
BEGIN
  -- Get sequence name untuk kolom 'no'
  SELECT pg_get_serial_sequence('daftaralat', 'no') INTO seq_name;

  IF seq_name IS NOT NULL THEN
    -- Get max no saat ini
    SELECT COALESCE(MAX(no), 0) INTO max_no FROM daftaralat;

    -- Reset sequence
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s', seq_name, max_no + 1);

    RAISE NOTICE 'Sequence fixed: %, next value: %', seq_name, max_no + 1;
  ELSE
    RAISE NOTICE 'No sequence found for column no - skipping sequence fix';
  END IF;
END $$;

-- Verify sequence sudah benar (jika ada)
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('daftaralat', 'no') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    RAISE NOTICE 'Sequence name: %', seq_name;
  ELSE
    RAISE NOTICE 'No sequence found - identity column will auto-generate';
  END IF;
END $$;

-- STEP 2: Test insert dengan benar (exclude kolom 'no')
INSERT INTO daftaralat (
  no_id, 
  description, 
  type_model, 
  location, 
  status
) VALUES (
  'TEST-AUDIT-CURRENT', 
  'Test Audit Sekarang', 
  'Test Model', 
  'Test Location', 
  'active'
) RETURNING no, no_id, created_at, updated_at;

-- STEP 3: Cek apakah masuk audit log
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  new_data->>'description' as description
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-CURRENT'
ORDER BY changed_at DESC;

-- STEP 4: Test update
UPDATE daftaralat
SET 
  description = 'Test Audit - UPDATED',
  updated_by = 'test-user'
WHERE no_id = 'TEST-AUDIT-CURRENT'
RETURNING no_id, description, updated_at, updated_by;

-- STEP 5: Cek audit log setelah update
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at,
  old_data->>'description' as old_desc,
  new_data->>'description' as new_desc
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-CURRENT'
ORDER BY changed_at DESC;

-- STEP 6: Test delete
DELETE FROM daftaralat WHERE no_id = 'TEST-AUDIT-CURRENT';

-- STEP 7: Cek audit log setelah delete
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
WHERE alat_no_id = 'TEST-AUDIT-CURRENT'
ORDER BY changed_at DESC;

-- STEP 8: Summary - Tampilkan semua audit log
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
ORDER BY changed_at DESC
LIMIT 10;

-- STEP 9: Count by action type
SELECT 
  action,
  COUNT(*) as total
FROM daftaralat_audit_log
GROUP BY action
ORDER BY total DESC;
