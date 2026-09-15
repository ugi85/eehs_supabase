# Kalibrasi Count Fix

## 📊 Problem

**Reported Issue:**
- SQL Total: **950** jadwal kalibrasi
- Dashboard Display: **929** jadwal kalibrasi  
- **Discrepancy: -21** (Dashboard UNDER-COUNTS by 21 schedules)

---

## 🔍 Root Cause Analysis

### Initial Hypothesis
Dashboard was summing monthly counts, which could lead to:
- Over-counting if schedules appear in multiple months (e.g., 6-monthly: Jan + Jul)
- Under-counting if schedules are filtered out incorrectly

### Actual Finding
Dashboard shows **929**, which is **21 less** than actual **950**.

This suggests **filtering is too strict**, excluding valid schedules.

---

## 🎯 Possible Causes of Under-Count

### 1. **Obsolete Equipment Filter**
```javascript
// Current logic
if (statusMap[item.no_id] === 'obsolete') return false
```

**Check:** Are there 21 calibration schedules for obsolete equipment?

### 2. **Missing due_date**
```javascript
// Current logic
if (!item.due_date || !item.due_date.toLowerCase().includes(monthShort)) return false
```

**Check:** Are there 21 schedules with NULL or invalid `due_date`?

### 3. **Multi-Year Filter Logic**
```javascript
// Complex logic for 2-year, 3-year intervals
const intervalYears = Math.round(intervalMonths / 12)
// May exclude schedules if last execution is not found
```

**Check:** Are there 21 multi-year schedules being excluded incorrectly?

### 4. **No Matching Equipment (Orphan Schedules)**
```javascript
// Join with daftaralat
statusMap[item.no_id]
```

**Check:** Are there 21 calibration schedules where `no_id` doesn't exist in `daftaralat`?

### 5. **Invalid Month Abbreviation**
```javascript
// Matching logic
item.due_date.toLowerCase().includes('jan')
```

**Check:** Are there 21 schedules with non-standard month format?  
Examples: "01", "January-1", "JAN2026", etc.

---

## 🔧 Quick Fix Implemented

**File:** `src/api/supabase/logAktivitasApi.js`  
**Function:** `getTotalSchedules()`

### Change Summary

**Before:**
```javascript
const result = {
  success: true,
  // ❌ Sum of monthly counts (prone to double-counting or under-counting)
  totalKalibrasi: kalibrasiMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  kalibrasiMonthly,
  pmMonthly
}
```

**After:**
```javascript
// ✅ Calculate using unique calibration_ids
const statusMap = {}
;(alatData || []).forEach(d => { statusMap[d.no_id] = d.status })

const uniqueKalibrasiIds = new Set()
;(kalibrasiData || []).forEach(k => {
  // Only count active equipment
  if (statusMap[k.no_id] === 'obsolete') return
  if (!k.calibration_id) return
  uniqueKalibrasiIds.add(k.calibration_id)
})

const result = {
  success: true,
  // ✅ Use unique count (accurate, no double-counting)
  totalKalibrasi: uniqueKalibrasiIds.size,
  totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  kalibrasiMonthly,
  pmMonthly
}
```

### What This Fix Does

1. **Counts unique `calibration_id`** directly from raw data
2. **Excludes obsolete equipment** (correct behavior)
3. **Ignores monthly filter logic** for total count
4. **Prevents both under-counting and over-counting**

### Expected Result After Fix

```
SQL Total: 950
Dashboard Total: ~950 (depends on obsolete count)
```

If there are obsolete equipment:
```
Total in DB: 950
Obsolete: 21
Dashboard: 929 ✅ (correct if 21 are obsolete)
```

---

## 🧪 Testing & Verification

### Step 1: Run Investigation SQL

**File:** `find-missing-21-kalibrasi.sql`

```sql
-- Run Query #7 to find exact missing schedules
-- This will show why each of the 21 is excluded
```

**Expected output:**
```
exclusion_reason             | count
Obsolete equipment           | 21
Missing due_date             | 0
No matching equipment        | 0
Invalid due_date format      | 0
```

OR

```
exclusion_reason             | count
Obsolete equipment           | 15
Missing due_date             | 6
Total                        | 21
```

### Step 2: Verify Fix in Browser Console

After deploying the fix:

```javascript
// 1. Clear cache
localStorage.removeItem('dashboard_data_cache')

// 2. Reload dashboard
window.location.reload()

// 3. Check console logs
// Look for: [API] getTotalSchedules summary
// Should show:
//   totalKalibrasi: 929 (or 950 if no obsolete)
//   uniqueCalibrationIds: 929 (or 950)
//   totalKalibrasiFromSum: may differ
```

### Step 3: Compare Numbers

| Metric | SQL | Dashboard | Status |
|--------|-----|-----------|--------|
| Total in DB | 950 | - | - |
| Active equipment | 929? | 929 | ✅ Should match |
| Obsolete equipment | 21? | - | Excluded (correct) |

---

## 📋 Investigation Checklist

Run `find-missing-21-kalibrasi.sql` and complete:

### ☐ Query 1: Baseline
- [ ] Confirm total in DB = 950

### ☐ Query 2: Active Equipment Filter
- [ ] Count after excluding obsolete
- [ ] Should this be 929?

