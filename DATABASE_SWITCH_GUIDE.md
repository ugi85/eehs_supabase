# Panduan Database Switch - Supabase & Google Sheets

## 📋 Ringkasan

Sistem sekarang mendukung **dual-database setup** memungkinkan admin untuk beralih antara Supabase (primary) dan Google Sheets (backup) untuk business continuity.

**Fitur:**
- ✅ Seamless database switching tanpa restart aplikasi
- ✅ Dashboard otomatis menampilkan data dari database yang aktif
- ✅ Emergency access tanpa login saat Supabase down
- ✅ Persistent configuration (tersimpan di localStorage)

---

## 🔄 Cara Menggunakan Database Switch

### Opsi 1: Emergency Page (Tanpa Login)

**Kapan:** Ketika Supabase sedang down dan Anda tidak bisa login

1. Buka URL: `http://your-site/emergency-switch`
2. Halaman akan menampilkan status database saat ini
3. Pilih database yang ingin digunakan (Google Sheets atau Supabase)
4. Klik tombol "Switch ke Google Sheets"
5. Akan muncul konfirmasi, klik OK
6. Halaman akan otomatis redirect ke dashboard dengan data dari Google Sheets

**Keuntungan:**
- Tidak memerlukan login
- Dapat diakses kapan saja
- Cocok untuk emergency

---

### Opsi 2: Navbar Button (Jika Sudah Login)

**Kapan:** Anda sudah bisa login dan ingin switch database

1. Lihat navbar di atas
2. Cari tombol merah dengan label "DB" (Database)
3. Klik tombol tersebut
4. Akan membuka Emergency Database Switch page
5. Ikuti langkah yang sama seperti Opsi 1

**Keuntungan:**
- Quick access dari mana saja di aplikasi
- Tidak perlu mengetik URL

---

### Opsi 3: Settings (Pengaturan - Jika Sudah Login)

**Kapan:** Admin ingin mengonfigurasi database melalui pengaturan

1. Login ke sistem
2. Buka menu "Konfigurasi" atau "Settings"
3. Cari section "Konfigurasi Database" (Admin Only)
4. Pilih database type
5. Klik "Switch Database"

---

## 🎯 Workflow Ketika Supabase Down

```
1. Supabase Tidak Tersedia
   ↓
2. Anda Tidak Bisa Login
   ↓
3. Buka URL: /emergency-switch
   ↓
4. Switch ke Google Sheets
   ↓
5. Dashboard Menampilkan Data dari Google Sheets
   ↓
6. Sistem Tetap Berjalan (READ-ONLY)
   ↓
7. Tunggu Supabase Recover
   ↓
8. Switch Kembali ke Supabase
```

---

## 📊 Apa yang Bisa Diakses di Google Sheets Mode?

✅ **READ-ONLY Features (Bisa Diakses):**
- Dashboard & Charts
- View Daftar Alat
- View Jadwal Kalibrasi
- View Aktivitas Log
- View Users (jika data ada)

❌ **WRITE Features (Tidak Bisa):**
- Create/Update/Delete Alat
- Create/Update/Delete Jadwal Kalibrasi
- Create/Update/Delete Log Aktivitas
- Manage Users

**Note:** Saat ini Google Sheets mode hanya support READ operations. Tulis/edit data perlu menggunakan Supabase.

---

## 🔧 Teknologi & Implementasi

### Architecture

```
┌─────────────────────────────────────────┐
│       Dashboard / UI Components          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    useDashboard Composable               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   logAktivitasApi (Router Wrapper)       │
│  - Checks useSettingsStore.database.type │
│  - Routes to Supabase OR Google Sheets   │
└─────────────────────────────────────────┘
         ↙                      ↘
    ┌──────────────┐      ┌──────────────────┐
    │  Supabase    │      │  Google Sheets   │
    │   API        │      │  + Apps Script   │
    └──────────────┘      └──────────────────┘
```

### Key Files Modified

1. **src/api/logAktivitas.js** (NEW - Router Wrapper)
   - Checks `useSettingsStore.database.type`
   - Routes between Supabase and Google Sheets
   - Used by dashboard composable

2. **src/api/index.js**
   - Updated export untuk menggunakan router wrapper
   - `export { logAktivitasApi } from './logAktivitas'`

3. **src/stores/settings.js**
   - Stores database configuration
   - Methods: `switchToGoogleSheets()`, `switchToSupabase()`
   - Persists config ke localStorage

4. **src/composables/useDashboard.js**
   - Clear cache saat switch (untuk force refresh)
   - Better error handling & logging
   - Automatic retry di background

