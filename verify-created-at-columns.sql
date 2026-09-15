-- ============================================================
-- Verification Script: created_at Columns for Historical Filter
-- ============================================================
-- Purpose: Verify that audit trail columns exist and contain data
-- Run this in Supabase SQL Editor to check system readiness
-- Date: September 2026
-- ============================================================

-- ============================================================
-- 1. CHECK: Verify columns exist in daftaralat
-- ============================================================
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'daftaralat' 
  AND column_name IN ('created_at', 'updated_at', 'created_by', 'updated_by')
ORDER BY column_name;

-- Expected: 4 rows showing all audit columns
-- ✅ created_at  | timestamptz | NO  | now()
-- ✅ updated_at  | timestamptz | NO  | now()
-- ✅ created_by  | varchar     | YES | NULL
-- ✅ updated_by  | varchar     | YES | NULL


-- ============================================================
-- 2. CHECK: Verify columns exist in kalibrasi
-- ============================================================
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'kalibrasi' 
  AND column_name IN ('created_at', 'updated_at', 'created_by', 'updated_by')
ORDER BY column_name;

-- Expected: 4 rows showing all audit columns


-- ============================================================
-- 3. CHECK: Verify triggers are active
-- ============================================================
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%updated_at%'
  OR trigger_name LIKE '%audit%'
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- ✅ trg_daftaralat_updated_at
-- ✅ trg_kalibrasi_updated_at
-- ✅ trg_daftaralat_audit (optional - for audit log table)
-- ✅ trg_kalibrasi_audit (optional - for audit log table)


-- ============================================================
-- 4. DATA CHECK: Count rows with/without created_at
-- ============================================================

-- Daftar Alat
SELECT 
  'daftaralat' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_at) as rows_with_created_at,
  COUNT(*) - COUNT(created_at) as rows_without_created_at,
  ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) as percentage_complete
FROM daftaralat;

-- Kalibrasi
SELECT 
  'kalibrasi' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_at) as rows_with_created_at,
  COUNT(*) - COUNT(created_at) as rows_without_created_at,
  ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) as percentage_complete
FROM kalibrasi;

-- Expected: percentage_complete should be close to 100%
-- If low percentage, run migration to set default values


-- ============================================================
-- 5. DATA CHECK: Sample recent data
-- ============================================================

-- Recent daftaralat entries
SELECT 
  no_id,
  description,
  created_at,
  created_by,
  updated_at,
  updated_by
FROM daftaralat
WHERE created_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Recent kalibrasi entries
SELECT 
  no_id,
  calibration_id,
  description,
  created_at,
  created_by,
  updated_at,
  updated_by
FROM kalibrasi
WHERE created_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should see recent entries with created_at populated


-- ============================================================
-- 6. TEST QUERY: Historical filter simulation
-- ============================================================

-- Simulate August 2026 filter for PM
-- This should EXCLUDE equipment created after August 2026
SELECT 
  no_id,
  description,
  yearly,
  created_at,
  CASE 
    WHEN created_at IS NULL THEN 'legacy (will show)'
    WHEN created_at <= '2026-08-31 23:59:59'::timestamptz THEN 'valid (will show)'
    ELSE 'invalid (will NOT show)'
  END as filter_result
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (yearly LIKE '%Aug%' OR "6_monthly" LIKE '%Aug%')
  AND (status IS NULL OR status != 'obsolete')
ORDER BY created_at DESC NULLS LAST
LIMIT 20;

-- Expected: 
-- - Rows created before/during August 2026: 'valid (will show)'
-- - Rows created after August 2026: 'invalid (will NOT show)'
-- - Legacy rows (NULL created_at): 'legacy (will show)'


-- ============================================================
-- 7. TEST QUERY: Simulate September 2026 filter
-- ============================================================

SELECT 
  no_id,
  description,
  yearly,
  created_at,
  CASE 
    WHEN created_at IS NULL THEN 'legacy (will show)'
    WHEN created_at <= '2026-09-30 23:59:59'::timestamptz THEN 'valid (will show)'
    ELSE 'invalid (will NOT show)'
  END as filter_result
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (yearly LIKE '%Sep%' OR "6_monthly" LIKE '%Sep%')
  AND (status IS NULL OR status != 'obsolete')
ORDER BY created_at DESC NULLS LAST
LIMIT 20;


