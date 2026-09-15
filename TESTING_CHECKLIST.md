# Testing Checklist - Bug Fixes Verification

## Tanggal Testing: _____________
## Tester: _____________

---

## 🎯 Fix #1: Historical Filter Bug

### Setup
- [ ] Clear browser cache: `localStorage.removeItem('dashboard_data_cache')`
- [ ] Refresh dashboard
- [ ] Siapkan file import test dengan jadwal bulan lalu

### Test Case 1: Import Data Baru dengan Jadwal Masa Lalu
**Skenario:** Import data hari ini (September 2026) dengan jadwal Agustus 2026

**Langkah:**
1. [ ] Buat file Excel dengan data alat baru
2. [ ] Set jadwal PM/Kalibrasi = Agustus 2026
3. [ ] Import file tersebut (tanggal import = hari ini)
4. [ ] Filter dashboard ke **Agustus 2026**
5. [ ] Filter dashboard ke **September 2026**

**Expected Result:**
- [ ] ✅ Data TIDAK muncul di filter Agustus 2026
- [ ] ✅ Data MUNCUL di filter September 2026 dan seterusnya

**Actual Result:**
- Agustus 2026: _______________
- September 2026: _______________

### Test Case 2: Data Lama Tetap Muncul di Periode Historis
**Skenario:** Data yang sudah ada sebelumnya tetap valid untuk periode historis

**Langkah:**
1. [ ] Pilih data alat yang sudah lama ada (created_at < Januari 2026)
2. [ ] Filter dashboard ke **Januari 2026**
3. [ ] Filter dashboard ke **Juni 2026**
4. [ ] Filter dashboard ke **Agustus 2026**

**Expected Result:**
- [ ] ✅ Data lama muncul di semua periode yang sesuai dengan jadwalnya
- [ ] ✅ Tidak ada data yang hilang dari dashboard

**Actual Result:**
- Data lama terlihat normal: [ ] Ya / [ ] Tidak
- Catatan: _______________

### Test Case 3: Backward Compatibility (created_at NULL)
**Skenario:** Data lama tanpa created_at tetap berfungsi normal

**Langkah:**
1. [ ] Check apakah ada data dengan created_at = NULL
   ```sql
   SELECT COUNT(*) FROM daftaralat WHERE created_at IS NULL;
   SELECT COUNT(*) FROM kalibrasi WHERE created_at IS NULL;
   ```
2. [ ] Filter berbagai periode historis
3. [ ] Pastikan data legacy tetap muncul

**Expected Result:**
- [ ] ✅ Data legacy (created_at NULL) muncul di semua periode

**Actual Result:**
- Count NULL created_at: _______________
- Data legacy visible: [ ] Ya / [ ] Tidak

---

## 🎯 Fix #2: Dashboard Calibration Count Bug

### Test Case 4: Total Jadwal Kalibrasi
**Skenario:** Dashboard menampilkan total yang benar (950, bukan 929)

**Langkah:**
1. [ ] Clear cache: `localStorage.removeItem('dashboard_data_cache')`
2. [ ] Refresh dashboard
3. [ ] Lihat total jadwal kalibrasi di dashboard
4. [ ] Run SQL verification:
   ```sql
   SELECT COUNT(DISTINCT k.id) as unique_schedules
   FROM kalibrasi k
   JOIN daftaralat d ON k.id_alat = d.id_alat
   WHERE d.obsolete = false;
   ```

**Expected Result:**
- [ ] ✅ Dashboard total = 950 (atau sesuai SQL unique count)
- [ ] ✅ Dashboard total ≠ 929 (bug lama)

**Actual Result:**
- Dashboard total: _______________
- SQL unique count: _______________
- Match: [ ] Ya / [ ] Tidak

### Test Case 5: 6-Monthly Schedules (Double Count Issue)
**Skenario:** Jadwal 6-bulanan tidak dihitung 2x

**Langkah:**
1. [ ] Identifikasi jadwal dengan interval 6 bulan
   ```sql
   SELECT id, id_alat, int, due_date 
   FROM kalibrasi 
   WHERE int = '6' OR int LIKE '%6%'
   LIMIT 5;
   ```
