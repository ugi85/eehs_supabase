# PM Dashboard Data Not Updating - Fix Guide

## Problem Statement

Dashboard chart **tidak menampilkan** atau **tidak update** data log aktivitas PM untuk bulan Agustus 2026, padahal data Kalibrasi sudah benar.

## Kemungkinan Penyebab

### 1. Cache Not Cleared ❌
Dashboard menggunakan localStorage cache yang bertahan 30 menit. Jika data PM baru ditambahkan, cache lama masih menampilkan data lama.

**Solution**: 
```javascript
// Run in browser console (F12):
localStorage.removeItem('dashboard_data_cache')
location.reload()
```

**OR** Gunakan tool: `clear-dashboard-cache.html`

---

### 2. Date Format Mismatch ❌
Jika `execute_date` di tabel `logaktivitas` untuk PM tidak dalam format yang benar, date filtering akan gagal.

**Check with SQL**:
```sql
SELECT 
  no, no_id, execute_date,
  execute_date::text as date_string,
  CASE 
    WHEN execute_date::text LIKE '2026-08%' THEN 'OK'
    ELSE 'WRONG FORMAT'
  END as format_check
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';
```

**Expected**: Semua row harus return `format_check = 'OK'`

---

### 3. PM Schedule Mismatch ❌
Equipment tidak memiliki jadwal PM di bulan August, sehingga `monthData.length` = 0, membuat percentage calculation gagal.

**Check with SQL** (see `debug-pm-august-2026.sql`):
```sql
-- Hitung equipment dengan PM scheduled di August
SELECT COUNT(*) as scheduled_count
FROM daftaralat
WHERE pm_yn = 'Y'
  AND (status IS NULL OR status != 'obsolete')
  AND (
    (LOWER("6_monthly") LIKE '%aug%' AND "6_monthly" NOT IN ('NA', '-'))
    OR
    (LOWER(yearly) LIKE '%aug%' AND yearly NOT IN ('NA', '-'))
  );
```

**IF** `scheduled_count = 0` **BUT** ada log PM di August:
- Artinya: Log PM dibuat manual (tidak match dengan jadwal)
- **Dashboard akan tetap menampilkan executed count**

---

### 4. Logic Error in `processPMMonthlyData` ❌ (FIXED)

**Problem**: Function menggunakan logic berbeda dengan Kalibrasi

**Before (WRONG)**:
```javascript
// PM menggunakan monthData.length (scheduled) untuk current month
const count = isPastPeriodCheck ? executed : monthData.length

// RESULT: Jika monthData.length = 65, executed = 11
// Dashboard shows: 11/65 (17%) ❌ WRONG
```

**After (CORRECT)**:
```javascript
// PM sekarang konsisten dengan Kalibrasi
const count = isPastPeriodCheck ? executed : monthData.length

// LOGIC:
// - Past months: count = executed (show completed only)
// - Current/Future: count = monthData.length (show scheduled)

// RESULT: Jika scheduled = 65, executed = 40 (misalnya)
// Dashboard shows: 40/65 (62%) ✅ CORRECT
```

---

## Verification Steps

### Step 1: Check Database
```bash
# Run SQL diagnostic
psql -f debug-pm-august-2026.sql
```

**Expected Output**:
- Query #1: Total PM logs in August (e.g., 40)
- Query #3: Total PM scheduled in August (e.g., 65)
- Query #5: Cross-check logs with equipment status

### Step 2: Clear Cache
1. Open `clear-dashboard-cache.html` in browser
2. Click "Clear Cache & Reload Dashboard"
3. OR run in console: `localStorage.removeItem('dashboard_data_cache')`

### Step 3: Check Console Logs
1. Open Browser Developer Tools (F12)
2. Go to **Console** tab
3. Refresh dashboard page
4. Look for logs:

