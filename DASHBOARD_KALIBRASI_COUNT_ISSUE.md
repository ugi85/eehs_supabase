# Dashboard Kalibrasi Count Investigation

## 🔍 Problem Statement

**Issue:** Jumlah jadwal kalibrasi yang ditampilkan di dashboard berbeda dengan jumlah data aktual.

**Reported:** September 2026

---

## 📊 Investigation Tools

### 1. **SQL Diagnostic Script**
**File:** `debug-kalibrasi-count-mismatch.sql`

Run this script in Supabase SQL Editor to analyze:
- Total count using different methods
- Monthly breakdown
- Duplicate calibration IDs
- Multi-year schedules
- Root cause identification

**Usage:**
```sql
-- Copy entire content dari debug-kalibrasi-count-mismatch.sql
-- Paste ke Supabase SQL Editor
-- Execute
```

### 2. **Browser Console Debug Script**
**File:** `debug-dashboard-console.js`

Run this in browser console while viewing the dashboard:

**Usage:**
```javascript
// 1. Open Dashboard page
// 2. Open browser console (F12)
// 3. Copy-paste entire debug-dashboard-console.js
// 4. Press Enter
// 5. Review output and exported data in window.__DEBUG_DATA__
```

---

## 🎯 Common Root Causes

### Root Cause 1: **Double Counting Due to Sum of Monthly Counts**

**Symptom:**
```
Unique calibrations: 50
Dashboard total: 75
Difference: +25 (over-count)
```

**Explanation:**
```javascript
// Current logic (WRONG):
totalKalibrasi = January_count + February_count + ... + December_count
// = 10 + 8 + 12 + ... = 75

// Reality:
// - Some calibrations appear in MULTIPLE months
// - 6-monthly schedule: appears in 2 months → counted 2x
// - Quarterly schedule: appears in 4 months → counted 4x
```

**Example:**
```
Equipment: EWT-01
Calibration ID: EWT-01.CAL-01
Due Date: "Jan, Jul" (6-monthly)

Result:
- Counted in January: +1
- Counted in July: +1
- Total contribution: 2 (should be 1)
```

**Solution:**
```javascript
// ✅ CORRECT: Count unique calibration_ids
totalKalibrasi = COUNT(DISTINCT calibration_id)
// = 50 (actual unique schedules)
```

---

### Root Cause 2: **Duplicate Calibration IDs**

**Symptom:**
```sql
SELECT calibration_id, COUNT(*)
FROM kalibrasi
GROUP BY calibration_id
HAVING COUNT(*) > 1;

-- Results:
calibration_id | count
EWT-01.CAL-01  | 2
EWT-02.CAL-01  | 3
```

**Explanation:**
- Same `calibration_id` exists multiple times in database
- Can happen due to:
  - Data import errors
  - Manual data entry mistakes
  - Lack of unique constraint

**Solution:**
1. **Add unique constraint:**
```sql
ALTER TABLE kalibrasi 
ADD CONSTRAINT unique_calibration_id 
UNIQUE (calibration_id);
```

2. **Clean existing duplicates:**
```sql
-- Find duplicates
WITH duplicates AS (
  SELECT calibration_id, MIN(no) as keep_id
  FROM kalibrasi
  GROUP BY calibration_id
  HAVING COUNT(*) > 1
)
-- Delete all except the first one
DELETE FROM kalibrasi k
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE d.calibration_id = k.calibration_id
  AND k.no != d.keep_id
);
```

---

### Root Cause 3: **Schedules in Multiple Months (6-Monthly, Quarterly)**

**Symptom:**
```
Equipment with 6-monthly schedule:
- due_date = "Jan, Jul"
- Appears in January count: +1
- Appears in July count: +1
- Sum = 2 (but it's only 1 unique calibration)
```

**Explanation:**
- `due_date` field contains multiple months: "Jan, Jul"
- Month filter logic: `due_date.includes('jan')` → TRUE
- Month filter logic: `due_date.includes('jul')` → TRUE
- Result: Same calibration counted in both months

