-- ============================================
-- Test Historical Filter Fix
-- ============================================
-- Purpose: Verify that created_at filtering works correctly
-- Run this in Supabase SQL Editor

-- ============================================
-- Query 1: Check Recent Imports (Last 30 Days)
-- ============================================
-- This shows data that was imported recently
-- These should NOT appear in historical periods before their created_at date

SELECT 
    d.id_alat,
    d.nama_alat,
    d.created_at as alat_created,
    d.created_by,
    k.id as kalibrasi_id,
    k.created_at as jadwal_created,
    k.due_date as jadwal_bulan,
    k.int as interval,
    EXTRACT(YEAR FROM k.created_at) as created_year,
    EXTRACT(MONTH FROM k.created_at) as created_month
FROM daftaralat d
LEFT JOIN kalibrasi k ON d.id_alat = k.id_alat
WHERE d.created_at > CURRENT_DATE - INTERVAL '30 days'
ORDER BY d.created_at DESC;

-- Expected: If you see data with created_at in September 2026
-- but due_date = 'Aug', it should NOT appear when filtering to August 2026


-- ============================================
-- Query 2: Test Case - August Schedule Imported in September
-- ============================================
-- Find schedules where:
-- - Schedule month is August (or earlier)
-- - But created_at is September or later

SELECT 
    k.id as kalibrasi_id,
    k.id_alat,
    d.nama_alat,
    k.due_date,
    k.created_at,
    EXTRACT(MONTH FROM k.created_at) as created_month_num,
    CASE 
        WHEN k.due_date ILIKE '%Aug%' THEN 'August'
        WHEN k.due_date ILIKE '%Jul%' THEN 'July'
        WHEN k.due_date ILIKE '%Jun%' THEN 'June'
        ELSE 'Other'
    END as schedule_month
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE 
    -- Schedule is for August or earlier
    (k.due_date ILIKE '%Aug%' OR k.due_date ILIKE '%Jul%' OR k.due_date ILIKE '%Jun%')
    -- But was created in September or later
    AND EXTRACT(MONTH FROM k.created_at) >= 9
    AND EXTRACT(YEAR FROM k.created_at) = 2026
ORDER BY k.created_at DESC;

-- Expected: These records should NOT appear in August 2026 filter
-- They should only appear from September 2026 onwards


-- ============================================
-- Query 3: Legacy Data Check (created_at NULL)
-- ============================================
-- Check if there's any legacy data without created_at

SELECT 
    'daftaralat' as table_name,
    COUNT(*) as null_created_at_count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM daftaralat) as percentage
FROM daftaralat
WHERE created_at IS NULL

UNION ALL

SELECT 
    'kalibrasi' as table_name,
    COUNT(*) as null_created_at_count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM kalibrasi) as percentage
FROM kalibrasi
WHERE created_at IS NULL;

-- Expected: If count > 0, these legacy records should still appear in all periods


-- ============================================
-- Query 4: Simulate Filter Logic
-- ============================================
-- This simulates what the API does when filtering for August 2026

WITH period_params AS (
    SELECT 
        2026 as selected_year,
        8 as selected_month -- August
)
SELECT 
    k.id,
    d.nama_alat,
    k.due_date,
    k.created_at,
    -- Check if schedule matches August
    CASE 
        WHEN k.due_date ILIKE '%Aug%' THEN true 
        ELSE false 
    END as matches_august,
    -- Check if data existed before or during August 2026
    CASE 
        WHEN k.created_at IS NULL THEN true -- Legacy data
        WHEN k.created_at <= '2026-08-31 23:59:59' THEN true
        ELSE false
    END as valid_for_august,
    -- Final decision
    CASE 
        WHEN (k.due_date ILIKE '%Aug%') 
             AND (k.created_at IS NULL OR k.created_at <= '2026-08-31 23:59:59')
        THEN 'SHOULD APPEAR'
        WHEN (k.due_date ILIKE '%Aug%')
             AND (k.created_at > '2026-08-31 23:59:59')
        THEN 'SHOULD NOT APPEAR (BUG FIX)'
        ELSE 'NOT AUGUST SCHEDULE'
    END as decision
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false
ORDER BY k.created_at DESC NULLS LAST;


