# 🚀 Quick Testing Guide - Bug Fixes Verification

**Date:** September 15, 2026  
**Fixes:** Historical Filter Bug + Dashboard Count Bug  
**Estimated Time:** 15-20 minutes

---

## ⚡ Quick Start (3 Steps)

### Step 1: Clear Cache (30 seconds)
1. Open dashboard in browser
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Paste and run:
```javascript
localStorage.removeItem('dashboard_data_cache')
```
5. Refresh page (`F5`)

### Step 2: Verify Count (2 minutes)
1. Look at dashboard **Total Jadwal Kalibrasi**
2. Should show **~950** (not 929)
3. In Console, paste all of `test-browser-console.js` and run:
```javascript
verifyCount()
```
4. Check output: Should say ✅ CORRECT

### Step 3: Test Historical Filter (5 minutes)
1. Change dashboard filter to **August 2026**
2. Look at displayed data
3. In Supabase SQL Editor, run **Query 2** from `test-historical-filter.sql`
4. Any results from Query 2 should **NOT** appear in August 2026 filter

---

## 📊 Expected Results Summary

| Test | Expected | Bug (Old Behavior) |
|------|----------|-------------------|
| **Dashboard Total Count** | 950 | 929 |
| **August 2026 Filter** | Only data created ≤ Aug 31 | Shows Sept data with Aug schedule |
| **6-Monthly Schedules** | Count once, display twice | Counted twice |
| **Legacy Data (NULL created_at)** | Still visible in all periods | Same (no change) |

---

## 🔍 Detailed Testing (If Issues Found)

### Browser Testing

**File:** `test-browser-console.js`  
**Where:** Browser DevTools Console (F12)

```javascript
// Paste entire file content, then run:
runFullTest()
```

**What it checks:**
- ✅ Cache cleared successfully
- ✅ Current dashboard counts
- ✅ Unique ID calculation
- ✅ API call monitoring

---

### SQL Testing

#### Test Historical Filter
**File:** `test-historical-filter.sql`  
**Where:** Supabase SQL Editor

**Key Queries:**
- **Query 1:** Shows recently imported data
- **Query 2:** 🎯 **CRITICAL** - Finds data that should NOT appear in historical periods
- **Query 4:** Simulates filter logic with decision column
- **Query 5:** Summary statistics

**What to look for:**
- Query 2 results = data that should be HIDDEN in past filters
- Query 4 "SHOULD NOT APPEAR" = fix is working

---

#### Test Dashboard Count
**File:** `test-dashboard-count.sql`  
**Where:** Supabase SQL Editor

**Key Queries:**
- **Query 1:** 🎯 **THE TRUTH** - What dashboard should show (950)
- **Query 2:** The old bug calculation (929)
- **Query 7:** Side-by-side comparison
- **Query 8:** Simulates actual dashboard calculation

**What to look for:**
- Query 1 = Query 8 = Dashboard Total
- Query 1 > Query 2 (proof of fix)

---

## 🎯 Success Criteria Checklist

### Fix #1: Historical Filter
- [ ] Data imported today with August schedule does NOT appear in August 2026 filter
- [ ] Same data DOES appear in September 2026+ filters
- [ ] Old data (created before) still appears normally
- [ ] No data mysteriously disappeared

### Fix #2: Dashboard Count
- [ ] Total shows 950 (or SQL Query 1 result)
- [ ] NOT showing 929 anymore
- [ ] Browser console shows "Unique calibration IDs"
- [ ] Query 1 = Query 8 = Dashboard

### General
- [ ] No errors in browser console
- [ ] No errors in SQL queries
- [ ] Dashboard loads normally
- [ ] All filters working smoothly

---

## 🐛 Troubleshooting

### Dashboard still shows 929
**Problem:** Cache not cleared  
**Solution:**
```javascript
localStorage.clear()
// Then refresh page (F5 or Ctrl+R)
```

### Historical filter not working
**Problem:** created_at column missing/NULL  
**Solution:** Run `verify-created-at-columns.sql` to check audit trail setup

