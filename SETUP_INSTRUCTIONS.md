# 🎯 Setup & Configuration - Database Switch Feature

## 📌 Quick Start (Untuk Admin)

### Situation 1: Supabase Tidak Tersedia (Down/Error)

**Apa yang harus dilakukan:**

1. **Jika Anda Sudah Login:**
   - Cari tombol **"DB"** (warna merah) di navbar atas
   - Klik tombol tersebut
   - Skip ke step 4

2. **Jika Anda Belum Bisa Login:**
   - Buka URL: `http://your-site/emergency-switch`
   - Lanjut ke step 4

3. **Lihat Status Database Saat Ini**
   - Halaman akan menunjukkan database yang sedang digunakan
   - Jika masih Supabase, lanjut

4. **Pilih Google Sheets**
   - Di bagian "Pilih Database", pilih opsi "Google Sheets (Apps Script)"
   - Akan terlihat info endpoint yang sudah siap

5. **Klik Tombol Switch**
   - Tekan tombol besar "Switch ke Google Sheets"
   - Akan muncul popup konfirmasi
   - Klik OK untuk lanjut

6. **Tunggu Redirect**
   - Sistem akan redirect ke dashboard
   - Data akan dimulai loading dari Google Sheets
   - Tunggu 2-3 detik sampai semua data tampil

7. **Verifikasi**
   - Dashboard seharusnya menampilkan angka-angka:
     * Total Peralatan
     * Jadwal Kalibrasi
     * Jadwal PM
     * Sisa Aktivitas Bulan Ini
   - Jika angka muncul ✅ = Berhasil!

---

## 🔄 Cara Switch Kembali ke Supabase (Setelah Recover)

**Ketika Supabase sudah normal kembali:**

1. Buka `/emergency-switch` atau klik tombol "DB" di navbar
2. Pilih opsi "Supabase (Primary)"
3. Klik tombol "Switch ke Supabase"
4. Verifikasi dashboard menampilkan data
5. Selesai!

---

## 🛠️ Troubleshooting

### Problem 1: Dashboard Kosong Setelah Switch

**Penyebab:** Data masih di-cache dari database lama

**Solusi:**
1. Buka browser DevTools (F12)
2. Buka tab Console
3. Jalankan: `localStorage.removeItem('dashboard_data_cache')`
4. Refresh halaman (F5)
5. Data seharusnya loading dari database yang baru

### Problem 2: Tulisan "Gagal Memuat Data" di Dashboard

**Penyebab:** 
- Google Apps Script endpoint timeout
- Koneksi internet lambat
- Google Apps Script error

**Solusi:**
1. Tunggu 2-3 detik
2. Klik tombol "Coba Lagi" di dashboard
3. Atau refresh halaman (F5)

**Jika tetap error:**
1. Buka DevTools (F12)
2. Tab Network, cek request ke `script.google.com`
3. Apakah berhasil? Jika tidak = Google Apps Script down
4. Hubungi technical support

### Problem 3: Tidak Ada Tombol "DB" di Navbar

**Penyebab:** 
- Browser cache lama
- Belum update kode

**Solusi:**
- Refresh page dengan Ctrl+F5 (hard refresh)
- Atau buka `/emergency-switch` langsung di URL

### Problem 4: Tombol Switch Tidak Merespons

**Penyebab:** 
- Switch masih sedang berjalan (loading)
- Browser error

**Solusi:**
1. Tunggu beberapa detik
2. Refresh halaman
3. Coba lagi
4. Jika tetap tidak bisa, clear localStorage: `localStorage.clear()`

---

## 📋 Checklist Sebelum Emergency Switch

Sebelum melakukan switch database, pastikan:

- [ ] Anda tahu alasannya (Supabase sedang down?)
- [ ] Data Google Sheets sudah ter-sync dengan Supabase
- [ ] Tidak ada operasi write (create/update/delete) yang sedang berjalan
- [ ] Anda sudah memberitahu tim tentang temporary read-only mode
- [ ] Backup data sudah ada (jika diperlukan)

---

## ⚙️ Technical Details (Untuk Developer)

### Architecture