-- ============================================================
-- 8. DIAGNOSTIC: Find equipment that would be affected
-- ============================================================

-- Equipment created AFTER their scheduled month in 2026
-- These will NO LONGER appear in historical filters (correct behavior)
SELECT 
  d.no_id,
  d.description,
  d.yearly as yearly_schedule,
  d."6_monthly" as six_monthly_schedule,
  d.created_at,
  TO_CHAR(d.created_at, 'Month YYYY') as created_month,
  CASE 
    WHEN d.yearly LIKE '%Jan%' THEN 'January'
    WHEN d.yearly LIKE '%Feb%' THEN 'February'
    WHEN d.yearly LIKE '%Mar%' THEN 'March'
    WHEN d.yearly LIKE '%Apr%' THEN 'April'
    WHEN d.yearly LIKE '%May%' THEN 'May'
    WHEN d.yearly LIKE '%Jun%' THEN 'June'
    WHEN d.yearly LIKE '%Jul%' THEN 'July'
    WHEN d.yearly LIKE '%Aug%' THEN 'August'
    WHEN d.yearly LIKE '%Sep%' THEN 'September'
    WHEN d.yearly LIKE '%Oct%' THEN 'October'
    WHEN d.yearly LIKE '%Nov%' THEN 'November'
    WHEN d.yearly LIKE '%Dec%' THEN 'December'
  END as schedule_month
FROM daftaralat d
WHERE d.pm_yn = 'Y'
  AND d.created_at IS NOT NULL
  AND d.created_at > '2026-01-01'::timestamptz
  AND (
    (d.yearly LIKE '%Jan%' AND d.created_at > '2026-01-31 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Feb%' AND d.created_at > '2026-02-28 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Mar%' AND d.created_at > '2026-03-31 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Apr%' AND d.created_at > '2026-04-30 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%May%' AND d.created_at > '2026-05-31 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Jun%' AND d.created_at > '2026-06-30 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Jul%' AND d.created_at > '2026-07-31 23:59:59'::timestamptz) OR
    (d.yearly LIKE '%Aug%' AND d.created_at > '2026-08-31 23:59:59'::timestamptz)
  )
ORDER BY d.created_at DESC;

-- This query shows equipment that will be CORRECTLY excluded from past periods


-- ============================================================
-- 9. MIGRATION: Fix NULL created_at (if needed)
-- ============================================================

-- Only run this if step 4 shows low percentage_complete
-- This sets created_at to a default for legacy data

/*
UPDATE daftaralat 
SET 
  created_at = COALESCE(created_at, '2026-01-01 00:00:00'::timestamptz),
  created_by = COALESCE(created_by, 'migration')
WHERE created_at IS NULL;

UPDATE kalibrasi
SET 
  created_at = COALESCE(created_at, '2026-01-01 00:00:00'::timestamptz),
  created_by = COALESCE(created_by, 'migration')
WHERE created_at IS NULL;
*/

-- Verify migration success
-- SELECT COUNT(*) FROM daftaralat WHERE created_at IS NULL;  -- Should be 0
-- SELECT COUNT(*) FROM kalibrasi WHERE created_at IS NULL;   -- Should be 0


-- ============================================================
-- 10. SUMMARY REPORT
-- ============================================================

SELECT 
  'System Readiness Check' as report_title,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'daftaralat' AND column_name = 'created_at') as daftaralat_has_created_at,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'kalibrasi' AND column_name = 'created_at') as kalibrasi_has_created_at,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%updated_at%') as active_triggers,
  (SELECT ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) FROM daftaralat) as daftaralat_data_percentage,
  (SELECT ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) FROM kalibrasi) as kalibrasi_data_percentage,
  CASE 
    WHEN 
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'daftaralat' AND column_name = 'created_at') > 0
      AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'kalibrasi' AND column_name = 'created_at') > 0
      AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%updated_at%') >= 2
      AND (SELECT ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) FROM daftaralat) > 95
      AND (SELECT ROUND(100.0 * COUNT(created_at) / NULLIF(COUNT(*), 0), 2) FROM kalibrasi) > 95
    THEN '✅ READY - System is ready for historical filter fix'
    ELSE '⚠️ NOT READY - Please run migrations or check configuration'
  END as system_status;

-- Expected result:
-- ✅ READY - System is ready for historical filter fix

-- ============================================================
-- END OF VERIFICATION
-- ============================================================
