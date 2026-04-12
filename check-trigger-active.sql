-- ============================================================
-- CHECK: Apakah Trigger Aktif?
-- ============================================================

-- 1. Cek semua trigger di tabel daftaralat
SELECT 
  trigger_name,
  event_manipulation,  -- INSERT, UPDATE, atau DELETE
  event_object_table,
  action_timing,       -- BEFORE atau AFTER
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'daftaralat'
ORDER BY trigger_name, event_manipulation;

-- 2. Cek fungsi trigger yang digunakan
SELECT 
  trigger_name,
  routine_name,
  routine_definition
FROM information_schema.triggers t
JOIN information_schema.routines r 
  ON t.action_statement = r.routine_name
WHERE t.event_object_table = 'daftaralat';

-- 3. Test manual: UPDATE 1 row dan lihat apakah trigger jalan
-- Ambil 1 row pertama
SELECT no, no_id, description
FROM daftaralat
ORDER BY no
LIMIT 1;

-- 4. UPDATE row tersebut
UPDATE daftaralat
SET description = description || ' [TRIGGER TEST]'
WHERE no = (SELECT MIN(no) FROM daftaralat)
RETURNING no, no_id, description;

-- 5. Cek apakah masuk audit log
SELECT COUNT(*) as audit_log_count
FROM daftaralat_audit_log;

-- 6. Jika ada data, tampilkan
SELECT 
  id,
  alat_no_id,
  action,
  changed_by,
  changed_at
FROM daftaralat_audit_log
ORDER BY id DESC
LIMIT 5;

-- 7. Jika masih kosong, cek apakah fungsi trigger ada
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'log_daftaralat_changes';