-- ============================================
-- Query 5: Count by Period and Created Date
-- ============================================
-- See how many schedules exist per month vs when they were created

SELECT 
    CASE 
        WHEN k.due_date ILIKE '%Jan%' THEN 'January'
        WHEN k.due_date ILIKE '%Feb%' THEN 'February'
        WHEN k.due_date ILIKE '%Mar%' THEN 'March'
        WHEN k.due_date ILIKE '%Apr%' THEN 'April'
        WHEN k.due_date ILIKE '%May%' THEN 'May'
        WHEN k.due_date ILIKE '%Jun%' THEN 'June'
        WHEN k.due_date ILIKE '%Jul%' THEN 'July'
        WHEN k.due_date ILIKE '%Aug%' THEN 'August'
        WHEN k.due_date ILIKE '%Sep%' THEN 'September'
        WHEN k.due_date ILIKE '%Oct%' THEN 'October'
        WHEN k.due_date ILIKE '%Nov%' THEN 'November'
        WHEN k.due_date ILIKE '%Dec%' THEN 'December'
    END as schedule_month,
    COUNT(*) as total_schedules,
    COUNT(CASE WHEN k.created_at IS NULL THEN 1 END) as legacy_null_count,
    COUNT(CASE WHEN EXTRACT(MONTH FROM k.created_at) <= 8 AND EXTRACT(YEAR FROM k.created_at) <= 2026 THEN 1 END) as created_before_sept,
    COUNT(CASE WHEN EXTRACT(MONTH FROM k.created_at) >= 9 AND EXTRACT(YEAR FROM k.created_at) = 2026 THEN 1 END) as created_in_sept_or_later
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false
GROUP BY schedule_month
ORDER BY 
    CASE schedule_month
        WHEN 'January' THEN 1
        WHEN 'February' THEN 2
        WHEN 'March' THEN 3
        WHEN 'April' THEN 4
        WHEN 'May' THEN 5
        WHEN 'June' THEN 6
        WHEN 'July' THEN 7
        WHEN 'August' THEN 8
        WHEN 'September' THEN 9
        WHEN 'October' THEN 10
        WHEN 'November' THEN 11
        WHEN 'December' THEN 12
    END;


-- ============================================
-- Query 6: Test Specific Equipment
-- ============================================
-- Replace 'EQUIPMENT_NAME' with actual equipment name to test

-- SELECT 
--     d.id_alat,
--     d.nama_alat,
--     d.created_at as alat_created,
--     k.id as kalibrasi_id,
--     k.due_date,
--     k.int,
--     k.created_at as jadwal_created,
--     CASE 
--         WHEN k.created_at IS NULL THEN 'Legacy (NULL)'
--         WHEN k.created_at <= '2026-08-31' THEN 'Valid for Aug 2026'
--         ELSE 'NOT valid for Aug 2026'
--     END as august_validity
-- FROM daftaralat d
-- LEFT JOIN kalibrasi k ON d.id_alat = k.id_alat
-- WHERE d.nama_alat ILIKE '%EQUIPMENT_NAME%'
-- ORDER BY k.created_at;


-- ============================================
-- INTERPRETATION GUIDE
-- ============================================
/*
Query 1: Shows recently imported data - check created_at dates
Query 2: Finds potential bug cases (past schedule, future import)
Query 3: Counts legacy data that should still work
Query 4: Simulates the actual filter logic with decision column
Query 5: Summary statistics per month
Query 6: Deep dive into specific equipment (uncomment and modify)

RED FLAGS:
- If Query 2 returns results, those should NOT appear in historical filters
- If Query 3 shows NULL created_at, verify those still appear in dashboard
- If Query 4 shows "SHOULD NOT APPEAR" in August filter, that's the fix working

WHAT TO LOOK FOR:
✅ Query 2 results don't appear in August 2026 filter
✅ Query 3 legacy data still appears in all periods
✅ Query 4 "SHOULD APPEAR" items are visible, "SHOULD NOT" are hidden
✅ No data mysteriously disappears from dashboard
*/
