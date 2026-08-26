-- ===================================================================
-- DIAGNOSTIC QUERY: August 2026 Log Aktivitas Detail
-- ===================================================================
-- Gunakan query ini untuk memeriksa detail lengkap log aktivitas
-- bulan Agustus 2026 untuk Kalibrasi dan PM
--
-- EXPECTED RESULT (berdasarkan user report):
-- - Kalibrasi: 102 out of 103 completed (99%)
-- - PM: Check actual completion count
-- ===================================================================

-- 1. COUNT: Total Kalibrasi Logs in August 2026
SELECT 
  'Kalibrasi August 2026 Total' as description,
  COUNT(*) as total_count
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';

-- 2. DETAIL: All Kalibrasi Logs in August 2026
SELECT 
  no as log_no,
  no_id,
  calibration_id,
  execute_date,
  date_status,
  created_at
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
ORDER BY execute_date, no_id;

-- 3. COUNT: Total PM Logs in August 2026
SELECT 
  'PM August 2026 Total' as description,
  COUNT(*) as total_count
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';

-- 4. DETAIL: All PM Logs in August 2026
SELECT 
  no as log_no,
  no_id,
  execute_date,
  date_status,
  created_at
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
ORDER BY execute_date, no_id;

-- 5. SCHEDULED: Total Kalibrasi Schedules for August 2026
SELECT 
  'Kalibrasi Scheduled for August' as description,
  COUNT(*) as total_count
FROM kalibrasi k
JOIN daftaralat d ON k.no_id = d.no_id
WHERE LOWER(k.due_date) LIKE '%aug%'
  AND (d.status IS NULL OR d.status != 'obsolete');

-- 6. SCHEDULED: Total PM Schedules for August 2026
SELECT 
  'PM Scheduled for August' as description,
  COUNT(*) as total_count
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (status IS NULL OR status != 'obsolete')
  AND (
    (LOWER("6_monthly") LIKE '%aug%' AND "6_monthly" NOT IN ('NA', '-'))
    OR
    (LOWER(yearly) LIKE '%aug%' AND yearly NOT IN ('NA', '-'))
  );

-- 7. CROSS-CHECK: Date format check for August logs
SELECT 
  jenis,
  execute_date,
  CASE 
    WHEN execute_date::text LIKE '2026-08%' THEN 'String Match: YES'
    ELSE 'String Match: NO'
  END as string_match_test,
  EXTRACT(MONTH FROM execute_date::date) as month_number,
  EXTRACT(YEAR FROM execute_date::date) as year_number
FROM logaktivitas
WHERE execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
ORDER BY jenis, execute_date
LIMIT 20;

-- 8. SUMMARY: Aggregate by Type
SELECT 
  jenis,
  COUNT(*) as total_logs,
  MIN(execute_date) as earliest_date,
  MAX(execute_date) as latest_date,
  COUNT(DISTINCT no_id) as unique_equipment
FROM logaktivitas
WHERE execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
GROUP BY jenis;

-- ===================================================================
-- INTERPRETATION GUIDE:
-- ===================================================================
-- Query #1 & #3: Should match "executed" count in dashboard
-- Query #5 & #6: Should match "count" (scheduled) in dashboard
-- Query #7: Tests if date format matches the string matching logic
-- 
-- IF MISMATCH FOUND:
-- 1. Check if execute_date format is consistent (YYYY-MM-DD)
-- 2. Verify no timezone issues causing date shifts
-- 3. Confirm obsolete equipment are properly excluded
-- ===================================================================