2. [ ] Catat ID jadwal 6-bulanan
3. [ ] Lihat di console browser (F12) log dari `getTotalSchedules()`
4. [ ] Pastikan setiap `calibration_id` hanya dihitung 1x

**Expected Result:**
- [ ] ✅ Jadwal 6-bulanan (muncul 2 bulan) hanya dihitung 1x di total
- [ ] ✅ Console log menunjukkan "Unique calibration IDs"

**Actual Result:**
- 6-monthly schedules count: _______________
- Console log terlihat: [ ] Ya / [ ] Tidak

---

## 🎯 Verification: 3 Calibration Interval Types

### Test Case 6: 6-Monthly Intervals
**Skenario:** Jadwal 6-bulanan muncul di 2 bulan yang benar

**Langkah:**
1. [ ] Filter ke tahun 2026
2. [ ] Cari jadwal dengan `int = "6"` dan `due_date = "Jan, Jul"`
3. [ ] Pastikan muncul di **Januari** dan **Juli** saja

**Expected Result:**
- [ ] ✅ Muncul di Jan & Jul
- [ ] ❌ Tidak muncul di bulan lain

**Actual Result:** _______________

### Test Case 7: Yearly Intervals
**Skenario:** Jadwal tahunan muncul setiap tahun di bulan yang sama

**Langkah:**
1. [ ] Cari jadwal dengan `int = "12"` dan `due_date = "Mar"`
2. [ ] Filter ke **2026 - Maret**
3. [ ] Filter ke **2027 - Maret**
4. [ ] Filter ke **2028 - Maret**

**Expected Result:**
- [ ] ✅ Muncul di Maret setiap tahun

**Actual Result:** _______________

### Test Case 8: 2-Yearly Intervals
**Skenario:** Jadwal 2-tahunan muncul berdasarkan last_execution

**Langkah:**
1. [ ] Cari jadwal dengan `int = "24"` atau `int = "2 years"`
2. [ ] Check `last_execution` jadwal tersebut
3. [ ] Hitung tahun berikutnya = last_execution_year + 2
4. [ ] Filter ke tahun yang seharusnya muncul

**Expected Result:**
- [ ] ✅ Muncul di tahun yang benar sesuai modulo logic
- [ ] ❌ Tidak muncul di tahun yang tidak sesuai

**Actual Result:** _______________

---

## 📊 SQL Diagnostic (Optional - If Issues Found)

### Query 1: Verify Created_At Columns
```sql
-- Run: verify-created-at-columns.sql
```
- [ ] All tables have created_at column
- [ ] Triggers are active
- Result: _______________

### Query 2: Find Count Discrepancy
```sql
-- Run: debug-929-vs-950-specific.sql
```
- [ ] Query #1: Total unique schedules = _______________
- [ ] Query #2: Sum of monthly counts = _______________
- [ ] Query #3: Obsolete equipment count = _______________
- [ ] Query #4: Invalid due_date count = _______________
- [ ] Query #5: Difference analysis = _______________

### Query 3: Historical Filter Debug
```sql
-- Check specific imported data
SELECT 
    id_alat,
    nama_alat,
    created_at,
    created_by
FROM daftaralat
WHERE created_at > '2026-09-01'
ORDER BY created_at DESC
LIMIT 10;
```
Result: _______________

---

## ✅ Final Verification

### All Tests Passed?
- [ ] Historical filter working correctly
- [ ] Dashboard count shows 950 (or correct unique count)
- [ ] 6-monthly schedules count once, display twice
- [ ] Yearly schedules appear every year
- [ ] 2-yearly schedules use modulo logic correctly
- [ ] No data lost or missing
- [ ] Legacy data (created_at NULL) still works

### Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Notes:
_______________________________________________
_______________________________________________
_______________________________________________

---

## 📝 Sign-off

**Tester:** _______________  
**Date:** _______________  
**Status:** [ ] PASSED / [ ] FAILED / [ ] NEEDS REVIEW

**Developer Notes:**
_______________________________________________
_______________________________________________
