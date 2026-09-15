-- ============================================================
-- Debug: Why 929 instead of 950?
-- ============================================================
-- Facts:
-- - Total in DB: 950
-- - Obsolete equipment: 11
-- - Dashboard shows: 929
-- - Missing: 21 schedules
-- ============================================================

-- ============================================================
-- 1. BASELINE COUNTS
-- ============================================================

-- Total jadwal kalibrasi (should be 950)
SELECT 'Total kalibrasi in database' as metric, COUNT(*) as count
FROM kalibrasi;

-- Total equipment obsolete (should be 11)
SELECT 'Total obsolete equipment' as metric, COUNT(*) as count
FROM daftaralat
WHERE status = 'obsolete';

-- Jadwal kalibrasi untuk equipment obsolete
SELECT 'Kalibrasi for obsolete equipment' as metric, COUNT(DISTINCT k.calibration_id) as count
FROM kalibrasi k
INNER JOIN daftaralat d ON k.no_id = d.no_id
WHERE d.status = 'obsolete';

-- Jadwal kalibrasi untuk equipment AKTIF (should be close to 929)
SELECT 'Kalibrasi for ACTIVE equipment' as metric, COUNT(DISTINCT k.calibration_id) as count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete');


-- ============================================================
-- 2. CHECK: Apakah 929 dari SUM monthly atau UNIQUE count?
-- ============================================================

-- Method A: Sum of monthly counts (dashboard LAMA)
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
    END as month,
    COUNT(DISTINCT k.calibration_id) as count
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
  GROUP BY month
)
SELECT 
  'Method A: Sum of monthly counts' as method,
  SUM(count) as total
FROM monthly_counts;

-- Method B: Unique calibration_id count (dashboard BARU - after fix)
SELECT 
  'Method B: Unique calibration IDs' as method,
  COUNT(DISTINCT k.calibration_id) as total
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete')
  AND k.calibration_id IS NOT NULL;


-- ============================================================
-- 3. MONTHLY BREAKDOWN (detail per bulan)
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
    ELSE 'No valid month'
  END as month,
  COUNT(DISTINCT k.calibration_id) as count_in_month
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete')
GROUP BY month
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

-- ⚠️ NOTE: Jika SUM dari query ini = 929, berarti 929 adalah CORRECT!
-- Tapi jika SUM > 929, berarti ada double counting!


-- ============================================================
-- 4. FIND SCHEDULES IN MULTIPLE MONTHS
-- ============================================================

-- Schedules yang muncul di lebih dari 1 bulan (6-monthly, quarterly, dll)
SELECT 
  k.calibration_id,
  k.no_id,
  k.due_date,
  k.int as interval_text,
  -- Count berapa bulan jadwal ini muncul
  (CASE WHEN k.due_date LIKE '%Jan%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Feb%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Mar%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Apr%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%May%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Jun%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Jul%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Aug%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Sep%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Oct%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Nov%' THEN 1 ELSE 0 END +
   CASE WHEN k.due_date LIKE '%Dec%' THEN 1 ELSE 0 END) as appears_in_months,
  d.status as equipment_status
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete')
  AND (
    (k.due_date LIKE '%Jan%' AND 1=1) +
    (k.due_date LIKE '%Feb%' AND 1=1) +
    (k.due_date LIKE '%Mar%' AND 1=1) +
    (k.due_date LIKE '%Apr%' AND 1=1) +
    (k.due_date LIKE '%May%' AND 1=1) +
    (k.due_date LIKE '%Jun%' AND 1=1) +
    (k.due_date LIKE '%Jul%' AND 1=1) +
    (k.due_date LIKE '%Aug%' AND 1=1) +
    (k.due_date LIKE '%Sep%' AND 1=1) +
    (k.due_date LIKE '%Oct%' AND 1=1) +
    (k.due_date LIKE '%Nov%' AND 1=1) +
    (k.due_date LIKE '%Dec%' AND 1=1)
  ) > 1
ORDER BY appears_in_months DESC, k.calibration_id
LIMIT 50;

-- ⚠️ Jika ada hasil di sini, ini adalah schedules yang di-count 2x atau lebih!


-- ============================================================
-- 5. SUMMARY: Explain the 21 difference
-- ============================================================

