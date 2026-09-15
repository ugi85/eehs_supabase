-- ============================================================
-- Find Missing 21 Kalibrasi Schedules
-- ============================================================
-- SQL shows 950, Dashboard shows 929 → Missing 21
-- This script finds which 21 schedules are excluded
-- ============================================================

-- ============================================================
-- 1. BASELINE: Total kalibrasi (should be 950)
-- ============================================================
SELECT 
  'Total kalibrasi in database' as description,
  COUNT(*) as count
FROM kalibrasi;

-- Expected: 950


-- ============================================================
-- 2. ACTIVE EQUIPMENT FILTER: Exclude obsolete
-- ============================================================
SELECT 
  'Kalibrasi for active equipment' as description,
  COUNT(DISTINCT k.calibration_id) as count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE (d.status IS NULL OR d.status != 'obsolete');

-- This should be close to 929 if obsolete filter is the issue


-- ============================================================
-- 3. CHECK OBSOLETE EQUIPMENT
-- ============================================================
SELECT 
  'Kalibrasi for OBSOLETE equipment (excluded)' as description,
  COUNT(DISTINCT k.calibration_id) as count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE d.status = 'obsolete';

-- Expected: ~21 (if this is the cause)


-- ============================================================
-- 4. CHECK MISSING DUE_DATE
-- ============================================================
SELECT 
  'Kalibrasi with NULL or empty due_date' as description,
  COUNT(DISTINCT calibration_id) as count
FROM kalibrasi
WHERE due_date IS NULL 
   OR TRIM(due_date) = '' 
   OR due_date = '-';

-- Schedules without due_date won't appear in any month


-- ============================================================
-- 5. CHECK MISSING NO_ID (orphan schedules)
-- ============================================================
SELECT 
  'Kalibrasi with no matching equipment' as description,
  COUNT(DISTINCT k.calibration_id) as count
FROM kalibrasi k
LEFT JOIN daftaralat d ON k.no_id = d.no_id
WHERE d.no_id IS NULL;

-- Schedules without equipment won't be counted


-- ============================================================
-- 6. MULTI-YEAR FILTER CHECK
-- ============================================================
-- Dashboard may filter out multi-year schedules in non-scheduled years

WITH multi_year_schedules AS (
  SELECT 
    k.calibration_id,
    k.no_id,
    k.due_date,
    k.int as interval_text,
    CASE 
      WHEN k.int LIKE '%year%' THEN 
        CAST(REGEXP_REPLACE(k.int, '[^0-9]', '', 'g') AS INTEGER)
      WHEN k.int ~ '^[0-9]+$' AND CAST(k.int AS INTEGER) > 12 THEN 
        CAST(k.int AS INTEGER) / 12
      ELSE 
        1
    END as interval_years
  FROM kalibrasi k
  WHERE k.int IS NOT NULL 
    AND (
      k.int LIKE '%year%' 
      OR (k.int ~ '^[0-9]+$' AND CAST(k.int AS INTEGER) > 12)
    )
)
SELECT 
  'Multi-year schedules (2+ years interval)' as description,
  COUNT(DISTINCT calibration_id) as count
FROM multi_year_schedules
WHERE interval_years >= 2;

-- Dashboard might exclude these if no recent execution


-- ============================================================
-- 7. FIND THE EXACT 21 MISSING SCHEDULES
-- ============================================================

-- Method: Find schedules that are in total (950) but NOT in monthly breakdown (929)

