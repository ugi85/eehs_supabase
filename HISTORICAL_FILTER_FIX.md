# Historical Period Filter Fix

## 📋 Overview

**Problem:** Data yang baru di-import dengan jadwal bulan masa lalu muncul sebagai aktivitas pada bulan tersebut, padahal data belum exist saat periode tersebut berlangsung.

**Solution:** Menambahkan filter `created_at` untuk memastikan hanya data yang sudah exist sebelum atau saat periode berlangsung yang ditampilkan.

**Date Implemented:** September 2026  
**Version:** v2.1.0

---

## 🔍 Root Cause Analysis

### Problem Description

Sistem filtering PM dan Kalibrasi hanya mempertimbangkan:
1. ✅ Bulan jadwal (`due_date`, `yearly`, `6_monthly`)
2. ✅ Status Completed (apakah ada log aktivitas)

Sistem **TIDAK** mempertimbangkan:
- ❌ Kapan data alat/jadwal mulai masuk ke sistem (`created_at`)
- ❌ Apakah data sudah aktif saat periode aktivitas berlangsung

### Example Scenario

**Current Behavior (BEFORE FIX):**
```
Current Date: 15 September 2026

Equipment A:
- Created: 10 September 2026
- PM Schedule: August 2026

User filters: August 2026
❌ INCORRECT: Equipment A appears as "Belum Completed" for August 2026
   (padahal equipment baru ditambahkan setelah August berlalu)
```

**Expected Behavior (AFTER FIX):**
```
Current Date: 15 September 2026

Equipment A:
- Created: 10 September 2026
- PM Schedule: August 2026

User filters: August 2026
✅ CORRECT: Equipment A TIDAK muncul
   (equipment belum exist saat August 2026)

User filters: September 2026
✅ CORRECT: Equipment A muncul
   (equipment sudah exist di September)
```

---

## 🎯 Business Rules

| # | Condition | `created_at` | Schedule | Filter Period | Result | Reason |
|---|-----------|--------------|----------|---------------|--------|--------|
| 1 | Old data | 2026-01-15 | Aug 2026 | Aug 2026 | ✅ Show | Data existed before August |
| 2 | New data, past schedule | 2026-09-10 | Aug 2026 | Aug 2026 | ❌ Hide | Data added AFTER August |
| 3 | New data, same month | 2026-09-10 | Sep 2026 | Sep 2026 | ✅ Show | Data added in same month |
| 4 | New data, future schedule | 2026-09-10 | Oct 2026 | Oct 2026 | ✅ Show | Data existed before October |
| 5 | New data, yearly schedule | 2026-09-10 | Aug (yearly) | Aug 2026 | ❌ Hide | Data didn't exist in Aug 2026 |
| 6 | Same data, next year | 2026-09-10 | Aug (yearly) | Aug 2027 | ✅ Show | Data will exist before Aug 2027 |
| 7 | Legacy data (null created_at) | NULL | Aug 2026 | Aug 2026 | ✅ Show | Backward compatible |

---

## 🛠️ Technical Implementation

### Files Modified

1. **`src/api/supabase/logAktivitasApi.js`**
   - Added `isValidForPeriod()` helper function
   - Updated `getKalibrasiForPeriod()` with `created_at` filter
   - Updated `getPMForPeriod()` with `created_at` filter
   - Added debug logging for troubleshooting

2. **`src/api/supabase/daftarAlatApi.js`**
   - Updated `upsertBatch()` to support `userInfo` parameter
   - Set `created_by` for new records during import
   - Set `updated_by` for updated records

3. **`src/api/supabase/jadwalKalibrasiApi.js`**
   - Updated `upsertBatch()` to support `userInfo` parameter
   - Set `created_by` for new records during import
   - Set `updated_by` for updated records

### New Helper Function

```javascript
/**
 * Check if data is valid for a specific period
 * Prevents newly imported data from appearing in past periods
 * 
 * @param {string|null} createdAt - ISO timestamp (e.g., '2026-09-15T10:30:00Z')
 * @param {number} selectedYear - Selected year (e.g., 2026)
 * @param {number} selectedMonthIndex - Month index 0-11 (0=Jan, 7=Aug)
 * @returns {boolean} - True if data should be included in the period
 */
function isValidForPeriod(createdAt, selectedYear, selectedMonthIndex) {
  // Legacy data without created_at: assume valid (backward compatible)
  if (!createdAt) return true
  
  const createdDate = new Date(createdAt)
  const endOfSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0, 23, 59, 59, 999)
  
  // Data valid if created BEFORE or DURING selected period
  return createdDate <= endOfSelectedMonth
}
```

### Filter Logic Changes

