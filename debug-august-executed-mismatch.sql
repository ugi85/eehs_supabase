-- ===================================================================
-- DIAGNOSTIC QUERY: August 2026 Executed (104) vs Count (103) Mismatch
-- ===================================================================
-- Tujuan: Mencari tahu mengapa executed (104) lebih besar dari count (103)
-- untuk bulan Agustus 2026
--
-- Kemungkinan penyebab:
-- 1. Ada duplikasi log untuk equipment yang sama
-- 2. Ada log untuk equipment yang tidak punya jadwal di Agustus
-- 3. Ada equipment obsolete yang masih tercatat log-nya
-- ===================================================================

-- LANGKAH 1: Hitung total log aktivitas Kalibrasi di Agustus 2026
SELECT 
  'Total Executed Logs (Kalibrasi)' as description,
  COUNT(*) as total_count
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';

-- LANGKAH 2: Hitung total jadwal Kalibrasi untuk Agustus 2026
-- (Hanya equipment yang tidak obsolete dan due_date mengandung 'aug')
SELECT 
  'Total Scheduled Count (Kalibrasi)' as description,
  COUNT(*) as total_count
FROM kalibrasi k
JOIN daftaralat d ON k.no_id = d.no_id
WHERE LOWER(k.due_date) LIKE '%aug%'
  AND (d.status IS NULL OR d.status != 'obsolete');

-- LANGKAH 3: Cari log aktivitas yang tidak punya jadwal di Agustus
-- (Log yang ada tapi seharusnya tidak dijadwalkan di Agustus)
SELECT 
  'Logs WITHOUT August Schedule' as description,
  la.no,
  la.no_id,
  la.calibration_id,
  la.execute_date,
  k.due_date,
  d.status as equipment_status
FROM logaktivitas la
LEFT JOIN kalibrasi k ON la.calibration_id = k.calibration_id
LEFT JOIN daftaralat d ON la.no_id = d.no_id
WHERE la.jenis = 'Kalibrasi'
  AND la.execute_date >= '2026-08-01'
  AND la.execute_date < '2026-09-01'
  AND (
    k.due_date IS NULL 
    OR LOWER(k.due_date) NOT LIKE '%aug%'
    OR d.status = 'obsolete'
  )
ORDER BY la.execute_date;

-- LANGKAH 4: Cek duplikasi log (equipment yang sama tercatat > 1x di Agustus)
SELECT 
  'Duplicate Logs (Same Equipment)' as description,
  no_id,
  calibration_id,
  COUNT(*) as log_count,
  STRING_AGG(execute_date::text, ', ' ORDER BY execute_date) as all_execute_dates
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
GROUP BY no_id, calibration_id
HAVING COUNT(*) > 1
ORDER BY log_count DESC;

-- LANGKAH 5: Lihat semua log untuk equipment yang punya >1 entry
WITH duplicate_equipment AS (
  SELECT no_id, calibration_id
  FROM logaktivitas
  WHERE jenis = 'Kalibrasi'
    AND execute_date >= '2026-08-01'
    AND execute_date < '2026-09-01'
  GROUP BY no_id, calibration_id
  HAVING COUNT(*) > 1
)
SELECT 
  'Detail of Duplicate Logs' as description,
  la.*,
  k.due_date,
  d.status as equipment_status
FROM logaktivitas la
JOIN duplicate_equipment de ON la.no_id = de.no_id AND la.calibration_id = de.calibration_id
LEFT JOIN kalibrasi k ON la.calibration_id = k.calibration_id
LEFT JOIN daftaralat d ON la.no_id = d.no_id
WHERE la.jenis = 'Kalibrasi'
  AND la.execute_date >= '2026-08-01'
  AND la.execute_date < '2026-09-01'
ORDER BY la.no_id, la.execute_date;

