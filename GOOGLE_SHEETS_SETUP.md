# 🚀 Google Sheets Integration - Setup Guide

## Overview
Panduan lengkap untuk setup Google Sheets sebagai database alternatif saat Supabase down.

---

## 📋 Pre-requisites

### Yang Anda butuhkan:
1. Google Account
2. Google Sheets (baru atau existing)
3. Spreadsheet ID (dari URL)
4. Browser modern (Chrome, Firefox, Edge, Safari)

---

## 🎯 Step 1: Persiapkan Google Sheets

### Opsi A: Membuat Spreadsheet Baru

1. **Buka Google Sheets**
   - Kunjungi https://sheets.google.com
   - Klik "Buat spreadsheet baru"

2. **Rename Spreadsheet**
   - Klik judul "Untitled spreadsheet"
   - Ubah menjadi: `EEHS Database`

3. **Buat Sheets (Tabs)**
   - Klik `+` di bawah untuk tambah sheet
   - Buat sheets dengan nama:
     - `DaftarAlat` (untuk equipment list)
     - `JadwalKalibrasi` (untuk calibration schedule)
     - `Users` (untuk user data)
     - `Roles` (untuk role permissions)
     - `LogKalibrasi` (untuk calibration logs)
     - `LogPM` (untuk PM logs)

4. **Isi Header Row**

   **Sheet: DaftarAlat**
   ```
   no | no_id | description | type_model | sn | year | location | area | 
   crit_product | crit_process | crit_safety | crit_env | 
   pm_overall | pm_6monthly | pm_yearly | pm_internal_external |
   calib_yesno | calib_schedule | status
   ```

   **Sheet: JadwalKalibrasi**
   ```
   id | no_id | description | last_calibration | next_calibration | status | notes
   ```

   **Sheet: Users**
   ```
   id | nama | email | role | is_active
   ```

   **Sheet: Roles**
   ```
   id | role_name | permissions
   ```

### Opsi B: Menggunakan Existing Spreadsheet

Jika Anda sudah punya spreadsheet:
1. Pastikan memiliki struktur tabel yang sesuai
2. Pastikan header row di baris pertama
3. Skip ke Step 2

---

## 🔗 Step 2: Dapatkan Spreadsheet ID

1. **Buka Spreadsheet Anda**
   - Di Google Sheets, buka spreadsheet yang ingin digunakan

2. **Copy Spreadsheet ID dari URL**
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit#gid=0
                                          ^^^^^^^^^^^^^^^^
                                          Copy bagian ini
   ```

3. **Format ID**
   - Contoh: `1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P`
   - Panjang biasanya 44 karakter

---

## ⚙️ Step 3: Konfigurasi di Aplikasi

### Cara 1: Via Setup Wizard (Recommended)

1. **Buka Aplikasi**
   - Login atau akses halaman setup
   - Jika sudah login, buka Settings > Konfigurasi Sistem

2. **Masukkan Spreadsheet ID**
   - Paste Spreadsheet ID yang sudah dicopy
   - Klik "Test Koneksi"
   - Jika berhasil, klik "Switch Database"

### Cara 2: Manual di Console

Jika Anda developer, bisa langsung inject config:

```javascript
// Buka browser console (F12)
// Paste kode ini:

const config = {
  database_type: 'spreadsheet',
  spreadsheet_id: 'PASTE_YOUR_ID_HERE',
  spreadsheet_url: 'https://docs.google.com/spreadsheets/d/PASTE_YOUR_ID_HERE/edit',
  is_active: true,
  updated_at: new Date().toISOString(),
  updated_by: 'manual'
}

localStorage.setItem('active_database_config', JSON.stringify(config))

// Refresh halaman
window.location.reload()
```

---

## ✅ Step 4: Verifikasi Setup

### Test Connection

1. **Via Console**
   ```javascript
   // Di browser console:
   import { testGoogleSheetsConnection } from '@/api/googleSheets/sheetsDatasource'
   
   testGoogleSheetsConnection('YOUR_SPREADSHEET_ID').then(result => {
     console.log(result)
   })
   ```

2. **Via UI**
   - Buka Settings > Konfigurasi Sistem
   - Klik "Test Koneksi"
   - Harus muncul "Connection successful"

### Check Current Database

```javascript
// Di console:
import { getCurrentDatabaseSource } from '@/api/databaseAdapter'
import { getDatabaseConfig } from '@/src/config/databaseConfig'