#### Before (Kalibrasi):
```javascript
const filtered = kalibrasiData.filter(item => {
  if (!item.due_date.toLowerCase().includes(monthShort)) return false
  // ... interval logic
  return true
})
```

#### After (Kalibrasi):
```javascript
const filtered = kalibrasiData.filter(item => {
  if (!item.due_date.toLowerCase().includes(monthShort)) return false
  
  // ✅ NEW: Check if data existed during the period
  if (!isValidForPeriod(item.created_at, selectedYear, monthIndex)) {
    return false
  }
  
  // ... interval logic
  return true
})
```

Similar changes applied to PM filtering logic.

---

## 📊 Database Fields Used

### Tables with Audit Trail

Both `daftaralat` and `kalibrasi` tables have audit trail columns:

```sql
-- Added via migration scripts:
-- - add-audit-trail-columns.sql (daftaralat)
-- - add-kalibrasi-audit-columns.sql (kalibrasi)

ALTER TABLE daftaralat ADD COLUMN created_at timestamptz DEFAULT NOW();
ALTER TABLE daftaralat ADD COLUMN updated_at timestamptz DEFAULT NOW();
ALTER TABLE daftaralat ADD COLUMN created_by varchar(100);
ALTER TABLE daftaralat ADD COLUMN updated_by varchar(100);

ALTER TABLE kalibrasi ADD COLUMN created_at timestamptz DEFAULT NOW();
ALTER TABLE kalibrasi ADD COLUMN updated_at timestamptz DEFAULT NOW();
ALTER TABLE kalibrasi ADD COLUMN created_by varchar(100);
ALTER TABLE kalibrasi ADD COLUMN updated_by varchar(100);
```

### Triggers

Database triggers automatically set `created_at` and `updated_at`:
- `trg_daftaralat_updated_at` - Updates `updated_at` on row changes
- `trg_kalibrasi_updated_at` - Updates `updated_at` on row changes

---

## ✅ Testing & Verification

### Test Scenarios

After deployment, verify these test cases:

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TC-01 | Filter Aug 2026 with old data (created Jan 2026) | ✅ Data appears |
| TC-02 | Filter Aug 2026 with new data (created Sep 2026) | ❌ Data does NOT appear |
| TC-03 | Filter Sep 2026 with data created Sep 2026 | ✅ Data appears |
| TC-04 | Filter Oct 2026 with data created Sep 2026 | ✅ Data appears |
| TC-05 | Filter Aug 2027 with data created Sep 2026 | ✅ Data appears (yearly schedule) |
| TC-06 | Legacy data with NULL created_at | ✅ Data appears (backward compatible) |
| TC-07 | Completed activities (historical logs) | ✅ All completed activities still appear |
| TC-08 | Dashboard counts for past months | ✅ Counts reflect actual activities |

### Manual Testing Steps

1. **Setup Test Data:**
   ```javascript
   // Create equipment with past schedule
   POST /api/daftaralat
   {
     no_id: 'TEST-001',
     pm_yn: 'Y',
     yearly: 'Aug',  // August schedule
     created_at: '2026-09-15T10:00:00Z'  // Created in September
   }
   ```

2. **Test Historical Filter:**
   - Open PM Log view
   - Select: August 2026
   - Expected: TEST-001 should NOT appear

3. **Test Current Period:**
   - Select: September 2026
   - Expected: TEST-001 SHOULD appear

4. **Test Dashboard:**
   - Clear dashboard cache: `localStorage.removeItem('dashboard_data_cache')`
   - Refresh dashboard
   - Expected: August counts exclude new data

### Automated Test (Optional)

```javascript
// Unit test for isValidForPeriod
describe('isValidForPeriod', () => {
  it('should include data created before period', () => {
    expect(isValidForPeriod('2026-01-15', 2026, 7)).toBe(true) // Aug 2026
  })
  
  it('should exclude data created after period', () => {
    expect(isValidForPeriod('2026-09-10', 2026, 7)).toBe(false) // Aug 2026
  })
  
  it('should include legacy data with null created_at', () => {
    expect(isValidForPeriod(null, 2026, 7)).toBe(true)
  })
})
```

---

## 🔄 Migration & Deployment

### Pre-Deployment Checklist

- [x] Verify audit trail columns exist in database
- [x] Test helper function `isValidForPeriod()`
- [x] Update API filtering logic
- [x] Add debug logging
- [x] Test backward compatibility with NULL `created_at`

### Post-Deployment Steps

1. **Clear Dashboard Cache:**
   ```javascript
   // Execute in browser console or add to deployment script
   localStorage.removeItem('dashboard_data_cache')
   ```

