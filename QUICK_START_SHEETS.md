# ⚡ Quick Start - Google Sheets sebagai Database

## Untuk Anda yang ingin langsung mencoba!

---

## 🎯 3 Langkah Mudah

### Langkah 1: Buat Google Sheets (5 menit)

1. Buka https://sheets.google.com
2. Klik "Buat spreadsheet baru"
3. Rename menjadi: `EEHS Database`
4. Di sheet pertama, rename tab menjadi: `DaftarAlat`

**Isi header row (baris pertama):**
```
no | no_id | description | type_model | sn | year | location | area | crit_product | crit_process | crit_safety | crit_env | pm_overall | pm_6monthly | pm_yearly | pm_internal_external | calib_yesno | calib_schedule | status
```

**Tambahkan data (baris 2-4):**
```
1 | EQ-001 | Pressure Gauge | Model-A | SN001 | 2020 | Lab A | Area 1 | Y | Y | Y | N | Y | Y | N | I | Y | 6M | active
2 | EQ-002 | Thermometer | Model-B | SN002 | 2021 | Lab B | Area 2 | N | Y | N | N | Y | N | Y | E | Y | 12M | active
3 | EQ-003 | Scale | Model-C | SN003 | 2022 | Lab C | Area 1 | Y | Y | N | Y | N | Y | N | I | Y | 6M | active
```

Done! ✅

### Langkah 2: Copy Spreadsheet ID (1 menit)

1. Lihat URL di browser:
   ```
   https://docs.google.com/spreadsheets/d/[COPY_INI]/edit
   ```
2. Copy bagian `[COPY_INI]` - itu Spreadsheet ID Anda
3. Simpan di notepad atau clipboard

**Contoh:**
```
1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P
```

### Langkah 3: Setup di Aplikasi (2 menit)

**Opsi A - Via Console (Recommended for Quick Test):**

1. Buka aplikasi Anda
2. Tekan `F12` (buka Developer Console)
3. Paste code ini di console:

```javascript
// Set Google Sheets sebagai database
const config = {
  database_type: 'spreadsheet',
  spreadsheet_id: 'PASTE_YOUR_ID_HERE',
  spreadsheet_url: 'https://docs.google.com/spreadsheets/d/PASTE_YOUR_ID_HERE/edit',
  is_active: true,
  updated_at: new Date().toISOString(),
  updated_by: 'setup',
  notes: 'Testing Google Sheets integration'
}

localStorage.setItem('active_database_config', JSON.stringify(config))
console.log('✅ Config saved!')
console.log('Refresh page in 3 seconds...')

// Reload halaman
setTimeout(() => window.location.reload(), 3000)
```

4. Ganti `PASTE_YOUR_ID_HERE` dengan Spreadsheet ID Anda
5. Press Enter
6. Halaman akan reload otomatis

**Opsi B - Via Settings UI:**

1. Buka aplikasi
2. Pergi ke **Settings** (menu ⚙️)
3. Pilih **Konfigurasi Sistem**
4. Scroll ke bawah → **Konfigurasi Database**
5. Pilih "Google Spreadsheet" dari dropdown
6. Paste Spreadsheet ID
7. Klik "Test Koneksi"
8. Klik "Switch Database"
9. Confirm & Reload

---

## ✅ Verifikasi Berhasil

Setelah setup, check:

1. **Dashboard muncul data?**
   - Lihat berapa baris data yang tampil
   - Harus 3 baris (dari sample data)

2. **Console ada error?**
   - Buka F12 > Console
   - Tidak boleh ada error merah
   - OK jika ada warning

3. **Test koneksi:**
   ```javascript
   // Di console:
   import { getDatabaseConfig } from '@/src/config/databaseConfig'
   console.log(getDatabaseConfig())
   ```

**Expected output:**
```javascript
{
  database_type: "spreadsheet",
  spreadsheet_id: "1A2B3C4D5E6F...",
  is_active: true,
  ...
}
```

---

## 🔄 Test Fallback ke Supabase

Saat Supabase sudah bisa diakses, switch kembali:

```javascript
// Di console:
import { switchToSupabase } from '@/src/config/databaseConfig'
switchToSupabase('Back to Supabase')

// Reload halaman
setTimeout(() => window.location.reload(), 1000)
```

---

## 🚨 Troubleshooting Quick Fix

