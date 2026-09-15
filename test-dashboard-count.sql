-- ============================================
-- Test Dashboard Count Fix
-- ============================================
-- Purpose: Verify that unique count logic works correctly
-- Run this in Supabase SQL Editor

-- ============================================
-- Query 1: THE TRUTH - Unique Calibration Schedules
-- ============================================
-- This is the source of truth - what dashboard SHOULD show

SELECT 
    COUNT(DISTINCT k.id) as total_unique_schedules,
    'This is what dashboard should display' as note
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false;

-- Expected: 950 (or thereabouts)
-- This is your baseline


-- ============================================
-- Query 2: THE BUG - Sum of Monthly Counts (Old Logic)
-- ============================================
-- This shows what the old buggy logic would calculate
-- It double-counts 6-monthly schedules

WITH monthly_counts AS (
    SELECT 
        CASE 
            WHEN k.due_date ILIKE '%Jan%' THEN 'Jan'
            WHEN k.due_date ILIKE '%Feb%' THEN 'Feb'
            WHEN k.due_date ILIKE '%Mar%' THEN 'Mar'
            WHEN k.due_date ILIKE '%Apr%' THEN 'Apr'
            WHEN k.due_date ILIKE '%May%' THEN 'May'
            WHEN k.due_date ILIKE '%Jun%' THEN 'Jun'
            WHEN k.due_date ILIKE '%Jul%' THEN 'Jul'
            WHEN k.due_date ILIKE '%Aug%' THEN 'Aug'
            WHEN k.due_date ILIKE '%Sep%' THEN 'Sep'
            WHEN k.due_date ILIKE '%Oct%' THEN 'Oct'
            WHEN k.due_date ILIKE '%Nov%' THEN 'Nov'
            WHEN k.due_date ILIKE '%Dec%' THEN 'Dec'
        END as month,
        COUNT(*) as schedules_in_month
    FROM kalibrasi k
    JOIN daftaralat d ON k.id_alat = d.id_alat
    WHERE d.obsolete = false
    GROUP BY month
)
SELECT 
    SUM(schedules_in_month) as sum_of_monthly_counts,
    'This was the old buggy calculation (under-counts)' as note
FROM monthly_counts;

-- Expected: 929 or some number < 950
-- This is the BUG we fixed


-- ============================================
-- Query 3: Find 6-Monthly Schedules
-- ============================================
-- These schedules appear in 2 months but should count as 1

SELECT 
    k.id,
    k.id_alat,
    d.nama_alat,
    k.int,
    k.due_date,
    CASE 
        WHEN k.due_date LIKE '%,%' THEN 'Appears in 2 months'
        ELSE 'Appears in 1 month'
    END as frequency,
    -- Count how many months this schedule appears in
    CASE 
        WHEN k.due_date LIKE '%,%' THEN 2
        ELSE 1
    END as month_appearances
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE 
    d.obsolete = false
    AND (k.int = '6' OR k.int LIKE '%6%month%' OR k.due_date LIKE '%,%')
ORDER BY k.id;

-- Expected: Each schedule appears in 2 months but should count once
-- Count these schedules and multiply by 2 to see potential over-count


-- ============================================
-- Query 4: Detailed Breakdown by Interval
-- ============================================

SELECT 
    k.int as interval,
    COUNT(DISTINCT k.id) as unique_schedules,
    -- Count how many monthly "slots" these take up
    SUM(CASE WHEN k.due_date LIKE '%,%' THEN 2 ELSE 1 END) as monthly_slot_count,
    -- Difference shows the double-counting issue
    SUM(CASE WHEN k.due_date LIKE '%,%' THEN 2 ELSE 1 END) - COUNT(DISTINCT k.id) as double_count_impact
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false
GROUP BY k.int
ORDER BY unique_schedules DESC;

-- Interpretation:
-- - unique_schedules = true count
-- - monthly_slot_count = how many times they appear across 12 months
-- - double_count_impact = how much old logic would over-count


-- ============================================
-- Query 5: Find the 21 Missing Schedules (950 - 929)
-- ============================================
-- This identifies which schedules were being under-counted

WITH all_schedules AS (
    SELECT DISTINCT k.id
    FROM kalibrasi k
    JOIN daftaralat d ON k.id_alat = d.id_alat
    WHERE d.obsolete = false
),
schedules_with_months AS (
    SELECT DISTINCT k.id
    FROM kalibrasi k
    JOIN daftaralat d ON k.id_alat = d.id_alat
    WHERE 
        d.obsolete = false
        AND (
            k.due_date ILIKE '%Jan%' OR
            k.due_date ILIKE '%Feb%' OR
            k.due_date ILIKE '%Mar%' OR
            k.due_date ILIKE '%Apr%' OR
            k.due_date ILIKE '%May%' OR
            k.due_date ILIKE '%Jun%' OR
            k.due_date ILIKE '%Jul%' OR
            k.due_date ILIKE '%Aug%' OR
            k.due_date ILIKE '%Sep%' OR
            k.due_date ILIKE '%Oct%' OR
            k.due_date ILIKE '%Nov%' OR
            k.due_date ILIKE '%Dec%'
        )
)
SELECT 
    a.id as schedule_id,
    k.id_alat,
    d.nama_alat,
    k.int,
    k.due_date,
    k.created_at,
    'Missing from monthly count' as issue