2. **Monitor Logs:**
   - Check for `[isValidForPeriod]` debug messages
   - Verify no errors in date parsing
   - Confirm filter logic is working

3. **User Communication:**
   - Inform users that historical counts may change
   - Explain that this is a bug fix, not data loss
   - Past month counts now reflect ACTUAL activities

### Rollback Plan (If Needed)

If issues occur, revert these changes:

1. **Remove filter check:**
   ```javascript
   // Comment out the new filter line:
   // if (!isValidForPeriod(item.created_at, selectedYear, monthIndex)) return false
   ```

2. **Clear cache and refresh**

3. **Investigate specific data causing issues**

---

## 📈 Impact Analysis

### Positive Impacts

✅ **Accurate Historical Data:**
- Past period filters now show only activities that were actually scheduled at that time
- No retroactive changes to historical records

✅ **Better Data Integrity:**
- Import process now properly tracks when data was added
- Audit trail provides full traceability

✅ **Consistent Reporting:**
- Dashboard counts match reality
- Printed reports reflect actual activities

### Potential Changes

⚠️ **Dashboard Counts:**
- Past month counts may DECREASE for periods with newly imported data
- This is expected and CORRECT behavior

⚠️ **Historical Reports:**
- Previously printed reports may show different counts than new queries
- Document this as "corrected historical data"

### User Perspective

**Before Fix:**
> "Why does August 2026 show 50 PM activities when only 45 were done? Oh, 5 equipments were just imported last week with August schedule..."

**After Fix:**
> "August 2026 shows 45 completed / 45 scheduled = 100%. September shows 5 new equipments as scheduled. Perfect!"

---

## 🐛 Troubleshooting

### Issue: Old data not showing

**Symptom:** Equipment created before target period doesn't appear

**Possible Causes:**
1. `created_at` is NULL → Should show (check helper function)
2. `created_at` is incorrect in database → Fix data
3. Filter logic error → Check console logs

**Debug:**
```javascript
console.log('[isValidForPeriod]', {
  createdAt: item.created_at,
  selectedPeriod: `${year}-${monthIndex + 1}`,
  result: isValidForPeriod(item.created_at, year, monthIndex)
})
```

### Issue: New data showing in past periods

**Symptom:** Equipment imported today appears in August 2026

**Possible Causes:**
1. Database trigger not setting `created_at` → Check trigger status
2. Filter not applied → Check API code
3. Cache issue → Clear `dashboard_data_cache`

**Fix:**
```sql
-- Verify trigger is active
SELECT * FROM pg_trigger WHERE tgname LIKE '%daftaralat%';

-- Manual fix if needed
UPDATE daftaralat 
SET created_at = NOW() 
WHERE created_at IS NULL;
```

### Issue: Dashboard cache not updating

**Symptom:** Dashboard still shows old counts

**Fix:**
```javascript
// Clear cache
localStorage.removeItem('dashboard_data_cache')

// Or force reload
window.location.reload(true)
```

---

## 📚 Related Documentation

- [AUDIT_TRAIL_SETUP.md](./AUDIT_TRAIL_SETUP.md) - Audit trail implementation
- [KALIBRASI_AUDIT_TRAIL.md](./KALIBRASI_AUDIT_TRAIL.md) - Calibration audit trail
- [add-audit-trail-columns.sql](./add-audit-trail-columns.sql) - Database migration for daftaralat
- [add-kalibrasi-audit-columns.sql](./add-kalibrasi-audit-columns.sql) - Database migration for kalibrasi

---

## 📝 Changelog

### v2.1.0 - September 2026

**Added:**
- `isValidForPeriod()` helper function for period validation
- `created_at` filter in `getKalibrasiForPeriod()`
- `created_at` filter in `getPMForPeriod()`
- `userInfo` parameter in `upsertBatch()` functions
- Debug logging for troubleshooting

**Fixed:**
- Data baru tidak lagi muncul di periode historis
- Dashboard counts now reflect actual activities
- Import process properly sets `created_by` and `updated_by`

**Changed:**
- Filtering logic now considers data creation date
- Historical period filters are more accurate

**Backward Compatible:**
- Legacy data with NULL `created_at` still works
- Completed activities (logs) not affected
- Existing API contracts maintained

---

## 👥 Contact

**For questions or issues:**
- Check debug logs in browser console
- Review test scenarios above
- Contact system administrator

**Technical Support:**
- Database: Check audit trail columns and triggers
- API: Review logAktivitasApi.js for filter logic
- Frontend: Clear cache if issues persist

---

**Last Updated:** September 2026  
**Document Version:** 1.0  
**Status:** ✅ Implemented & Tested
