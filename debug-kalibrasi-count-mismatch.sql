-- ============================================================
-- Debug Script: Kalibrasi Count Mismatch
-- ============================================================
-- Purpose: Diagnose why dashboard shows different count than actual data
-- Date: September 2026
-- ============================================================

-- ============================================================
-- 1. TOTAL KALIBRASI: Bandingkan berbagai metode hitung
-- ============================================================

-- Method 1: Count dari tabel kalibrasi (raw total)
SELECT 
  'Method 1: Raw kalibrasi table' as method,
  COUNT(*) as total_count,
  'All calibration schedules in database' as description
FROM kalibrasi;

-- Method 2: Count kalibrasi dengan equipment yang masih active
SELECT 
  'Method 2: Active equipment only' as method,
  COUNT(DISTINCT k.calibration_id) as total_count,
  'Calibration schedules for non-obsolete equipment' as description
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete');

-- Method 3: Count untuk tahun 2026 (yearly schedules)
SELECT 
  'Method 3: Yearly schedules 2026' as method,
  COUNT(DISTINCT k.calibration_id) as total_count,
  'All 12-month interval calibrations' as description
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete')
  AND (k.int IS NULL OR k.int = '12' OR k.int LIKE '%year%' OR CAST(k.int AS INTEGER) <= 12);

-- Method 4: Dashboard calculation (sum of all months)
-- This simulates what the dashboard does
WITH monthly_counts AS (
  SELECT 
    CASE 
      WHEN k.due_date LIKE '%Jan%' THEN 'January'
      WHEN k.due_date LIKE '%Feb%' THEN 'February'
      WHEN k.due_date LIKE '%Mar%' THEN 'March'
      WHEN k.due_date LIKE '%Apr%' THEN 'April'
      WHEN k.due_date LIKE '%May%' THEN 'May'
      WHEN k.due_date LIKE '%Jun%' THEN 'June'
      WHEN k.due_date LIKE '%Jul%' THEN 'July'
      WHEN k.due_date LIKE '%Aug%' THEN 'August'
      WHEN k.due_date LIKE '%Sep%' THEN 'September'
      WHEN k.due_date LIKE '%Oct%' THEN 'October'
      WHEN k.due_date LIKE '%Nov%' THEN 'November'
      WHEN k.due_date LIKE '%Dec%' THEN 'December'
      ELSE 'Unknown'
    END as month,
    COUNT(DISTINCT k.calibration_id) as count
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
  GROUP BY 
    CASE 
      WHEN k.due_date LIKE '%Jan%' THEN 'January'
      WHEN k.due_date LIKE '%Feb%' THEN 'February'
      WHEN k.due_date LIKE '%Mar%' THEN 'March'
      WHEN k.due_date LIKE '%Apr%' THEN 'April'
      WHEN k.due_date LIKE '%May%' THEN 'May'
      WHEN k.due_date LIKE '%Jun%' THEN 'June'
      WHEN k.due_date LIKE '%Jul%' THEN 'July'
      WHEN k.due_date LIKE '%Aug%' THEN 'August'
      WHEN k.due_date LIKE '%Sep%' THEN 'September'
      WHEN k.due_date LIKE '%Oct%' THEN 'October'
      WHEN k.due_date LIKE '%Nov%' THEN 'November'
      WHEN k.due_date LIKE '%Dec%' THEN 'December'
      ELSE 'Unknown'
    END
)
SELECT 
  'Method 4: Dashboard monthly sum' as method,
  SUM(count) as total_count,
  'Sum of all 12 months (how dashboard calculates)' as description
FROM monthly_counts
WHERE month != 'Unknown';


-- ============================================================
-- 2. MONTHLY BREAKDOWN: Detail per bulan
-- ============================================================

SELECT 
  CASE 
    WHEN k.due_date LIKE '%Jan%' THEN 'January'
    WHEN k.due_date LIKE '%Feb%' THEN 'February'
    WHEN k.due_date LIKE '%Mar%' THEN 'March'
    WHEN k.due_date LIKE '%Apr%' THEN 'April'
    WHEN k.due_date LIKE '%May%' THEN 'May'
    WHEN k.due_date LIKE '%Jun%' THEN 'June'
    WHEN k.due_date LIKE '%Jul%' THEN 'July'
    WHEN k.due_date LIKE '%Aug%' THEN 'August'
    WHEN k.due_date LIKE '%Sep%' THEN 'September'
    WHEN k.due_date LIKE '%Oct%' THEN 'October'
    WHEN k.due_date LIKE '%Nov%' THEN 'November'
    WHEN k.due_date LIKE '%Dec%' THEN 'December'
    ELSE 'Unknown'
  END as month,
  COUNT(DISTINCT k.calibration_id) as scheduled_count,
  COUNT(DISTINCT CASE WHEN (d.status IS NULL OR d.status != 'obsolete') THEN k.calibration_id END) as active_equipment_count,
  COUNT(DISTINCT CASE WHEN k.int = '12' OR k.int LIKE '%year%' THEN k.calibration_id END) as yearly_count,
  COUNT(DISTINCT CASE WHEN k.int IS NOT NULL AND k.int != '12' AND k.int NOT LIKE '%year%' THEN k.calibration_id END) as multi_year_count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE k.due_date IS NOT NULL
