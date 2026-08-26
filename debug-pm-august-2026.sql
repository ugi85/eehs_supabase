-- ===================================================================
-- DIAGNOSTIC: PM Log Data for August 2026
-- ===================================================================

-- 1. Total PM logs in August 2026
SELECT 
  'Total PM Logs August 2026' as description,
  COUNT(*) as total_count
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';

-- 2. Detail: All PM logs in August 2026
SELECT 
  no as log_no,
  no_id,
  execute_date,
  date_status,
  created_at,
  CASE 
    WHEN execute_date::text LIKE '2026-08%' THEN 'String Match: YES'
    ELSE 'String Match: NO'
  END as string_match_test
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01'
ORDER BY execute_date;

-- 3. PM Schedule Count for August
SELECT 
  'PM Scheduled for August' as description,
  COUNT(*) as scheduled_count
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (status IS NULL OR status != 'obsolete')
  AND (
    (LOWER("6_monthly") LIKE '%aug%' AND "6_monthly" NOT IN ('NA', '-'))
    OR
    (LOWER(yearly) LIKE '%aug%' AND yearly NOT IN ('NA', '-'))
  );

-- 4. Detail: Equipment with PM scheduled in August
SELECT 
  no_id,
  "6_monthly",
  yearly,
  pm_yn,
  status,
  CASE 
    WHEN LOWER("6_monthly") LIKE '%aug%' THEN '6-Monthly Match'
    WHEN LOWER(yearly) LIKE '%aug%' THEN 'Yearly Match'
    ELSE 'No Match'
  END as schedule_type
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (status IS NULL OR status != 'obsolete')
  AND (
    (LOWER("6_monthly") LIKE '%aug%' AND "6_monthly" NOT IN ('NA', '-'))
    OR
    (LOWER(yearly) LIKE '%aug%' AND yearly NOT IN ('NA', '-'))
  )
ORDER BY no_id;

-- 5. Cross-check: PM logs with their equipment status
SELECT 
  l.no as log_no,
  l.no_id,
  l.execute_date,
  d.pm_yn,
  d.status,
  d."6_monthly",
  d.yearly,
  CASE 
    WHEN d.no_id IS NULL THEN 'Equipment NOT FOUND'
    WHEN d.pm_yn != 'Y' THEN 'PM Not Enabled'
    WHEN d.status = 'obsolete' THEN 'Equipment Obsolete'
    ELSE 'Valid'
  END as equipment_status
FROM logaktivitas l
LEFT JOIN daftaralat d ON l.no_id = d.no_id
WHERE l.jenis = 'PM'
  AND l.execute_date >= '2026-08-01'
  AND l.execute_date < '2026-09-01'
ORDER BY l.execute_date;

-- 6. Summary by month for all of 2026 (PM)
SELECT 
  EXTRACT(MONTH FROM execute_date) as month_number,
  TO_CHAR(execute_date, 'Month') as month_name,
  COUNT(*) as pm_count
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
GROUP BY EXTRACT(MONTH FROM execute_date), TO_CHAR(execute_date, 'Month')
ORDER BY month_number;

-- ===================================================================
-- EXPECTED RESULTS:
-- Query #1: Should show the actual executed PM count for August
-- Query #3: Should show the scheduled PM count for August
-- 
-- DASHBOARD SHOULD DISPLAY: executed/scheduled (percentage)
-- ===================================================================