WITH all_calibrations AS (
  -- All 950 calibrations
  SELECT DISTINCT calibration_id, no_id, due_date, int
  FROM kalibrasi
  WHERE calibration_id IS NOT NULL
),
monthly_matched AS (
  -- Simulate dashboard monthly matching (this should give 929)
  SELECT DISTINCT k.calibration_id
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
    AND k.calibration_id IS NOT NULL
    AND (
      k.due_date LIKE '%Jan%' OR
      k.due_date LIKE '%Feb%' OR
      k.due_date LIKE '%Mar%' OR
      k.due_date LIKE '%Apr%' OR
      k.due_date LIKE '%May%' OR
      k.due_date LIKE '%Jun%' OR
      k.due_date LIKE '%Jul%' OR
      k.due_date LIKE '%Aug%' OR
      k.due_date LIKE '%Sep%' OR
      k.due_date LIKE '%Oct%' OR
      k.due_date LIKE '%Nov%' OR
      k.due_date LIKE '%Dec%'
    )
)
SELECT 
  a.calibration_id,
  a.no_id,
  a.due_date,
  a.int as interval,
  d.status as equipment_status,
  CASE 
    WHEN d.status = 'obsolete' THEN 'Obsolete equipment'
    WHEN a.due_date IS NULL THEN 'Missing due_date'
    WHEN a.due_date = '-' OR TRIM(a.due_date) = '' THEN 'Invalid due_date'
    WHEN d.no_id IS NULL THEN 'No matching equipment'
    WHEN NOT (
      a.due_date LIKE '%Jan%' OR a.due_date LIKE '%Feb%' OR a.due_date LIKE '%Mar%' OR
      a.due_date LIKE '%Apr%' OR a.due_date LIKE '%May%' OR a.due_date LIKE '%Jun%' OR
      a.due_date LIKE '%Jul%' OR a.due_date LIKE '%Aug%' OR a.due_date LIKE '%Sep%' OR
      a.due_date LIKE '%Oct%' OR a.due_date LIKE '%Nov%' OR a.due_date LIKE '%Dec%'
    ) THEN 'Due date has no valid month abbreviation'
    ELSE 'Unknown reason'
  END as exclusion_reason
FROM all_calibrations a
LEFT JOIN daftaralat d ON a.no_id = d.no_id
WHERE a.calibration_id NOT IN (SELECT calibration_id FROM monthly_matched)
ORDER BY exclusion_reason, a.calibration_id
LIMIT 50;

-- This shows the exact schedules that are missing from dashboard


-- ============================================================
-- 8. BREAKDOWN BY EXCLUSION REASON
-- ============================================================

WITH all_calibrations AS (
  SELECT DISTINCT calibration_id, no_id, due_date, int
  FROM kalibrasi
  WHERE calibration_id IS NOT NULL
),
monthly_matched AS (
  SELECT DISTINCT k.calibration_id
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
    AND k.calibration_id IS NOT NULL
    AND (
      k.due_date LIKE '%Jan%' OR k.due_date LIKE '%Feb%' OR k.due_date LIKE '%Mar%' OR
      k.due_date LIKE '%Apr%' OR k.due_date LIKE '%May%' OR k.due_date LIKE '%Jun%' OR
      k.due_date LIKE '%Jul%' OR k.due_date LIKE '%Aug%' OR k.due_date LIKE '%Sep%' OR
      k.due_date LIKE '%Oct%' OR k.due_date LIKE '%Nov%' OR k.due_date LIKE '%Dec%'
    )
),
excluded_schedules AS (
  SELECT 
    a.calibration_id,
    a.no_id,
    a.due_date,
    a.int,
    d.status as equipment_status,
    CASE 
      WHEN d.status = 'obsolete' THEN 'Obsolete equipment'
      WHEN a.due_date IS NULL THEN 'Missing due_date'
      WHEN a.due_date = '-' OR TRIM(a.due_date) = '' THEN 'Invalid due_date'
      WHEN d.no_id IS NULL THEN 'No matching equipment'
      WHEN NOT (
        a.due_date LIKE '%Jan%' OR a.due_date LIKE '%Feb%' OR a.due_date LIKE '%Mar%' OR
        a.due_date LIKE '%Apr%' OR a.due_date LIKE '%May%' OR a.due_date LIKE '%Jun%' OR
        a.due_date LIKE '%Jul%' OR a.due_date LIKE '%Aug%' OR a.due_date LIKE '%Sep%' OR
        a.due_date LIKE '%Oct%' OR a.due_date LIKE '%Nov%' OR a.due_date LIKE '%Dec%'
      ) THEN 'Due date has no valid month abbreviation'
      ELSE 'Unknown reason'
    END as exclusion_reason
  FROM all_calibrations a
  LEFT JOIN daftaralat d ON a.no_id = d.no_id
  WHERE a.calibration_id NOT IN (SELECT calibration_id FROM monthly_matched)
)
SELECT 
  exclusion_reason,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM excluded_schedules), 1) as percentage
FROM excluded_schedules
GROUP BY exclusion_reason
ORDER BY count DESC;

-- This shows WHY schedules are excluded


-- ============================================================
-- 9. CHECK FOR CASE SENSITIVITY ISSUES
-- ============================================================