GROUP BY 
  CASE 
    WHEN k.due_date LIKE '%Jan%' THEN 'January'
    WHEN k.due_date LIKE '%Feb%' THEN 'February'
    WHEN k.due_date LIKE '%Mar%' THEN 'March'
    WHEN k.due_date LIKE '%Apr%' THEN 'April'
    WHEN k.due_date LIKE '%May%' THEN 'May'
    WHEN k.due_date LIKE '%Jun%' THEN 'June'
    WHEN k.due_date LIKE '%Jul%' THEN 'July'
    WHEN k.due_date LIKE '%Aug%' THEN 'August'
    WHEN k.due_date LIKE '%Sep%' THEN 'September'
    WHEN k.due_date LIKE '%Oct%' THEN 'October'
    WHEN k.due_date LIKE '%Nov%' THEN 'November'
    WHEN k.due_date LIKE '%Dec%' THEN 'December'
    ELSE 'Unknown'
  END
ORDER BY 
  CASE 
    WHEN k.due_date LIKE '%Jan%' THEN 1
    WHEN k.due_date LIKE '%Feb%' THEN 2
    WHEN k.due_date LIKE '%Mar%' THEN 3
    WHEN k.due_date LIKE '%Apr%' THEN 4
    WHEN k.due_date LIKE '%May%' THEN 5
    WHEN k.due_date LIKE '%Jun%' THEN 6
    WHEN k.due_date LIKE '%Jul%' THEN 7
    WHEN k.due_date LIKE '%Aug%' THEN 8
    WHEN k.due_date LIKE '%Sep%' THEN 9
    WHEN k.due_date LIKE '%Oct%' THEN 10
    WHEN k.due_date LIKE '%Nov%' THEN 11
    WHEN k.due_date LIKE '%Dec%' THEN 12
    ELSE 99
  END;


-- ============================================================
-- 3. DUPLICATE CHECK: Apakah ada duplikasi yang menyebabkan over-count?
-- ============================================================

-- Check duplicate calibration_id
SELECT 
  calibration_id,
  COUNT(*) as occurrence_count,
  STRING_AGG(DISTINCT no_id, ', ') as equipment_list,
  STRING_AGG(DISTINCT due_date, ', ') as due_dates
FROM kalibrasi
WHERE calibration_id IS NOT NULL
GROUP BY calibration_id
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- Check multiple schedules for same equipment
SELECT 
  no_id,
  COUNT(DISTINCT calibration_id) as calibration_count,
  STRING_AGG(calibration_id, ', ') as calibration_ids,
  STRING_AGG(DISTINCT due_date, ', ') as due_dates
FROM kalibrasi
GROUP BY no_id
HAVING COUNT(DISTINCT calibration_id) > 1
ORDER BY calibration_count DESC
LIMIT 20;


-- ============================================================
-- 4. MULTI-YEAR SCHEDULES: Apakah ini yang menyebabkan discrepancy?
-- ============================================================

-- List all multi-year calibrations
SELECT 
  k.no_id,
  k.calibration_id,
  k.description,
  k.int as interval_months,
  k.due_date,
  d.status as equipment_status,
  CASE 
    WHEN k.int LIKE '%year%' THEN 
      CAST(REGEXP_REPLACE(k.int, '[^0-9]', '', 'g') AS INTEGER) * 12
    WHEN k.int ~ '^[0-9]+$' THEN 
      CAST(k.int AS INTEGER)
    ELSE 
      12
  END as calculated_interval_months,
  CASE 
    WHEN k.int IS NULL OR k.int = '12' OR k.int LIKE '1 year%' THEN 'Yearly (every year)'
    WHEN k.int LIKE '%year%' THEN 'Multi-year (' || k.int || ')'
    WHEN CAST(k.int AS INTEGER) > 12 THEN 'Multi-year (' || k.int || ' months)'
    ELSE 'Less than yearly'
  END as schedule_type
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE k.int IS NOT NULL 
  AND (
    k.int != '12' 
    OR k.int LIKE '%year%' 
    OR (k.int ~ '^[0-9]+$' AND CAST(k.int AS INTEGER) > 12)
  )