FROM all_schedules a
LEFT JOIN schedules_with_months s ON a.id = s.id
JOIN kalibrasi k ON a.id = k.id
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE s.id IS NULL
ORDER BY k.id;

-- Expected: These are schedules with invalid/missing due_date
-- They exist but don't match any month pattern


-- ============================================
-- Query 6: Validation - Check due_date Formats
-- ============================================

SELECT 
    k.due_date,
    COUNT(*) as count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM kalibrasi k2 
                        JOIN daftaralat d2 ON k2.id_alat = d2.id_alat 
                        WHERE d2.obsolete = false) as percentage,
    CASE 
        WHEN k.due_date SIMILAR TO '%(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)%' 
        THEN 'Valid month name'
        WHEN k.due_date IS NULL THEN 'NULL'
        ELSE 'Invalid format'
    END as validation
FROM kalibrasi k
JOIN daftaralat d ON k.id_alat = d.id_alat
WHERE d.obsolete = false
GROUP BY k.due_date
ORDER BY count DESC;

-- Expected: Most should be "Valid month name"
-- Any "Invalid format" or "NULL" won't be counted in monthly logic


-- ============================================
-- Query 7: Compare Old vs New Logic Side-by-Side
-- ============================================

WITH truth AS (
    SELECT COUNT(DISTINCT k.id) as count
    FROM kalibrasi k
    JOIN daftaralat d ON k.id_alat = d.id_alat
    WHERE d.obsolete = false
),
old_logic AS (
    SELECT SUM(monthly) as count
    FROM (
        SELECT COUNT(*) as monthly
        FROM kalibrasi k
        JOIN daftaralat d ON k.id_alat = d.id_alat
        WHERE d.obsolete = false AND k.due_date ILIKE '%Jan%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Feb%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Mar%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Apr%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%May%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Jun%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Jul%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Aug%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Sep%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Oct%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Nov%'
        UNION ALL SELECT COUNT(*) FROM kalibrasi k JOIN daftaralat d ON k.id_alat = d.id_alat WHERE d.obsolete = false AND k.due_date ILIKE '%Dec%'
    ) monthly_sums
),
obsolete_check AS (
    SELECT COUNT(*) as count
    FROM daftaralat
    WHERE obsolete = true
)
SELECT 
    'Truth (Unique Count)' as method,
    truth.count as value,
    'What dashboard should show' as note
FROM truth
UNION ALL
SELECT 
    'Old Logic (Sum of Monthly)' as method,
    old_logic.count as value,
    'Old buggy calculation' as note
FROM old_logic
UNION ALL
SELECT 
    'Difference' as method,
    truth.count - old_logic.count as value,
    'Missing schedules in old logic' as note
FROM truth, old_logic
UNION ALL
SELECT 
    'Obsolete Equipment' as method,
    obsolete_check.count as value,
    'Excluded from all counts' as note
FROM obsolete_check;


-- ============================================
-- Query 8: Real-time Dashboard Calculation Test
-- ============================================
-- This simulates EXACTLY what getTotalSchedules() does

WITH yearly_kalibrasi AS (
    -- Get unique calibration IDs using Set logic
    SELECT DISTINCT k.id as calibration_id
    FROM kalibrasi k
    JOIN daftaralat d ON k.id_alat = d.id_alat
    WHERE 
        d.obsolete = false
        AND k.due_date IS NOT NULL
        AND k.due_date != ''
)
SELECT 
    COUNT(DISTINCT calibration_id) as dashboard_should_show,
    'This is the new fixed calculation' as note
FROM yearly_kalibrasi;

-- This should match Query 1 result exactly


-- ============================================
-- INTERPRETATION GUIDE
-- ============================================
/*
EXPECTED RESULTS:
- Query 1 (Truth): 950 unique schedules
- Query 2 (Old Bug): 929 or less (under-count)
- Query 3: Shows 6-monthly schedules that appear in 2 months
- Query 4: Shows interval breakdown with double-count impact
- Query 5: Lists the 21 schedules that were missing (invalid due_date)
- Query 6: Validates due_date format quality
- Query 7: Side-by-side comparison showing the fix
- Query 8: Simulates the actual fixed dashboard calculation

VERIFICATION STEPS:
1. Run Query 1 → Note the number (e.g., 950)
2. Run Query 8 → Should match Query 1 exactly
3. Check dashboard total → Should match Query 1 and 8
4. Run Query 7 → See the before/after comparison

RED FLAGS:
❌ If Query 1 ≠ Query 8: Logic mismatch
❌ If dashboard total ≠ Query 1: Cache not cleared
❌ If Query 2 = Query 1: No 6-monthly schedules exist (unlikely)
❌ If Query 5 returns 0 rows: The 21 difference is from obsolete count, not invalid dates

SUCCESS CRITERIA:
✅ Query 1 = Query 8 = Dashboard total
✅ Query 1 > Query 2 (new logic counts more correctly)
✅ Query 5 explains what was missing
✅ No data loss (all valid schedules still appear)
*/