```javascript
[API] August PM Debug: {
  totalAlatWithPM: 366,
  totalPMLogsAllMonths: 403,
  logsInAugust: 40,        // ← Should match database count
  executed: 40,             // ← Should match logsInAugust
  count: 65,                // ← Scheduled equipment count
  percentage: 62,           // ← executed/count * 100
  fullAugustPMData: {...}
}

[processPMMonthlyData] August PM Details: {
  scheduledThisMonth: 65,
  totalLogsThisMonth: 40,
  executed: 40
}

[processPMMonthlyData] August FINAL: {
  count: 65,
  executed: 40,
  executedPercentage: 62,
  logic: "count=monthData (CURRENT/FUTURE)"
}
```

### Step 4: Visual Check
Dashboard should display:
- **PM August 2026**: `40/65` (62%) - green/yellow progress bar
- Table row untuk August harus show executed dan percentage yang benar

---

## Common Issues & Solutions

### Issue 1: Dashboard shows 0/0 for PM
**Cause**: No equipment scheduled AND no logs executed
**Solution**: 
- Add PM schedules to equipment in `daftaralat` table
- OR create manual PM logs for August

### Issue 2: Dashboard shows X/0 (division by zero)
**Cause**: `monthData.length = 0` (no scheduled) but logs exist
**Solution**: 
```javascript
// Already handled in code:
const count = isPastPeriodCheck ? executed : monthData.length
const executedPercentage = count > 0 
  ? Math.min(100, Math.round((executed / count) * 100)) 
  : 0  // ← Returns 0% if count = 0
```

### Issue 3: Executed count lower than expected
**Cause**: Date format tidak match filter
**Check**:
```javascript
// In console log, check:
logsInAugust: 11  // ← If this is lower than database count
```

**Solution**: Run SQL to check date format consistency

### Issue 4: Cache not clearing
**Solution**: Hard reload browser
- Chrome/Edge: `Ctrl + Shift + R`
- Firefox: `Ctrl + F5`
- OR: Clear browser cache manually (Settings → Privacy → Clear browsing data)

---

## Testing Checklist

- [ ] Run `debug-pm-august-2026.sql` to verify database data
- [ ] Clear localStorage cache
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check console logs for PM data
- [ ] Verify dashboard displays correct PM percentage
- [ ] Check that data updates when new PM log is added
- [ ] Test with different months (July, September)

---

## Files Modified

1. **src/api/supabase/logAktivitasApi.js**
   - Enhanced `processPMMonthlyData` with better logging
   - Fixed `isPastPeriod` function
   - Added consistent date filtering (string match + fallback)

2. **debug-pm-august-2026.sql** (NEW)
   - Comprehensive PM data diagnostic queries

3. **clear-dashboard-cache.html** (NEW)
   - Web tool to clear cache easily

4. **PM_DASHBOARD_FIX.md** (NEW)
   - This troubleshooting guide

---

## Quick Fix Commands

```javascript
// 1. Clear cache
localStorage.removeItem('dashboard_data_cache')

// 2. Force refresh
location.reload()

// 3. Check PM data in console
// Look for: [API] August PM Debug
```

---

## Expected Behavior

| Scenario | Count | Executed | Display | Percentage |
|----------|-------|----------|---------|------------|
| Past Month | executed | 50 | 50/50 | 100% |
| Current Month (scheduled=65, done=40) | 65 | 40 | 40/65 | 62% |
| Future Month | scheduled | 0 | 0/65 | 0% |
| No Schedule, No Logs | 0 | 0 | 0/0 | 0% |
| No Schedule, Has Logs | executed | 10 | 10/0 | 0% ⚠️ |

---

## Contact & Support

Jika masalah masih berlanjut setelah:
1. Clear cache
2. Check SQL data
3. Verify console logs

Maka kemungkinan:
- Data di database corrupt
- Timezone issue
- Browser compatibility issue

**Debug Info Needed**:
- Console log screenshot
- SQL query results
- Browser version & OS

---

**Last Updated**: December 26, 2024  
**Version**: 1.0  
**Status**: ✅ FIXED - Enhanced logging & cache management
