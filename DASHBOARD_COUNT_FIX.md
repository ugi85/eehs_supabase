# Dashboard Count Fix - Executed vs Scheduled Mismatch

## 📋 Masalah yang Ditemukan

**Gejala:**
- Dashboard bulan Agustus 2026 menampilkan **104/103** dengan badge **kuning** (warning)
- Persentase bar sudah **100%** (hijau penuh)
- Seharusnya badge juga hijau karena semua jadwal sudah selesai

## 🔍 Root Cause Analysis

### 1. Kondisi Badge di Frontend (DashboardChart.vue)
```vue
<!-- SEBELUM FIX -->
:class="item.executed === item.count && item.count > 0 ? 'badge-success' : 'badge-warning'"
```

**Masalah:** Kondisi `item.executed === item.count` mengharuskan nilai **exact match**:
- `executed = 104` (jumlah log aktivitas yang tercatat)
- `count = 103` (jumlah jadwal yang direncanakan)
- `104 !== 103` → badge tetap **kuning** ❌

### 2. Penyebab Data Mismatch (executed > count)

Ada **3 kemungkinan penyebab**:

1. **Duplikasi Log Aktivitas**
   - Equipment yang sama tercatat 2x di bulan yang sama
   - Contoh: Equipment A di-kalibrasi 2x di Agustus

2. **Log Tanpa Jadwal**
   - Ada log aktivitas untuk equipment yang tidak punya jadwal di Agustus
   - Atau equipment sudah obsolete tapi masih ada log

3. **Logic Count yang Kurang Tepat**
   - Filter untuk menghitung scheduled count mungkin melewatkan 1 equipment
   - Atau ada perbedaan interpretasi "bulan Agustus" (string matching vs date parsing)

## ✅ Perbaikan yang Dilakukan

### Fix #1: Update Kondisi Badge (Frontend)

**File:** `src/views/DashboardChart.vue`

```vue
<!-- SETELAH FIX -->
<!-- Gunakan persentase >= 100% sebagai kondisi hijau -->
:class="item.executedPercentage >= 100 && item.count > 0 ? 'badge-success' : 'badge-warning'"
```

**Manfaat:**
- Badge hijau jika persentase ≥ 100%, tanpa peduli executed vs count
- Lebih fleksibel untuk kasus executed > count
- Konsisten dengan tampilan progress bar

### Fix #2: Safety Guard di Backend (API)

**File:** `src/api/supabase/logAktivitasApi.js`

#### Untuk Kalibrasi (processMonthlyData)
```javascript
// SEBELUM FIX
const count = isPast ? executed : validItems.length

// SETELAH FIX
let count = isPast ? executed : validItems.length
count = Math.max(count, executed) // ✅ Pastikan count >= executed
```

#### Untuk PM (processPMMonthlyData)
```javascript
// SEBELUM FIX
const count = isPastPeriodCheck ? executed : monthData.length

// SETELAH FIX
let count = isPastPeriodCheck ? executed : monthData.length
count = Math.max(count, executed) // ✅ Pastikan count >= executed
```

**Manfaat:**
- Mencegah persentase > 100% (misalnya 104/103 = 101%)
- Jika executed > jadwal, maka count akan di-adjust ke executed
- Progress bar akan tetap maksimal 100%

### Fix #3: Tool Diagnostik SQL

**File:** `debug-august-executed-mismatch.sql`

Script SQL untuk mengidentifikasi penyebab data mismatch:

**7 Langkah Diagnostik:**
1. ✅ Hitung total executed logs
2. ✅ Hitung total scheduled count
3. ✅ Cari logs tanpa jadwal
4. ✅ Cek duplikasi logs (equipment yang sama >1x)
5. ✅ Detail logs yang duplikat
6. ✅ Bandingkan scheduled vs executed per equipment
7. ✅ Summary diagnosis

**Cara Pakai:**
```sql
-- Jalankan di Supabase SQL Editor
-- atau PostgreSQL client
\i debug-august-executed-mismatch.sql
```

## 🔧 Cara Testing

### 1. Testing di Browser
1. Buka dashboard aplikasi
2. Refresh halaman (Ctrl+R atau F5)
3. Clear cache jika perlu:
   - Buka Console (F12)
   - Jalankan: `localStorage.removeItem('dashboard_data_cache')`
   - Refresh lagi

**Expected Result:**
- Badge untuk Agustus sekarang **hijau** ✅
- Menampilkan **104/104** (bukan 104/103)
- Progress bar tetap 100%