**Current Dashboard Logic:**
```javascript
// processMonthlyData() function
const validItems = kalibrasiData.filter(item => {
  // ❌ PROBLEM: This will match multiple months for "Jan, Jul"
  if (!item.due_date.toLowerCase().includes(monthShort)) return false
  // ...
  return true
})

// Then sum all months:
totalKalibrasi = Jan + Feb + Mar + ... + Dec
//             = Double counting!
```

**Solutions:**

**Option A: Use DISTINCT calibration_id (Recommended)**
```javascript
// In getTotalSchedules():
const result = {
  success: true,
  // ✅ Count unique calibration_ids instead of sum
  totalKalibrasi: new Set(
    kalibrasiData
      .filter(k => statusMap[k.no_id] !== 'obsolete')
      .map(k => k.calibration_id)
  ).size,
  totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  kalibrasiMonthly,
  pmMonthly
}
```

**Option B: Split Multi-Month Schedules**
```
Instead of:
  EWT-01.CAL-01 | due_date = "Jan, Jul"

Create separate entries:
  EWT-01.CAL-01-Q1 | due_date = "Jan"
  EWT-01.CAL-01-Q3 | due_date = "Jul"
```

**Option C: Change Data Model**
```sql
-- New approach: Separate schedule_month column
ALTER TABLE kalibrasi 
ADD COLUMN schedule_month INTEGER; -- 1-12

-- Then one row per scheduled month
INSERT INTO kalibrasi (no_id, calibration_id, schedule_month, ...)
VALUES 
  ('EWT-01', 'EWT-01.CAL-01', 1, ...), -- January
  ('EWT-01', 'EWT-01.CAL-01', 7, ...); -- July
```

---

## 🔧 Recommended Fix

### **Priority 1: Fix Dashboard Calculation (Quick Fix)**

**File to modify:** `src/api/supabase/logAktivitasApi.js`

**Current code:**
```javascript
const result = {
  success: true,
  totalKalibrasi: kalibrasiMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  kalibrasiMonthly,
  pmMonthly
}
```

**Fixed code:**
```javascript
// ✅ Count unique calibration_ids for total
const uniqueKalibrasiIds = new Set()
kalibrasiData.forEach(k => {
  // Only count active equipment
  if (statusMap[k.no_id] === 'obsolete') return
  if (!k.calibration_id) return
  uniqueKalibrasiIds.add(k.calibration_id)
})

const result = {
  success: true,
  totalKalibrasi: uniqueKalibrasiIds.size, // ✅ FIX: Use unique count
  totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
  kalibrasiMonthly,
  pmMonthly
}
```

---

### **Priority 2: Add Database Constraint (Medium Priority)**

**Purpose:** Prevent duplicate calibration_ids in future

**Script:**
```sql
-- Step 1: Check for existing duplicates
SELECT calibration_id, COUNT(*) as count
FROM kalibrasi
GROUP BY calibration_id
HAVING COUNT(*) > 1;

-- Step 2: If duplicates found, clean them first
-- (Review and decide which ones to keep)

-- Step 3: Add unique constraint
ALTER TABLE kalibrasi 
ADD CONSTRAINT unique_calibration_id 
UNIQUE (calibration_id);

-- Step 4: Verify
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'kalibrasi';
```

---

### **Priority 3: Data Model Review (Long-term)**

Consider restructuring to avoid ambiguity:

**Current:**
```
calibration_id | due_date
EWT-01.CAL-01  | "Jan, Jul"  ← Ambiguous
```

**Option 1: Separate rows**
```
calibration_id       | due_month
EWT-01.CAL-01-JAN    | 1
EWT-01.CAL-01-JUL    | 7
```

**Option 2: Add frequency column**
```
calibration_id | due_month | frequency
EWT-01.CAL-01  | 1         | 6-monthly  (Jan start, repeat every 6 months)
```

---

## 🧪 Testing After Fix

### Test Case 1: Dashboard Total
```
Given: 
  - 50 unique calibration schedules
  - 10 are 6-monthly (appear in 2 months each)
  - 40 are yearly (appear in 1 month each)

When: View dashboard

Expected:
  - Total Kalibrasi: 50 (not 60 or 70)
  - Sum of monthly counts may still be 60 (this is OK)
  - But displayed total should be 50
```

