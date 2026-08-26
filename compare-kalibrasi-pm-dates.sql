-- ===================================================================
-- COMPARE: Kalibrasi vs PM Date Formats
-- ===================================================================

-- 1. Show sample dates from BOTH Kalibrasi and PM for August 2026
SELECT 
  'Kalibrasi' as log_type,
  no,
  execute_date,
  execute_date::text as date_as_string,
  LENGTH(execute_date::text) as string_length,
  pg_typeof(execute_date) as data_type
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
ORDER BY no
LIMIT 10

UNION ALL

SELECT 
  'PM' as log_type,
  no,
  execute_date,
  execute_date::text as date_as_string,
  LENGTH(execute_date::text) as string_length,
  pg_typeof(execute_date) as data_type
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
ORDER BY no
LIMIT 10;

-- 2. Check if date column type is the same
SELECT 
  jenis,
  pg_typeof(execute_date) as column_type,
  COUNT(*) as log_count,
  MIN(execute_date::text) as sample_min,
  MAX(execute_date::text) as sample_max
FROM logaktivitas
WHERE EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
  AND jenis IN ('Kalibrasi', 'PM')
GROUP BY jenis, pg_typeof(execute_date);

-- 3. Test string matching on actual data
WITH test_data AS (
  SELECT 
    no,
    jenis,
    execute_date,
    execute_date::text as date_str
  FROM logaktivitas
  WHERE EXTRACT(YEAR FROM execute_date) = 2026
    AND EXTRACT(MONTH FROM execute_date) = 8
    AND jenis IN ('Kalibrasi', 'PM')
)
SELECT 
  jenis,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN date_str LIKE '%2026-08%' THEN 1 END) as match_string_includes,
  COUNT(CASE WHEN date_str ~ '2026[-/]08' THEN 1 END) as match_regex,
  COUNT(CASE WHEN EXTRACT(MONTH FROM execute_date) = 8 THEN 1 END) as match_extract,
  -- Show why some don't match
  STRING_AGG(
    CASE 
      WHEN date_str NOT LIKE '%2026-08%' THEN 'NO_MATCH: ' || LEFT(date_str, 30)
      ELSE NULL
    END, 
    ' | '
  ) as non_matching_samples
FROM test_data
GROUP BY jenis;

-- 4. CRITICAL: Show ALL 56 PM dates to find the pattern
SELECT 
  no,
  no_id,
  execute_date,
  execute_date::text as date_string,
  CASE 
    WHEN execute_date::text LIKE '%2026-08%' THEN '✅ MATCH'
    ELSE '❌ NO MATCH: ' || execute_date::text
  END as match_status
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
ORDER BY no;