-- Check if any due_date has lowercase months that won't match
SELECT 
  k.calibration_id,
  k.no_id,
  k.due_date,
  CASE 
    WHEN k.due_date LIKE '%jan%' AND k.due_date NOT LIKE '%Jan%' THEN 'jan (lowercase)'
    WHEN k.due_date LIKE '%feb%' AND k.due_date NOT LIKE '%Feb%' THEN 'feb (lowercase)'
    WHEN k.due_date LIKE '%mar%' AND k.due_date NOT LIKE '%Mar%' THEN 'mar (lowercase)'
    WHEN k.due_date LIKE '%apr%' AND k.due_date NOT LIKE '%Apr%' THEN 'apr (lowercase)'
    WHEN k.due_date LIKE '%may%' AND k.due_date NOT LIKE '%May%' THEN 'may (lowercase)'
    WHEN k.due_date LIKE '%jun%' AND k.due_date NOT LIKE '%Jun%' THEN 'jun (lowercase)'
    WHEN k.due_date LIKE '%jul%' AND k.due_date NOT LIKE '%Jul%' THEN 'jul (lowercase)'
    WHEN k.due_date LIKE '%aug%' AND k.due_date NOT LIKE '%Aug%' THEN 'aug (lowercase)'
    WHEN k.due_date LIKE '%sep%' AND k.due_date NOT LIKE '%Sep%' THEN 'sep (lowercase)'
    WHEN k.due_date LIKE '%oct%' AND k.due_date NOT LIKE '%Oct%' THEN 'oct (lowercase)'
    WHEN k.due_date LIKE '%nov%' AND k.due_date NOT LIKE '%Nov%' THEN 'nov (lowercase)'
    WHEN k.due_date LIKE '%dec%' AND k.due_date NOT LIKE '%Dec%' THEN 'dec (lowercase)'
  END as case_issue
FROM kalibrasi k
WHERE 
  (k.due_date LIKE '%jan%' AND k.due_date NOT LIKE '%Jan%') OR
  (k.due_date LIKE '%feb%' AND k.due_date NOT LIKE '%Feb%') OR
  (k.due_date LIKE '%mar%' AND k.due_date NOT LIKE '%Mar%') OR
  (k.due_date LIKE '%apr%' AND k.due_date NOT LIKE '%Apr%') OR
  (k.due_date LIKE '%may%' AND k.due_date NOT LIKE '%May%') OR
  (k.due_date LIKE '%jun%' AND k.due_date NOT LIKE '%Jun%') OR
  (k.due_date LIKE '%jul%' AND k.due_date NOT LIKE '%Jul%') OR
  (k.due_date LIKE '%aug%' AND k.due_date NOT LIKE '%Aug%') OR
  (k.due_date LIKE '%sep%' AND k.due_date NOT LIKE '%Sep%') OR
  (k.due_date LIKE '%oct%' AND k.due_date NOT LIKE '%Oct%') OR
  (k.due_date LIKE '%nov%' AND k.due_date NOT LIKE '%Nov%') OR
  (k.due_date LIKE '%dec%' AND k.due_date NOT LIKE '%Dec%');

-- NOTE: Current code uses .toLowerCase() so this shouldn't be an issue


-- ============================================================
-- 10. VERIFICATION: Count monthly_matched (should be 929)
-- ============================================================

WITH monthly_matched AS (
  SELECT DISTINCT k.calibration_id
  FROM kalibrasi k
  LEFT JOIN daftaralat d ON k.no_id = d.no_id
  WHERE (d.status IS NULL OR d.status != 'obsolete')
    AND k.due_date IS NOT NULL
    AND k.calibration_id IS NOT NULL
    AND (
      k.due_date LIKE '%Jan%' OR k.due_date LIKE '%Feb%' OR k.due_date LIKE '%Mar%' OR
      k.due_date LIKE '%Apr%' OR k.due_date LIKE '%May%' OR k.due_date LIKE '%Jun%' OR
      k.due_date LIKE '%Jul%' OR k.due_date LIKE '%Aug%' OR k.due_date LIKE '%Sep%' OR
      k.due_date LIKE '%Oct%' OR k.due_date LIKE '%Nov%' OR k.due_date LIKE '%Dec%'
    )
)
SELECT 
  'Schedules matching dashboard logic' as description,
  COUNT(*) as count
FROM monthly_matched;

-- Expected: 929 (matches dashboard)


-- ============================================================
-- SUMMARY
-- ============================================================

SELECT 
  '🔍 INVESTIGATION SUMMARY' as title,
  '' as blank_line,
  'Run queries 1-10 above to find:' as instruction_1,
  '• Which 21 schedules are missing' as instruction_2,
  '• Why they are excluded' as instruction_3,
  '• Whether exclusion is correct or bug' as instruction_4;

-- ============================================================
-- END
-- ============================================================