```
┌─ DASHBOARD PAGE ─────────────────────────┐
│  DashboardChart.vue                      │
│  ├─ useDashboard() composable            │
│  └─ import { logAktivitasApi } from '@/api'
└──────────────────────────────────────────┘
           ↓
┌─ ROUTER LAYER ───────────────────────────┐
│  src/api/logAktivitas.js (NEW)           │
│  ├─ Checks: useSettingsStore.database    │
│  └─ Routes to correct API                │
└──────────────────────────────────────────┘
        ↙                        ↘
┌──────────────────────┐  ┌──────────────────────┐
│ SUPABASE API         │  │ GOOGLE SHEETS API    │
│ Direct Query         │  │ Google Apps Script   │
│ Full read/write      │  │ Read-only (for now)  │
└──────────────────────┘  └──────────────────────┘
```

### Data Flow

1. **Dashboard minta data:** `await logAktivitasApi.getTotalSchedules(year)`

2. **Router mengecek database type:**
   ```javascript
   if (settings.isUsingSupabase) {
     // Use Supabase
   } else {
     // Use Google Sheets
   }
   ```

3. **Jalankan query ke database yang sesuai**

4. **Return data ke dashboard**

### Key Files

| File | Purpose | Status |
|------|---------|--------|
| `src/api/logAktivitas.js` | Router wrapper | ✨ NEW |
| `src/api/index.js` | Export management | ✏️ Modified |
| `src/stores/settings.js` | Config storage | ✓ Existing |
| `src/composables/useDashboard.js` | Dashboard logic | ✏️ Enhanced |
| `src/plugins/axios.js` | HTTP client | ✏️ Timeout increased |
| `src/views/pages/EmergencyDatabaseSwitch.vue` | Emergency UI | ✏️ Fixed |

---

## 🧪 Testing Steps

### Test 1: Basic Switch

```
1. Go to /dashChart (dashboard)
2. Note the numbers shown (e.g., Total Peralatan: 150)
3. Open /emergency-switch
4. Switch to Google Sheets
5. Dashboard reloads
6. Numbers seharusnya sama atau berubah (depends on sync status)
7. Check console: [logAktivitasApi] Current database type: googleSheets
```

### Test 2: Cache Clearing

```
1. Load dashboard
2. Note the data displayed
3. Switch database
4. Check console: cache should be cleared
5. New data should load from different database
```

### Test 3: Persistence

```
1. Switch to Google Sheets
2. Reload page (F5)
3. Dashboard should still use Google Sheets
4. Check: localStorage.getItem('database_config')
```

---

## 📊 Database Features Matrix

| Feature | Supabase | Google Sheets |
|---------|----------|---------------|
| **Read Operations** | ✅ Full | ✅ Full (via Apps Script) |
| **Write Operations** | ✅ Full | ❌ Not yet |
| **Delete Operations** | ✅ Full | ❌ Not yet |
| **Authentication** | ✅ Full | ❌ N/A |
| **Real-time Updates** | ✅ Yes | ❌ No |
| **Transactions** | ✅ Yes | ❌ No |
| **Status** | Primary | Fallback |

---

## 🔐 Security Notes

- ✅ Emergency page tidak memerlukan login (by design, untuk emergency access)
- ✅ Database config disimpan di browser localStorage (aman, client-side only)
- ✅ Tidak ada credential disimpan di client
- ⚠️ Google Apps Script URLs public (tapi read-only, rate-limited)

---

## 📞 Support & Documentation

**Files yang penting:**
- `DATABASE_SWITCH_GUIDE.md` - Detailed user guide
- `DATABASE_SWITCH_CHANGELOG.md` - Technical changes
- `SETUP_INSTRUCTIONS.md` - This file

**Links:**
- Emergency Switch: `http://your-site/emergency-switch`
- Dashboard: `http://your-site/dashChart` atau `http://your-site/`
- Settings: `http://your-site/settings` (admin only)

---

## ✨ Summary

**Yang sekarang bekerja:**
- ✅ Dashboard display data dari database yang dipilih
- ✅ Switch between Supabase dan Google Sheets
- ✅ Emergency access tanpa login
- ✅ Quick access tombol di navbar
- ✅ Data persistence (config tersimpan)
- ✅ Error handling & retry logic
- ✅ Console logging untuk debug

**Yang akan datang:**
- 📋 Write support untuk Google Sheets
- 📋 Automatic failover detection
- 📋 Data sync between databases
- 📋 Usage analytics

---

**Last Updated:** 2026-06-25  
**Status:** ✅ Production Ready  
**Version:** 1.0