-- LANGKAH 6: Bandingkan scheduled vs executed per equipment
WITH scheduled AS (
  SELECT 
    k.no_id,
    k.calibration_id,
    k.due_date,
    d.status
  FROM kalibrasi k
  JOIN daftaralat d ON k.no_id = d.no_id
  WHERE LOWER(k.due_date) LIKE '%aug%'
    AND (d.status IS NULL OR d.status != 'obsolete')
),
executed AS (
  SELECT 
    no_id,
    calibration_id,
    COUNT(*) as log_count,
    MIN(execute_date) as first_execution,
    MAX(execute_date) as last_execution
  FROM logaktivitas
  WHERE jenis = 'Kalibrasi'
    AND execute_date >= '2026-08-01'
    AND execute_date < '2026-09-01'
  GROUP BY no_id, calibration_id
)
SELECT 
  'Scheduled vs Executed Comparison' as description,
  COALESCE(s.no_id, e.no_id) as no_id,
  COALESCE(s.calibration_id, e.calibration_id) as calibration_id,
  s.due_date as scheduled_due_date,
  s.status as equipment_status,
  e.log_count,
  e.first_execution,
  e.last_execution,
  CASE
    WHEN s.no_id IS NULL THEN 'EXECUTED_WITHOUT_SCHEDULE'
    WHEN e.no_id IS NULL THEN 'SCHEDULED_NOT_EXECUTED'
    WHEN e.log_count > 1 THEN 'DUPLICATE_EXECUTION'
    ELSE 'NORMAL'
  END as status_flag
FROM scheduled s
FULL OUTER JOIN executed e ON s.no_id = e.no_id AND s.calibration_id = e.calibration_id
ORDER BY 
  CASE 
    WHEN s.no_id IS NULL THEN 1  -- Show unscheduled first
    WHEN e.log_count > 1 THEN 2  -- Then duplicates
    ELSE 3
  END,
  no_id;

-- LANGKAH 7: Summary count comparison
WITH counts AS (
  SELECT 
    (SELECT COUNT(*) 
     FROM kalibrasi k
     JOIN daftaralat d ON k.no_id = d.no_id
     WHERE LOWER(k.due_date) LIKE '%aug%'
       AND (d.status IS NULL OR d.status != 'obsolete')
    ) as scheduled_count,
    
    (SELECT COUNT(*)
     FROM logaktivitas
     WHERE jenis = 'Kalibrasi'
       AND execute_date >= '2026-08-01'
       AND execute_date < '2026-09-01'
    ) as executed_count,
    
    (SELECT COUNT(DISTINCT no_id || '-' || calibration_id)
     FROM logaktivitas
     WHERE jenis = 'Kalibrasi'
       AND execute_date >= '2026-08-01'
       AND execute_date < '2026-09-01'
    ) as unique_equipment_executed
)
SELECT 
  'Summary' as description,
  scheduled_count,
  executed_count,
  unique_equipment_executed,
  executed_count - scheduled_count as difference,
  CASE
    WHEN executed_count > unique_equipment_executed THEN 'HAS_DUPLICATES'
    WHEN executed_count > scheduled_count THEN 'EXTRA_LOGS_BEYOND_SCHEDULE'
    WHEN executed_count < scheduled_count THEN 'SOME_SCHEDULED_NOT_EXECUTED'
    ELSE 'PERFECT_MATCH'
  END as diagnosis
FROM counts;

-- ===================================================================
-- INTERPRETASI HASIL:
-- ===================================================================
-- 
-- Jika LANGKAH 3 ada hasil:
--   → Ada log aktivitas untuk equipment yang tidak dijadwalkan di Agustus
--   → atau equipment sudah obsolete
-- 
-- Jika LANGKAH 4 ada hasil:
--   → Ada equipment yang di-execute lebih dari 1x di bulan yang sama
--   → (Duplikasi log aktivitas)
-- 
-- Jika LANGKAH 6 menunjukkan 'EXECUTED_WITHOUT_SCHEDULE':
--   → Ada equipment yang di-execute tapi tidak ada jadwalnya di Agustus
-- 
-- Jika LANGKAH 7 diagnosis = 'HAS_DUPLICATES':
--   → executed_count > unique_equipment_executed
--   → Ada equipment yang di-log lebih dari sekali
-- 
-- ===================================================================
-- SOLUSI:
-- ===================================================================
-- 1. Hapus log duplikat (jika ada di LANGKAH 4)
-- 2. Tambahkan jadwal untuk equipment yang missing (jika LANGKAH 3)
-- 3. Atau: Update logika backend untuk menggunakan DISTINCT no_id
-- ===================================================================