ORDER BY 
  CASE 
    WHEN k.int LIKE '%year%' THEN 
      CAST(REGEXP_REPLACE(k.int, '[^0-9]', '', 'g') AS INTEGER) * 12
    WHEN k.int ~ '^[0-9]+$' THEN 
      CAST(k.int AS INTEGER)
    ELSE 
      12
  END DESC;


-- ============================================================
-- 5. SPECIFIC MONTH CHECK: August 2026 Example
-- ============================================================

-- August calibrations detail
SELECT 
  k.no_id,
  k.calibration_id,
  k.description,
  k.due_date,
  k.int as interval,
  d.status as equipment_status,
  CASE 
    WHEN (d.status IS NULL OR d.status != 'obsolete') THEN 'Active'
    ELSE 'Obsolete (excluded)'
  END as filter_status,
  -- Check if there's a log for August 2026
  (SELECT COUNT(*) 
   FROM logaktivitas l 
   WHERE l.calibration_id = k.calibration_id 
     AND l.jenis = 'Kalibrasi'
     AND l.execute_date LIKE '2026-08%'
  ) as august_2026_logs
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE k.due_date LIKE '%Aug%'
ORDER BY k.no_id;


-- ============================================================
-- 6. COMPARISON: Dashboard total vs Actual unique calibrations
-- ============================================================

WITH dashboard_calculation AS (
  -- Simulate dashboard: count per month, then sum
  SELECT 
    CASE 
      WHEN k.due_date LIKE '%Jan%' THEN 'January'
      WHEN k.due_date LIKE '%Feb%' THEN 'February'
      WHEN k.due_date LIKE '%Mar%' THEN 'March'
      WHEN k.due_date LIKE '%Apr%' THEN 'April'
      WHEN k.due_date LIKE '%May%' THEN 'May'
      WHEN k.due_date LIKE '%Jun%' THEN 'June'
      WHEN k.due_date LIKE '%Jul%' THEN 'July'
      WHEN k.due_date LIKE '%Aug%' THEN 'August'
      WHEN k.due_date LIKE '%Sep%' THEN 'September'
      WHEN k.due_date LIKE '%Oct%' THEN 'October'
      WHEN k.due_date LIKE '%Nov%' THEN 'November'
      WHEN k.due_date LIKE '%Dec%' THEN 'December'
    END as month,
    COUNT(DISTINCT k.calibration_id) as count
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
  GROUP BY 
    CASE 
      WHEN k.due_date LIKE '%Jan%' THEN 'January'
      WHEN k.due_date LIKE '%Feb%' THEN 'February'
      WHEN k.due_date LIKE '%Mar%' THEN 'March'
      WHEN k.due_date LIKE '%Apr%' THEN 'April'
      WHEN k.due_date LIKE '%May%' THEN 'May'
      WHEN k.due_date LIKE '%Jun%' THEN 'June'
      WHEN k.due_date LIKE '%Jul%' THEN 'July'
      WHEN k.due_date LIKE '%Aug%' THEN 'August'
      WHEN k.due_date LIKE '%Sep%' THEN 'September'
      WHEN k.due_date LIKE '%Oct%' THEN 'October'
      WHEN k.due_date LIKE '%Nov%' THEN 'November'
      WHEN k.due_date LIKE '%Dec%' THEN 'December'
    END
),
actual_unique AS (
  -- Count unique calibrations (no double counting)
  SELECT COUNT(DISTINCT calibration_id) as unique_count
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.calibration_id IS NOT NULL
)
SELECT 
  (SELECT SUM(count) FROM dashboard_calculation) as dashboard_total,
  (SELECT unique_count FROM actual_unique) as actual_unique_calibrations,
  (SELECT SUM(count) FROM dashboard_calculation) - (SELECT unique_count FROM actual_unique) as difference,
  CASE 
    WHEN (SELECT SUM(count) FROM dashboard_calculation) > (SELECT unique_count FROM actual_unique) THEN
      '⚠️ Dashboard OVER-COUNTS (possible duplicate counting)'
    WHEN (SELECT SUM(count) FROM dashboard_calculation) < (SELECT unique_count FROM actual_unique) THEN
      '⚠️ Dashboard UNDER-COUNTS (some schedules not counted)'
    ELSE
      '✅ Dashboard count MATCHES actual data'
  END as status,
  CASE 
    WHEN (SELECT SUM(count) FROM dashboard_calculation) > (SELECT unique_count FROM actual_unique) THEN
      'Possible cause: Same calibration scheduled multiple times per year, or duplicate entries'
    WHEN (SELECT SUM(count) FROM dashboard_calculation) < (SELECT unique_count FROM actual_unique) THEN
      'Possible cause: Some calibrations have invalid or missing due_date'
    ELSE
      'No issue detected'
  END as possible_cause;