5. **src/views/pages/EmergencyDatabaseSwitch.vue**
   - Emergency page accessible tanpa login
   - Shows current database status
   - Allows switching dengan confirmation

6. **src/components/layouts/Navbar.vue**
   - Added red "DB" button untuk quick access ke emergency page

7. **src/plugins/axios.js**
   - Increased timeout dari 10s → 30s
   - Untuk accommodate Google Apps Script latency

---

## ⚙️ Configuration Files

### .env (No changes needed)
Database configuration sudah ada di `src/stores/settings.js`

### localStorage Key
- `database_config` - Menyimpan database type & settings
- `dashboard_data_cache` - Menyimpan dashboard data cache

---

## 🚀 Testing Database Switch

### Test Scenario 1: Manual Switch

1. Buka dashboard
2. Lihat data dari Supabase
3. Buka emergency-switch page
4. Switch ke Google Sheets
5. Verifikasi: Dashboard menampilkan data dari Google Sheets
6. Buka browser DevTools > Console
7. Cek logs: `[logAktivitasApi] Current database type: googleSheets`

### Test Scenario 2: Cache Clearing

1. Load dashboard (data di-cache)
2. Switch database
3. Kembali ke dashboard
4. Verifikasi: Data BARU diambil dari database yang baru (bukan cache lama)

### Test Scenario 3: Persistence

1. Switch ke Google Sheets
2. Reload page
3. Verifikasi: Masih menggunakan Google Sheets (config tersimpan di localStorage)

---

## 🔍 Debug & Troubleshooting

### Check Database Status
Buka browser DevTools > Console dan jalankan:

```javascript
// Check current database type
const settings = useSettingsStore()
console.log('Current DB:', settings.database.type)
console.log('API endpoints:', settings.api)

// Check localStorage
console.log('Saved config:', localStorage.getItem('database_config'))
```

### View API Logs
1. Open DevTools > Console
2. Filter logs oleh prefix: `[logAktivitasApi]`
3. Lihat routing decisions dan API calls

### Common Issues

**Masalah:** Dashboard kosong setelah switch
- **Solusi 1:** Refresh page secara manual
- **Solusi 2:** Clear localStorage cache: `localStorage.removeItem('dashboard_data_cache')`
- **Solusi 3:** Check apakah Google Apps Script endpoint aktif

**Masalah:** Data tidak loading dari Google Sheets
- **Penyebab:** Timeout atau CORS issue
- **Solusi:** Check network tab di DevTools, lihat apakah request ke Google Apps Script berhasil
- **Workaround:** Tunggu beberapa saat dan refresh ulang

**Masalah:** Database config hilang setelah clear browser cache
- **Penyebab:** localStorage di-clear
- **Solusi:** Switch database ulang, akan tersimpan kembali di localStorage

---

## 📝 API Endpoints

### Google Apps Script Endpoints (di settings.js)

```javascript
googleAppsScript: {
  daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec',
  logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec',
  jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJAs0qol4wwPImj27ds1tubFTDbzb49YngyPhbBi2J12S6/exec',
  config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46XVY4f877kZ_2hcM8pnrjzNmU_I8bvyu1AQifqGzolpl/exec',
  users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-terRT6ICi9l8vz2IHgTGXGyFx4-frUmdPy-lz-vE0Y/exec'
}
```

### Supported Actions

#### logAktivitas Endpoint
- `action=getdaftarshalat` - Get daftar alat
- `action=getkalibrasiforperiod&month=X&year=Y` - Get kalibrasi per periode
- `action=getpmforperiod&month=X&year=Y` - Get PM per periode

---

## 📞 Support & Maintenance

### Untuk Admin

1. **Regular Testing:** Test database switch setiap bulan untuk memastikan fallback system working
2. **Monitor Logs:** Check aplikasi logs untuk error dari Google Apps Script
3. **Backup Data:** Ensure Google Sheets data selalu up-to-date
4. **Update Endpoints:** Jika URL Google Apps Script berubah, update di `src/stores/settings.js`

### Untuk Developer

1. **Adding New APIs:** Setiap API baru harus membuat router wrapper di `src/api/`
2. **Router Pattern:** Ikuti pattern dari `logAktivitas.js`
3. **Testing:** Always test dengan kedua database (Supabase dan Google Sheets)

---

## 🎓 Pembelajaran Lebih Lanjut

- **Pinia Store:** https://pinia.vuejs.org/
- **Composables:** https://vuejs.org/guide/extras/composition-api-faq.html
- **Axios:** https://axios-http.com/
- **Google Apps Script:** https://developers.google.com/apps-script

---

**Terakhir diupdate:** 2026-06-25
**Versi:** 1.0
**Status:** Production Ready ✅
