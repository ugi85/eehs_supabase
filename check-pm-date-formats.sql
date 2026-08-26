-- ===================================================================
-- CHECK PM DATE FORMATS - August 2026
-- ===================================================================

-- 1. Show ACTUAL date format dari PM logs August 2026
SELECT 
  no,
  no_id,
  execute_date,
  execute_date::text as date_string,
  LENGTH(execute_date::text) as string_length,
  pg_typeof(execute_date) as column_type,
  CASE 
    WHEN execute_date::text LIKE '2026-08-%' THEN '✅ Match: 2026-08-'
    WHEN execute_date::text LIKE '%2026-08%' THEN '⚠️ Contains: 2026-08'
    WHEN execute_date::text LIKE '%08%2026%' THEN '⚠️ Format: MM-YYYY'
    ELSE '❌ NO MATCH'
  END as string_match_test,
  EXTRACT(MONTH FROM execute_date) as month_num,
  EXTRACT(YEAR FROM execute_date) as year_num
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
ORDER BY execute_date
LIMIT 20;

-- 2. Group by date format pattern
SELECT 
  CASE 
    WHEN execute_date::text ~ '^\d{4}-\d{2}-\d{2}$' THEN 'YYYY-MM-DD (Date only)'
    WHEN execute_date::text ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}' THEN 'YYYY-MM-DD HH:MM (DateTime)'
    WHEN execute_date::text ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}' THEN 'YYYY-MM-DDTHH:MM (ISO)'
    WHEN execute_date::text ~ '^\d{2}/\d{2}/\d{4}' THEN 'DD/MM/YYYY'
    ELSE 'Other format: ' || LEFT(execute_date::text, 20)
  END as date_format,
  COUNT(*) as count_logs,
  MIN(execute_date) as sample_date
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
GROUP BY date_format
ORDER BY count_logs DESC;

-- 3. Compare Kalibrasi vs PM date formats
SELECT 
  'Kalibrasi' as jenis_type,
  LEFT(execute_date::text, 30) as sample_date_format,
  COUNT(*) as count_similar
FROM logaktivitas
WHERE jenis = 'Kalibrasi'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
GROUP BY LEFT(execute_date::text, 30)
LIMIT 5

UNION ALL

SELECT 
  'PM' as jenis_type,
  LEFT(execute_date::text, 30) as sample_date_format,
  COUNT(*) as count_similar
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
GROUP BY LEFT(execute_date::text, 30)
LIMIT 5;

-- 4. TEST: Check which filter method works
WITH pm_august AS (
  SELECT 
    no,
    execute_date,
    execute_date::text as date_str
  FROM logaktivitas
  WHERE jenis = 'PM'
    AND EXTRACT(YEAR FROM execute_date) = 2026
    AND EXTRACT(MONTH FROM execute_date) = 8
  LIMIT 100
)
SELECT 
  COUNT(*) as total_logs,
  COUNT(CASE WHEN date_str LIKE '2026-08%' THEN 1 END) as match_simple_like,
  COUNT(CASE WHEN date_str LIKE '%2026-08%' THEN 1 END) as match_contains,
  COUNT(CASE WHEN date_str ~ '2026[-/]08[-/]' THEN 1 END) as match_regex,
  COUNT(CASE WHEN EXTRACT(MONTH FROM execute_date) = 8 THEN 1 END) as match_extract
FROM pm_august;

-- 5. Show first 10 PM logs with all test results
SELECT 
  no,
  execute_date,
  execute_date::text as date_string,
  -- Test 1: Simple includes
  CASE WHEN execute_date::text LIKE '%2026-08%' THEN '✅' ELSE '❌' END as test_includes,
  -- Test 2: Regex
  CASE WHEN execute_date::text ~ '2026[-/]08[-/]' THEN '✅' ELSE '❌' END as test_regex,
  -- Test 3: Extract
  CASE WHEN EXTRACT(MONTH FROM execute_date) = 8 AND EXTRACT(YEAR FROM execute_date) = 2026 THEN '✅' ELSE '❌' END as test_extract
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
ORDER BY no
LIMIT 10;

-- ===================================================================
-- INTERPRETATION:
-- - Query #1: Shows actual date format
-- - Query #2: Groups by format pattern
-- - Query #3: Compares Kalibrasi vs PM formats
-- - Query #4: Tests which filter method catches most logs
-- - Query #5: Individual test results
-- ===================================================================