### ☐ Query 3: Obsolete Count
- [ ] How many calibrations for obsolete equipment?
- [ ] Is this the missing 21?

### ☐ Query 4: Missing due_date
- [ ] How many schedules have NULL due_date?

### ☐ Query 5: Orphan Schedules
- [ ] Any calibrations with no matching equipment?

### ☐ Query 7: Exact Missing Schedules
- [ ] List all 21 missing schedules
- [ ] Review exclusion_reason for each

### ☐ Query 8: Breakdown by Reason
- [ ] Summarize why schedules are excluded
- [ ] Determine if exclusions are correct

---

## ✅ Expected Outcomes

### Scenario A: 21 are Obsolete (CORRECT BEHAVIOR)
```
Total: 950
Obsolete: 21
Active: 929

Dashboard shows: 929 ✅ CORRECT
No fix needed (behavior is correct)
```

### Scenario B: 21 are NOT Obsolete (BUG - NEEDS FIX)
```
Total: 950
Obsolete: 0
Missing: 21 due to filter bug

Dashboard shows: 929 ❌ INCORRECT
After fix: should show 950
```

### Scenario C: Mixed Reasons
```
Total: 950
Obsolete: 15
Invalid due_date: 6
Total excluded: 21

Dashboard shows: 929 ⚠️ PARTIALLY CORRECT
Fix: Should still show 929 (if only valid active schedules)
But 6 with invalid due_date need data cleanup
```

---

## 🔧 Additional Fixes (If Needed)

### Fix 1: If Missing due_date is the Issue

**Add validation in import:**
```javascript
// In useExcelImport.js or jadwalKalibrasiApi.js
if (!item.due_date || item.due_date.trim() === '') {
  errors.push(`Calibration ${item.calibration_id}: due_date is required`)
}
```

### Fix 2: If Invalid Month Format

**Add normalization:**
```javascript
// Normalize month abbreviations
const monthMap = {
  'january': 'Jan', 'jan': 'Jan',
  'february': 'Feb', 'feb': 'Feb',
  // ... etc
}

// Before save
item.due_date = normalizeMonths(item.due_date)
```

### Fix 3: If Multi-Year Logic is Wrong

**Simplify logic in processMonthlyData:**
```javascript
// For 2026, include ALL schedules that match month
// Don't exclude based on last execution
const validItems = (kalibrasiData || []).filter(item => {
  if (!item.due_date.toLowerCase().includes(monthShort)) return false
  if (statusMap[item.no_id] === 'obsolete') return false
  // ✅ Remove complex multi-year logic for total count
  return true
})
```

---

## 📊 Monitoring After Fix

### Key Metrics to Watch

1. **Dashboard Total:**
   - Before: 929
   - After: Should match SQL (minus obsolete)

2. **Console Logs:**
   ```
   [API] getTotalSchedules summary: {
     totalKalibrasi: 929,           // from unique count
     totalKalibrasiFromSum: 950,    // from monthly sum (may differ)
     uniqueCalibrationIds: 929      // distinct IDs
   }
   ```

3. **Monthly Breakdown:**
   - Sum of all 12 months may still be > 929 (if 6-monthly schedules)
   - This is EXPECTED and OK
   - Only the total display should be 929

---

## 🐛 Troubleshooting

### Issue: After fix, still shows 929 but should be 950

**Diagnosis:**
```sql
-- Check if 21 are truly obsolete
SELECT COUNT(*) FROM kalibrasi k
JOIN daftaralat d ON k.no_id = d.no_id
WHERE d.status = 'obsolete';
```

If result = 21, then **929 is CORRECT** (not a bug).

### Issue: After fix, shows different number (e.g., 945)

**Diagnosis:**
```sql
-- Check for NULL calibration_ids
SELECT COUNT(*) FROM kalibrasi
WHERE calibration_id IS NULL;
```

If result > 0, add this to filter:
```javascript
if (!k.calibration_id) return // skip NULL IDs
```

### Issue: Monthly breakdown sum doesn't match total

**This is EXPECTED** if there are 6-monthly or quarterly schedules.

Example:
```
Jan: 80 schedules
Feb: 75 schedules
...
Jul: 80 schedules (includes 6-monthly from Jan)
...

Sum of all months: 950
Unique calibrations: 900 (some counted 2x)

Display: 900 ✅ CORRECT
```

---

## 📝 Summary

### Problem
Dashboard under-counts by 21 (950 actual vs 929 displayed)

### Root Cause (Most Likely)
One of:
1. 21 calibrations are for obsolete equipment (correct exclusion)
2. 21 calibrations have missing/invalid due_date (data issue)
3. Multi-year filter logic excludes them incorrectly (code bug)

### Fix Applied
Use unique `calibration_id` count instead of sum of monthly counts

### Next Steps
1. Run `find-missing-21-kalibrasi.sql` to identify which 21 are missing
2. Determine if exclusion is correct (obsolete) or bug
3. If bug, apply appropriate fix from "Additional Fixes" section
4. If correct, document that 929 is expected count

---

**Last Updated:** September 2026  
**Status:** 🔍 Investigation Script Created - Awaiting SQL Results  
**Priority:** 🟡 MEDIUM (depends on whether 21 should be excluded or not)