### SQL queries timeout
**Problem:** Large dataset  
**Solution:** Add `LIMIT 100` to queries or run during low-traffic time

### Can't access browser console
**Problem:** DevTools shortcuts disabled  
**Solution:**
- Right-click on page → Inspect → Console tab
- Or: Menu → More Tools → Developer Tools

---

## 📞 Quick Reference

### Files Created
| File | Purpose | Where to Use |
|------|---------|-------------|
| `TESTING_CHECKLIST.md` | Comprehensive checklist | Print/follow along |
| `test-historical-filter.sql` | Historical filter tests | Supabase SQL Editor |
| `test-dashboard-count.sql` | Count verification | Supabase SQL Editor |
| `test-browser-console.js` | Interactive testing | Browser Console |
| `TESTING_QUICK_GUIDE.md` | This file | Quick reference |

### Documentation
| File | Content |
|------|---------|
| `HISTORICAL_FILTER_FIX.md` | How historical filter fix works |
| `KALIBRASI_COUNT_FIX.md` | How count fix works |
| `CALIBRATION_INTERVAL_HANDLING.md` | How 3 interval types work |

### Previous Diagnostic Files
- `debug-929-vs-950-specific.sql` - Detailed count investigation
- `debug-kalibrasi-count-mismatch.sql` - Original count diagnostic
- `find-missing-21-kalibrasi.sql` - Finding missing schedules
- `verify-created-at-columns.sql` - Audit trail verification

---

## 🎓 Understanding The Fixes

### Fix #1: Historical Filter (created_at check)
**Before:**
```javascript
// Only checked schedule month
if (schedule_month === selectedMonth) {
  show(schedule)
}
```

**After:**
```javascript
// Now checks when data was created
if (schedule_month === selectedMonth && 
    created_at <= endOfSelectedMonth) {
  show(schedule)
}
```

**Why it matters:**  
Data imported September with August schedule won't pollute August historical reports.

---

### Fix #2: Dashboard Count (unique Set)
**Before:**
```javascript
// Summed monthly counts - under-counts due to invalid due_date
let total = sumOfMonthlyAppearances  // Got 929
```

**After:**
```javascript
// Counts unique schedules using Set
let uniqueIds = new Set(calibration_ids)
let total = uniqueIds.size  // Got 950
```

**Why it matters:**  
6-monthly schedules appear in 2 months but counted once. Invalid due_date schedules now included.

---

## 💡 Tips

### For Quick Verification
1. Run `runFullTest()` in browser console
2. Run Query 1 and Query 8 in SQL
3. Compare numbers: Dashboard = SQL

### For Deep Dive
1. Follow `TESTING_CHECKLIST.md` completely
2. Run all SQL queries
3. Document any discrepancies
4. Check documentation files for explanation

### For Production Deployment
1. Test on staging/dev first
2. Run SQL diagnostics to establish baseline
3. Clear all user caches after deployment
4. Monitor for 24-48 hours
5. Re-run SQL to verify counts stable

---

## ✅ Sign-off Template

```
Date: _____________
Tester: _____________

Quick Tests Completed:
[ ] Cache cleared
[ ] Count verified (950)
[ ] Historical filter tested
[ ] No console errors

Status: [ ] PASS / [ ] FAIL / [ ] NEEDS REVIEW

Notes:
_________________________________
_________________________________
```

---

## 🆘 Need Help?

1. **Count mismatch?** → Run `test-dashboard-count.sql` Query 7
2. **Filter not working?** → Run `test-historical-filter.sql` Query 4
3. **Console errors?** → Check browser console (F12), copy error message
4. **SQL errors?** → Check Supabase logs, verify table/column names

**Documentation available:**
- `HISTORICAL_FILTER_FIX.md` - Detailed explanation of filter fix
- `KALIBRASI_COUNT_FIX.md` - Detailed explanation of count fix
- `CALIBRATION_INTERVAL_HANDLING.md` - How intervals work

---

**Good luck with testing! 🎉**