console.log(getCurrentDatabaseSource())
console.log(getDatabaseConfig())
```

---

## 📊 Data Format Reference

### DaftarAlat (Equipment)

Minimal fields yang diperlukan:
```
no | no_id | description | type_model | sn | year | status
```

Contoh data:
```
1 | EQ-001 | Pressure Gauge | Model-A | SN12345 | 2020 | active
2 | EQ-002 | Temperature Sensor | Model-B | SN12346 | 2021 | active
```

### JadwalKalibrasi (Calibration Schedule)

```
id | no_id | description | last_calibration | next_calibration | status
1 | EQ-001 | Pressure Gauge | 2026-01-15 | 2026-07-15 | scheduled
```

### Users

```
id | nama | email | role | is_active
1 | Admin User | admin@eehs.local | admin | Y
2 | John Doe | john@eehs.local | user | Y
```

---

## 🔄 Switching Back to Supabase

Saat Supabase sudah bisa diakses lagi:

1. **Via Settings**
   - Buka Settings > Konfigurasi Sistem
   - Pilih "Supabase (PostgreSQL)"
   - Klik "Switch Database"
   - Confirm

2. **Via Console**
   ```javascript
   import { switchToSupabase } from '@/src/config/databaseConfig'
   
   switchToSupabase('Back to Supabase - normal operations')
   window.location.reload()
   ```

---

## ⚡ Performance Tips

### 1. Data Caching
- Default cache TTL: 5 menit
- Change cache TTL:
  ```javascript
  import { dataLoader } from '@/services/dataLoader'
  dataLoader.setCacheTTL(10 * 60 * 1000) // 10 menit
  ```

### 2. Clear Cache
- Jika data tidak update, clear cache:
  ```javascript
  import { clearSheetsCache } from '@/api/googleSheets/sheetsDatasource'
  clearSheetsCache()
  ```

### 3. Limit Data
- Jika spreadsheet besar, buat filter di setup
- Contoh: Hanya load active items
  ```javascript
  // Di data loading:
  const data = await dataLoader.loadDaftarAlat({
    statusFilter: 'active'
  })
  ```

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to spreadsheet"

**Solusi:**
1. Verifikasi Spreadsheet ID benar
2. Pastikan spreadsheet bukan private
3. Jika private, share dengan "Anyone with the link"
4. Tunggu 1-2 menit setelah share

### Problem: "Empty spreadsheet"

**Solusi:**
1. Pastikan data sudah ada di sheet
2. Pastikan header row di baris pertama
3. Tidak ada baris kosong di tengah data
4. Clear cache dan refresh

### Problem: "Data tidak tampil di dashboard"

**Solusi:**
1. Check console (F12) untuk error messages
2. Verify database config:
   ```javascript
   // Di console:
   import { getDatabaseConfig } from '@/src/config/databaseConfig'
   console.log(getDatabaseConfig())
   ```
3. Test data loading:
   ```javascript
   import { dataLoader } from '@/services/dataLoader'
   dataLoader.loadDaftarAlat().then(data => console.log(data))
   ```

### Problem: "CORS Error"

**Nota:** Google Sheets bisa diakses langsung dari browser tanpa memerlukan API key atau authentication khusus.

Jika masih error CORS:
1. Pastikan browser support fetch API
2. Disable browser extensions yang block requests
3. Try di browser lain

---

## 🔐 Security Notes

### Data Privacy
- Google Sheets data dapat diakses siapa saja dengan spreadsheet ID
- Jangan share spreadsheet ID di tempat umum
- Gunakan "Viewer" permission untuk read-only access

### Best Practices
1. Set spreadsheet ke "Viewer" only (no edit access from public)
2. Backup data secara regular
3. Jangan store sensitive info di Google Sheets
4. Monitor spreadsheet access logs

---

## 📞 Support

Jika mengalami issue:

1. **Check logs**
   - F12 > Console
   - Cari messages dengan `[` prefix (misalnya `[databaseAdapter]`)

2. **Test connection**
   ```javascript
   import { testGoogleSheetsConnection } from '@/api/googleSheets/sheetsDatasource'
   testGoogleSheetsConnection('YOUR_ID')
   ```

3. **Check data**
   ```javascript
   import { getTableData } from '@/api/googleSheets/sheetsDatasource'
   getTableData('YOUR_ID', 'daftaralat')
   ```

---

## 📚 Quick Reference

### Key Files
- `src/config/databaseConfig.js` - Database configuration
- `src/api/googleSheets/sheetsDatasource.js` - Google Sheets adapter
- `src/services/dataLoader.js` - Data loading service
- `src/views/setup/GoogleSheetsSetup.vue` - Setup wizard

### Important Functions
```javascript
// Get current config
import { getDatabaseConfig } from '@/src/config/databaseConfig'

// Switch database
import { switchToGoogleSheets } from '@/src/config/databaseConfig'

// Load data
import { dataLoader } from '@/services/dataLoader'

// Test connection
import { testGoogleSheetsConnection } from '@/api/googleSheets/sheetsDatasource'
```

---

**Version**: 1.0  
**Last Updated**: June 2026  
**Author**: Engineering Team
