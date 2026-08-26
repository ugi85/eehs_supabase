-- ===================================================================
-- CHECK PM DATE FORMAT & COUNT - August 2026
-- ===================================================================

-- 1. Count semua PM logs di 2026
SELECT 
  EXTRACT(MONTH FROM execute_date) as month_num,
  TO_CHAR(execute_date, 'Month') as month_name,
  COUNT(*) as pm_count
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
GROUP BY EXTRACT(MONTH FROM execute_date), TO_CHAR(execute_date, 'Month')
ORDER BY month_num;

-- 2. Detail PM logs di August 2026 dengan berbagai format check
SELECT 
  no,
  no_id,
  execute_date,
  execute_date::text as date_string,
  LENGTH(execute_date::text) as string_length,
  CASE 
    WHEN execute_date::text LIKE '2026-08-%' THEN 'Match: 2026-08-'
    WHEN execute_date::text LIKE '%2026-08%' THEN 'Match: %2026-08%'
    WHEN EXTRACT(MONTH FROM execute_date) = 8 AND EXTRACT(YEAR FROM execute_date) = 2026 THEN 'Match: Date Extract'
    ELSE 'NO MATCH'
  END as match_test,
  created_at
FROM logaktivitas
WHERE jenis = 'PM'
  AND (
    execute_date::text LIKE '%2026-08%'
    OR (EXTRACT(MONTH FROM execute_date) = 8 AND EXTRACT(YEAR FROM execute_date) = 2026)
  )
ORDER BY execute_date;

-- 3. Sample beberapa PM logs untuk check format
SELECT 
  no,
  no_id,
  jenis,
  execute_date,
  execute_date::text as date_as_text,
  pg_typeof(execute_date) as column_type
FROM logaktivitas
WHERE jenis = 'PM'
ORDER BY execute_date DESC
LIMIT 20;

-- 4. Cari PM logs yang mungkin ter-miss oleh filter
SELECT 
  COUNT(*) as total_pm_august,
  COUNT(CASE WHEN execute_date::text LIKE '2026-08%' THEN 1 END) as matched_by_string,
  COUNT(CASE WHEN EXTRACT(MONTH FROM execute_date) = 8 AND EXTRACT(YEAR FROM execute_date) = 2026 THEN 1 END) as matched_by_extract,
  COUNT(*) - COUNT(CASE WHEN execute_date::text LIKE '2026-08%' THEN 1 END) as missed_by_string
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8;

-- 5. Check if there's timezone or time component issue
SELECT 
  execute_date,
  execute_date::date as date_only,
  execute_date::time as time_only,
  CASE 
    WHEN execute_date::text ~ '^\d{4}-\d{2}-\d{2}$' THEN 'Date Only (YYYY-MM-DD)'
    WHEN execute_date::text ~ '^\d{4}-\d{2}-\d{2} ' THEN 'Date + Time'
    WHEN execute_date::text ~ 'T\d{2}:\d{2}' THEN 'ISO Format with T'
    ELSE 'Other Format'
  END as format_type
FROM logaktivitas
WHERE jenis = 'PM'
  AND EXTRACT(YEAR FROM execute_date) = 2026
  AND EXTRACT(MONTH FROM execute_date) = 8
LIMIT 10;