### Test Case 2: Monthly Breakdown
```
Given:
  - Equipment EWT-01
  - Calibration ID: EWT-01.CAL-01
  - Due date: "Jan, Jul"

When: Filter by month

Expected:
  - January: Shows EWT-01.CAL-01 ✅
  - February: Does NOT show ✅
  - July: Shows EWT-01.CAL-01 ✅
  - August: Does NOT show ✅

Dashboard monthly counts are correct.
Only the TOTAL is fixed.
```

### Test Case 3: No Duplicates
```
Given: Database has no duplicate calibration_ids

When: Run diagnostic SQL

Expected:
  - Query 3 (duplicate check) returns 0 rows
  - Query 6 shows: "✅ Dashboard count MATCHES actual data"
```

---

## 📝 Investigation Checklist

Run through this checklist to identify the issue:

### ☐ **Step 1: Run SQL Diagnostic**
```sql
-- Copy debug-kalibrasi-count-mismatch.sql
-- Paste to Supabase SQL Editor
-- Execute and review Query 6 (COMPARISON)
```

**Look for:**
- [ ] Dashboard total > Unique calibrations? → **Over-counting**
- [ ] Dashboard total < Unique calibrations? → **Under-counting**
- [ ] Dashboard total = Unique calibrations? → **No issue**

### ☐ **Step 2: Check for Duplicates**
```sql
-- Query 3 from diagnostic script
SELECT calibration_id, COUNT(*)
FROM kalibrasi
GROUP BY calibration_id
HAVING COUNT(*) > 1;
```

**Expected:** 0 rows (no duplicates)

### ☐ **Step 3: Check Multi-Month Schedules**
```sql
-- Query 7 from diagnostic script
-- Shows calibrations appearing in multiple months
```

**If found:** This is the root cause of over-counting

### ☐ **Step 4: Run Browser Console Debug**
```javascript
// Copy debug-dashboard-console.js
// Paste to browser console on dashboard page
// Review output
```

**Check:**
- [ ] `unique_calibrations` matches expected count?
- [ ] `sum_of_monthly` matches dashboard display?
- [ ] `multiMonthCals` shows schedules in multiple months?

### ☐ **Step 5: Compare with Actual View**
```
1. Open dashboard
2. Note "Total Kalibrasi" number
3. Go to "Jadwal Kalibrasi" list view
4. Count DISTINCT calibration_id
5. Compare numbers
```

**Expected:** Should match after fix

---

## 🚀 Implementation Steps

### Phase 1: Quick Fix (30 minutes)
1. ✅ Backup current code
2. ✅ Modify `getTotalSchedules()` in `logAktivitasApi.js`
3. ✅ Use `Set` to count unique calibration_ids
4. ✅ Test on dev environment
5. ✅ Clear dashboard cache
6. ✅ Verify total matches unique count

### Phase 2: Data Validation (1 hour)
1. ✅ Run SQL diagnostic script
2. ✅ Document any duplicates found
3. ✅ Clean duplicates if found
4. ✅ Add unique constraint
5. ✅ Verify constraint works

### Phase 3: Long-term (Optional)
1. ⏳ Review data model
2. ⏳ Consider separate rows for multi-month schedules
3. ⏳ Update import logic
4. ⏳ Migrate existing data

---

## 📚 Related Documentation

- [HISTORICAL_FILTER_FIX.md](./HISTORICAL_FILTER_FIX.md) - Related filtering logic
- [DASHBOARD_SYNC_FIX.md](./DASHBOARD_SYNC_FIX.md) - Dashboard synchronization
- [DASHBOARD_COUNT_FIX.md](./DASHBOARD_COUNT_FIX.md) - Count calculation fixes

---

## 💡 Key Takeaways

### **Root Cause:**
Dashboard sums monthly counts instead of counting unique calibrations.

### **Quick Fix:**
```javascript
// Use Set to count unique IDs
totalKalibrasi = new Set(calibrationIds).size
```

### **Long-term:**
Consider data model that avoids ambiguity in multi-month schedules.

### **Prevention:**
Add unique constraint on `calibration_id` to prevent duplicates.

---

**Last Updated:** September 2026  
**Status:** 🔍 Investigation Complete - Fix Pending Implementation  
**Priority:** 🔴 HIGH (affects dashboard accuracy)