### Problem: "Empty spreadsheet" error

**Fix:**
1. Verify data ada di Google Sheets
2. Verify header row di baris pertama
3. Tidak ada baris kosong di tengah data
4. Clear cache:
   ```javascript
   localStorage.clear()
   window.location.reload()
   ```

### Problem: "Cannot connect" error

**Fix:**
1. Verifikasi Spreadsheet ID benar
2. Make sure spreadsheet adalah public/shared
3. Try copy-paste ID ulang (exact match)
4. Try incognito mode atau browser lain

### Problem: Data tidak tampil

**Fix:**
1. Check console (F12) untuk error details
2. Verify config berhasil disimpan:
   ```javascript
   console.log(localStorage.getItem('active_database_config'))
   ```
3. Try manual test data fetch:
   ```javascript
   import { getTableData } from '@/api/googleSheets/sheetsDatasource'
   getTableData('YOUR_ID', 'DaftarAlat').then(data => console.log(data))
   ```

---

## 📊 File Sheet Reference

Jika ingin add lebih banyak data, gunakan structure ini:

### DaftarAlat (Required)
```
Columns: no, no_id, description, type_model, sn, year, location, area, 
         crit_product, crit_process, crit_safety, crit_env, 
         pm_overall, pm_6monthly, pm_yearly, pm_internal_external,
         calib_yesno, calib_schedule, status

Data type:
- no: number (1, 2, 3...)
- no_id: text (EQ-001, EQ-002...)
- Y/N values: exact "Y" or "N"
- status: "active" or "obsolete"
```

### JadwalKalibrasi (Optional - untuk dashboard lengkap)
```
Columns: id, no_id, description, last_calibration, next_calibration, status, notes

Example:
1 | EQ-001 | Pressure Gauge | 2026-01-15 | 2026-07-15 | scheduled | Due in 6 months
```

### Users (Optional)
```
Columns: id, nama, email, role, is_active

Example:
1 | Admin User | admin@local | admin | Y
2 | John Doe | john@local | user | Y
```

---

## 💡 Tips

1. **Ganti data nanti?**
   - Update di Google Sheets
   - Refresh browser aplikasi
   - Data akan ter-update (cache 5 menit)

2. **Perlu data fresh immediately?**
   - Clear cache:
     ```javascript
     import { clearSheetsCache } from '@/api/googleSheets/sheetsDatasource'
     clearSheetsCache()
     ```
   - Atau langsung refresh browser

3. **Multiple spreadsheets?**
   - Saat ini hanya support 1 spreadsheet aktif
   - Switch config untuk ganti spreadsheet

4. **Performance?**
   - OK untuk ~1000 rows
   - Untuk lebih besar, pertimbangkan Supabase

---

## ❓ FAQ

**Q: Berapa lama setup?**  
A: 5-10 menit termasuk membuat Google Sheets

**Q: Apakah perlu API key?**  
A: Tidak, Google Sheets bisa diakses langsung

**Q: Aman?**  
A: Tidak simpan data sensitive. Sheets ini untuk fallback only.

**Q: Data hilang jika switch database?**  
A: Tidak, data tetap ada di source masing-masing

**Q: Bisa switch back ke Supabase?**  
A: Iya, hanya klik tombol di Settings

**Q: Kalau mau multiple users edit Sheets?**  
A: Bisa, tapi data cache 5 menit, jadi update mungkin delayed

---

## 📞 Help

Jika ada masalah:

1. **Check console** (F12 > Console) untuk error details
2. **Check config**:
   ```javascript
   console.log(localStorage.getItem('active_database_config'))
   ```
3. **Test data fetch**:
   ```javascript
   import { getTableData } from '@/api/googleSheets/sheetsDatasource'
   getTableData('YOUR_ID', 'DaftarAlat')
   ```
4. **Read full docs**: `GOOGLE_SHEETS_SETUP.md`

---

## 🎯 Next: Full Documentation

Setelah test berjalan, baca:
- **GOOGLE_SHEETS_SETUP.md** - Setup lengkap
- **TEST_SHEETS_INTEGRATION.md** - Test scenarios
- **IMPLEMENTATION_SUMMARY.md** - Technical details

---

**Status**: Ready to Use 🚀  
**Test Time**: ~15 minutes  
**Difficulty**: Easy ✅

Happy Testing! 🎉
