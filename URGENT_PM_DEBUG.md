# 🚨 URGENT: PM Dashboard Debug Guide

## Current Issue

Dashboard hanya mendeteksi **4 PM logs** untuk August 2026, padahal seharusnya lebih banyak.

```
[API] August PM Debug: {
  totalPMLogsAllMonths: 386,  // ← Total PM logs di semua bulan
  logsInAugust: 4,             // ← Hanya 4 yang terdetect! ❌
  executed: 4,
  count: 66,
  percentage: 6%
}
```

## ROOT CAUSE

Ada 2 kemungkinan:

### 1. Date Format Issue (Paling Likely)
PM logs memiliki format date yang berbeda dengan Kalibrasi logs, sehingga filter string matching gagal.

### 2. Missing PM Logs in August
Memang hanya ada 4 PM logs yang di-execute di August 2026.

---

## IMMEDIATE ACTION REQUIRED

### Step 1: Run SQL Query

Jalankan query ini untuk check **berapa sebenarnya** PM logs di August 2026:

```sql
-- Query 1: Count PM logs in August 2026
SELECT COUNT(*) as total_pm_august_2026
FROM logaktivitas
WHERE jenis = 'PM'
  AND execute_date >= '2026-08-01'
  AND execute_date < '2026-09-01';
```

**EXPECTED OUTPUT**: 
- If result = **4** → Data memang hanya 4, dashboard sudah benar ✅
- If result = **40+** → Ada masalah date filtering, perlu fix ❌

---

### Step 2: Check Date Format

Run query `check-pm-dates.sql`:

```bash
psql -d your_database -f check-pm-dates.sql
```

**Look for**:
- Apakah PM logs punya format date berbeda?
- Apakah ada timezone atau time component?
- Apakah string matching `'2026-08'` work untuk PM logs?

---

### Step 3: Check Browser Console

Refresh dashboard dan cari log ini:

```
[processPMMonthlyData] August PM Details: {
  totalPMLogsAllData: 386,
  totalLogsThisMonth: 4,
  sampleAllPM: [...]  // ← CHECK INI!
}
```

**Dalam `sampleAllPM`**, check:
- `execute_date`: Format date-nya seperti apa?
- `includes_2026_08`: Apakah `true` atau `false`?
- `month`: Apakah `7` (August) atau angka lain?

**Example Output to Look For**:

```javascript
sampleAllPM: [
  {
    no: 123,
    execute_date: "2026-08-15",     // ✅ Good format
    includes_2026_08: true,          // ✅ Should match
    month: 7                         // ✅ August (0-indexed)
  },
  {
    no: 124,
    execute_date: "2026-07-20",     // Different month
    includes_2026_08: false,
    month: 6                         // July
  }
]
```

---

## DIAGNOSIS CHECKLIST

Check each item:

- [ ] SQL Query #1 result = ___ (fill in the number)
- [ ] PM logs di database untuk August 2026 ada berapa? ___
- [ ] PM logs yang terdetect di console = 4
- [ ] Format date PM logs: `YYYY-MM-DD` atau format lain?
- [ ] Sample PM log execute_date: ___
- [ ] includes_2026_08 value: true/false?

---

## POSSIBLE FIXES

### Scenario A: Database has 4 PM logs only
**Diagnosis**: Dashboard is CORRECT ✅
**Action**: Add more PM logs for August 2026

### Scenario B: Database has 40+ PM logs, but system detects 4 only
**Diagnosis**: Date filtering FAILED ❌
**Root Cause Options**:

1. **PM logs use different date column**
   - Check if PM uses `execute_date` atau field lain
   
2. **PM logs have different date format**
   - e.g., `08-2026` instead of `2026-08`
   - e.g., `August 2026` (text format)
   
3. **PM logs have timezone component**
   - e.g., `2026-08-15T00:00:00+07:00`
   - String matching might fail if format is inconsistent

**FIX**: Adjust date filtering logic in `processPMMonthlyData()`

---

## NEXT STEPS AFTER DIAGNOSIS

### If SQL shows more than 4 logs:

1. **Share console log output** of `sampleAllPM`
2. **Share SQL query result** from `check-pm-dates.sql`
3. I will adjust the date filtering code accordingly

### If SQL shows exactly 4 logs:

Dashboard is working correctly! You need to:
1. Add more PM activities for August 2026
2. Verify equipment PM schedules are correct

---

## QUICK DEBUG COMMANDS

```javascript
// In browser console:

// 1. Clear cache
localStorage.removeItem('dashboard_data_cache')

// 2. Check current cache
JSON.parse(localStorage.getItem('dashboard_data_cache'))

// 3. Reload page
location.reload()
```

---

## CONTACT INFO NEEDED

Please provide:
1. **SQL Query #1 result**: How many PM logs in August 2026?
2. **Console log screenshot**: `[processPMMonthlyData] August PM Details`
3. **Sample PM log**: One row from `logaktivitas` table where `jenis='PM'` and date is August 2026

---

**Date**: December 26, 2024  
**Status**: 🔴 INVESTIGATING  
**Priority**: HIGH