WITH stats AS (
  SELECT 
    (SELECT COUNT(*) FROM kalibrasi) as total_in_db,
    (SELECT COUNT(DISTINCT k.calibration_id) 
     FROM kalibrasi k 
     INNER JOIN daftaralat d ON k.no_id = d.no_id 
     WHERE d.status = 'obsolete') as obsolete_count,
    (SELECT COUNT(DISTINCT k.calibration_id) 
     FROM kalibrasi k 
     LEFT JOIN daftaralat d ON k.no_id = d.no_id 
     WHERE (d.status IS NULL OR d.status != 'obsolete')
       AND k.calibration_id IS NOT NULL) as active_unique_count,
    (SELECT SUM(count) FROM (
      SELECT COUNT(DISTINCT k.calibration_id) as count
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
    ) monthly) as sum_of_monthly
)
SELECT 
  '🔍 SUMMARY' as analysis,
  total_in_db as total_in_database,
  obsolete_count as obsolete_schedules,
  active_unique_count as active_unique_schedules,
  sum_of_monthly as sum_of_monthly_counts,
  total_in_db - obsolete_count as expected_dashboard_count,
  929 as actual_dashboard_count,
  (total_in_db - obsolete_count) - 929 as difference,
  CASE 
    WHEN sum_of_monthly = 929 THEN 
      '✅ 929 is SUM of monthly (correct if no multi-month schedules)'
    WHEN active_unique_count = 929 THEN 
      '✅ 929 is UNIQUE count (correct, some schedules in multiple months)'
    WHEN active_unique_count > 929 THEN
      '⚠️ Dashboard UNDER-COUNTS: ' || (active_unique_count - 929)::text || ' schedules missing'
    WHEN active_unique_count < 929 THEN
      '⚠️ Dashboard OVER-COUNTS: counting ' || (929 - active_unique_count)::text || ' extra'
    ELSE
      '❓ Unknown scenario'
  END as diagnosis,
  CASE 
    WHEN sum_of_monthly > active_unique_count THEN
      'Some schedules appear in multiple months (6-monthly, quarterly, etc.)'
    WHEN sum_of_monthly < active_unique_count THEN
      'Some schedules have invalid due_date (not matching any month)'
    ELSE
      'All schedules appear exactly once per year'
  END as explanation
FROM stats;


-- ============================================================
-- 6. EXPECTED vs ACTUAL
-- ============================================================

SELECT 
  'Expected dashboard count' as metric,
  950 - (SELECT COUNT(DISTINCT k.calibration_id) 
         FROM kalibrasi k 
         INNER JOIN daftaralat d ON k.no_id = d.no_id 
         WHERE d.status = 'obsolete') as count,
  'Total minus obsolete' as formula
UNION ALL
SELECT 
  'Actual dashboard count' as metric,
  929 as count,
  'Current display' as formula
UNION ALL
SELECT 
  'Difference' as metric,
  950 - (SELECT COUNT(DISTINCT k.calibration_id) 
         FROM kalibrasi k 
         INNER JOIN daftaralat d ON k.no_id = d.no_id 
         WHERE d.status = 'obsolete') - 929 as count,
  'Expected - Actual' as formula;


-- ============================================================
-- 7. FINAL DIAGNOSIS
-- ============================================================

DO $$
DECLARE
  total_db INTEGER;
  obsolete_schedules INTEGER;
  unique_active INTEGER;
  sum_monthly INTEGER;
  expected_count INTEGER;
  actual_count INTEGER := 929;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_db FROM kalibrasi;
  
  SELECT COUNT(DISTINCT k.calibration_id) INTO obsolete_schedules
  FROM kalibrasi k 
  INNER JOIN daftaralat d ON k.no_id = d.no_id 
  WHERE d.status = 'obsolete';
  
  SELECT COUNT(DISTINCT k.calibration_id) INTO unique_active
  FROM kalibrasi k 
  LEFT JOIN daftaralat d ON k.no_id = d.no_id 
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.calibration_id IS NOT NULL;
  
  SELECT SUM(count) INTO sum_monthly FROM (
    SELECT COUNT(DISTINCT k.calibration_id) as count
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
  ) monthly_breakdown;
  
  expected_count := total_db - obsolete_schedules;
  
  -- Print diagnosis
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🔍 FINAL DIAGNOSIS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total in database: %', total_db;
  RAISE NOTICE 'Obsolete schedules: %', obsolete_schedules;
  RAISE NOTICE 'Expected dashboard: % (% - %)', expected_count, total_db, obsolete_schedules;
  RAISE NOTICE 'Actual dashboard: %', actual_count;
  RAISE NOTICE 'Difference: %', expected_count - actual_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Unique active schedules: %', unique_active;
  RAISE NOTICE 'Sum of monthly counts: %', sum_monthly;
  RAISE NOTICE '';
  
  IF sum_monthly = actual_count THEN
    RAISE NOTICE '✅ Dashboard is using SUM of monthly counts';
    IF sum_monthly < unique_active THEN
      RAISE NOTICE '⚠️  UNDER-COUNTING by % schedules', unique_active - sum_monthly;
      RAISE NOTICE '   Reason: Some schedules not matching any month filter';
    ELSIF sum_monthly > unique_active THEN
      RAISE NOTICE '✅ OVER-COUNTING by % (expected for multi-month schedules)', sum_monthly - unique_active;
      RAISE NOTICE '   This is CORRECT if you have 6-monthly or quarterly schedules';
    ELSE
      RAISE NOTICE '✅ No issues detected - counts match perfectly';
    END IF;
  ELSIF unique_active = actual_count THEN
    RAISE NOTICE '✅ Dashboard is using UNIQUE count (correct approach)';
  ELSE
    RAISE NOTICE '❓ Dashboard count (%) does not match any known method', actual_count;
    RAISE NOTICE '   Sum of monthly: %', sum_monthly;
    RAISE NOTICE '   Unique count: %', unique_active;
  END IF;
  
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================
-- END
-- ============================================================