### 2. Testing dengan SQL Diagnostic
```sql
-- Jalankan script diagnostic
\i debug-august-executed-mismatch.sql

-- Perhatikan hasil dari:
-- - LANGKAH 4: Ada duplikasi logs?
-- - LANGKAH 3: Ada logs tanpa jadwal?
-- - LANGKAH 7: Diagnosis apa yang muncul?
```

### 3. Testing di Console (Browser DevTools)
```javascript
// Buka Console (F12), jalankan:
const cached = localStorage.getItem('dashboard_data_cache')
const data = JSON.parse(cached)
const august = data.kalibrasiMonthly.find(m => m.month === 'August')
console.log('August data:', august)
// Check: executed, count, executedPercentage
```

## 📊 Perbandingan Before/After

### BEFORE FIX
| Bulan   | Jadwal | Executed | Badge    | Persentase |
|---------|--------|----------|----------|------------|
| August  | 103    | 104      | 🟡 Kuning | 100% ✅    |

**Masalah:** Badge kuning meskipun 100% selesai

### AFTER FIX
| Bulan   | Jadwal | Executed | Badge    | Persentase |
|---------|--------|----------|----------|------------|
| August  | 104    | 104      | 🟢 Hijau  | 100% ✅    |

**Solusi:** Badge hijau karena persentase ≥ 100%

## 🎯 Logic Flow Baru

```
1. API fetch data (getTotalSchedules)
   ↓
2. Hitung executed = COUNT(logs di bulan ini)
   ↓
3. Hitung count = isPast ? executed : scheduled.length
   ↓
4. SAFETY: count = Math.max(count, executed)
   ↓
5. Hitung persentase = Math.min(100, executed/count * 100)
   ↓
6. Frontend render:
   - Badge: persentase >= 100 ? hijau : kuning
   - Bar: max 100% width
```

## 📌 Catatan Penting

1. **Tidak Mengubah Data di Database**
   - Fix ini hanya update logic display, tidak hapus/edit log
   - Data tetap konsisten untuk audit trail

2. **Backward Compatible**
   - Logic lama masih bekerja untuk bulan lain
   - Hanya menambah safety guard untuk edge case

3. **Cache Handling**
   - Cached data akan auto-refresh setelah 30 menit
   - Atau manual clear: `localStorage.removeItem('dashboard_data_cache')`

4. **Investigasi Lanjutan**
   - Gunakan SQL diagnostic untuk cari root cause data
   - Jika ada duplikasi, pertimbangkan untuk cleanup
   - Jika ada logs tanpa jadwal, tambahkan constraint

## 🔮 Rekomendasi Follow-up

### Option 1: Cleanup Data (Jika Ada Duplikasi)
```sql
-- Identifikasi duplikasi dengan SQL diagnostic
-- Lalu hapus log duplikat (HATI-HATI!)
DELETE FROM logaktivitas
WHERE no IN (
  SELECT no FROM (
    SELECT no, 
           ROW_NUMBER() OVER (PARTITION BY no_id, calibration_id, execute_date ORDER BY no) as rn
    FROM logaktivitas
    WHERE jenis = 'Kalibrasi'
      AND execute_date >= '2026-08-01'
      AND execute_date < '2026-09-01'
  ) t WHERE rn > 1
);
```

### Option 2: Tambahkan Constraint di Database
```sql
-- Cegah duplikasi di masa depan
CREATE UNIQUE INDEX idx_unique_log_per_day 
ON logaktivitas (no_id, calibration_id, execute_date, jenis)
WHERE jenis IN ('Kalibrasi', 'PM');
```

### Option 3: Update Logic Count (Pakai DISTINCT)
```javascript
// Di backend API, gunakan DISTINCT untuk hitung unique equipment
const uniqueExecuted = [...new Set(
  allKalibrasiLogsThisMonth.map(l => `${l.no_id}-${l.calibration_id}`)
)].length
```

## 📚 Related Files

- `src/views/DashboardChart.vue` - Frontend display
- `src/api/supabase/logAktivitasApi.js` - Backend API
- `src/composables/useDashboard.js` - Dashboard composable
- `debug-august-executed-mismatch.sql` - SQL diagnostic tool

## ✅ Checklist Setelah Deploy

- [ ] Clear browser cache
- [ ] Refresh dashboard
- [ ] Verify badge Agustus hijau
- [ ] Verify count 104/104 (bukan 104/103)
- [ ] Run SQL diagnostic untuk investigasi root cause
- [ ] Dokumentasikan findings
- [ ] Decide: cleanup data atau adjust logic?

---

**Last Updated:** 31 Agustus 2026  
**Fixed By:** Kiro AI Assistant  
**Issue:** Executed (104) > Count (103) causing yellow badge despite 100% completion