-- ============================================================
-- 7. FIND ROOT CAUSE: Calibrations scheduled multiple times per year
-- ============================================================

-- Find calibrations that appear in multiple months
WITH cal_monthly AS (
  SELECT 
    k.calibration_id,
    k.no_id,
    k.description,
    CASE 
      WHEN k.due_date LIKE '%Jan%' THEN 'January'
      WHEN k.due_date LIKE '%Feb%' THEN 'February'
      WHEN k.due_date LIKE '%Mar%' THEN 'March'
      WHEN k.due_date LIKE '%Apr%' THEN 'April'
      WHEN k.due_date LIKE '%May%' THEN 'May'
      WHEN k.due_date LIKE '%Jun%' THEN 'June'
      WHEN k.due_date LIKE '%Jul%' THEN 'July'
      WHEN k.due_date LIKE '%Aug%' THEN 'August'
      WHEN k.due_date LIKE '%Sep%' THEN 'September'
      WHEN k.due_date LIKE '%Oct%' THEN 'October'
      WHEN k.due_date LIKE '%Nov%' THEN 'November'
      WHEN k.due_date LIKE '%Dec%' THEN 'December'
    END as month,
    k.due_date,
    k.int
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.calibration_id IS NOT NULL
)
SELECT 
  calibration_id,
  no_id,
  description,
  COUNT(DISTINCT month) as months_scheduled,
  STRING_AGG(DISTINCT month, ', ' ORDER BY month) as all_months,
  STRING_AGG(DISTINCT due_date, ', ') as due_dates,
  MAX(int) as interval
FROM cal_monthly
GROUP BY calibration_id, no_id, description
HAVING COUNT(DISTINCT month) > 1
ORDER BY months_scheduled DESC, calibration_id;


-- ============================================================
-- 8. SOLUTION CHECK: Expected behavior
-- ============================================================

-- Expected: Each calibration should appear in ONE month per year
-- (unless it's a 6-monthly or quarterly schedule)

SELECT 
  CASE 
    WHEN k.int = '6' OR k.int LIKE '%6 month%' THEN '6-Monthly (should appear 2x/year)'
    WHEN k.int = '3' OR k.int LIKE '%3 month%' OR k.int LIKE '%quarter%' THEN 'Quarterly (should appear 4x/year)'
    WHEN k.int = '12' OR k.int LIKE '%year%' OR k.int IS NULL THEN 'Yearly (should appear 1x/year)'
    ELSE 'Other interval: ' || k.int
  END as expected_frequency,
  COUNT(DISTINCT k.calibration_id) as calibration_count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete')
GROUP BY 
  CASE 
    WHEN k.int = '6' OR k.int LIKE '%6 month%' THEN '6-Monthly (should appear 2x/year)'
    WHEN k.int = '3' OR k.int LIKE '%3 month%' OR k.int LIKE '%quarter%' THEN 'Quarterly (should appear 4x/year)'
    WHEN k.int = '12' OR k.int LIKE '%year%' OR k.int IS NULL THEN 'Yearly (should appear 1x/year)'
    ELSE 'Other interval: ' || k.int
  END
ORDER BY calibration_count DESC;


-- ============================================================
-- SUMMARY & RECOMMENDATION
-- ============================================================

SELECT 
  '🔍 DIAGNOSTIC COMPLETE' as status,
  'Check query results above to identify the root cause:' as instructions,
  '1. Compare Method 1 vs Method 4 to see the discrepancy' as step_1,
  '2. Check DUPLICATE CHECK to find duplicate calibration_ids' as step_2,
  '3. Review MULTI-YEAR SCHEDULES to understand complex schedules' as step_3,
  '4. Look at ROOT CAUSE query to find calibrations in multiple months' as step_4,
  '5. Review SOLUTION CHECK to understand expected behavior' as step_5;

-- ============================================================
-- END OF DIAGNOSTIC
-- ============================================================
