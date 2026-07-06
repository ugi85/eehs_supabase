# 🧪 Test Google Sheets Integration

## Quick Testing Guide

### Test 1: Verify Setup Wizard Works

```bash
# Dalam browser console, navigasi ke setup page:
# /setup atau catat route yang benar

# Verify setup wizard muncul dan berjalan normal
```

### Test 2: Manual Configuration

Jalankan di browser console (F12 > Console):

```javascript
// Step 1: Verify database config functions exist
import { getDatabaseConfig, switchToGoogleSheets, isUsingGoogleSheets } from '@/src/config/databaseConfig'

console.log('=== Test 1: Config Functions ===')
console.log('Current config:', getDatabaseConfig())
console.log('Is using Google Sheets:', isUsingGoogleSheets())
```

**Expected Output:**
```
Current config: { database_type: 'supabase', ... }
Is using Google Sheets: false
```

### Test 3: Load Sample Data

Sebelum test ini, Anda harus sudah:
1. Buat Google Sheets
2. Isi data sample
3. Catat Spreadsheet ID

```javascript
// Step 2: Switch to Google Sheets
import { switchToGoogleSheets } from '@/src/config/databaseConfig'

switchToGoogleSheets('YOUR_SPREADSHEET_ID_HERE', '', 'Testing integration')
console.log('Switched to Google Sheets')

// Step 3: Test fetch data
import { getTableData } from '@/api/googleSheets/sheetsDatasource'

getTableData('YOUR_SPREADSHEET_ID_HERE', 'DaftarAlat').then(data => {
  console.log('=== Daftar Alat Data ===')
  console.log('Rows fetched:', data.length)
  console.log('Sample row:', data[0])
})
```

**Expected Output:**
```
Rows fetched: 3 (atau berapa baris data Anda)
Sample row: { no: 1, no_id: 'EQ-001', description: 'Pressure Gauge', ... }
```

### Test 4: Data Loader Service

```javascript
// Verify data loader works
import { dataLoader } from '@/services/dataLoader'

console.log('=== Test 4: Data Loader ===')

dataLoader.loadDaftarAlat().then(data => {
  console.log('Daftar Alat loaded:', data.length, 'rows')
  console.log('First item:', data[0])
})

dataLoader.loadJadwalKalibrasi().then(data => {
  console.log('Jadwal Kalibrasi loaded:', data.length, 'rows')
})

dataLoader.loadUsers().then(data => {
  console.log('Users loaded:', data.length, 'rows')
})
```

### Test 5: Database Adapter

```javascript
// Test universal adapter
import { universalFetch, getCurrentDatabaseSource } from '@/api/databaseAdapter'

console.log('=== Test 5: Database Adapter ===')
console.log('Current source:', getCurrentDatabaseSource())

// Fetch data using universal adapter
universalFetch('daftaralat', null).then(data => {
  console.log('Universal fetch result:', data.length, 'rows')
})
```

### Test 6: Dashboard Display

Setelah semua test di atas berhasil:

1. **Refresh Dashboard Page**
   ```
   F5 atau Ctrl+R
   ```

2. **Check Console for Errors**
   - Open F12 > Console
   - Lihat ada error atau tidak
   - Search untuk `[DataLoader]` atau `[databaseAdapter]`

3. **Verify Data Display**
   - Check apakah dashboard menampilkan data
   - Hitung jumlah item yang ditampilkan
   - Cocokkan dengan jumlah data di Google Sheets

### Test 7: Switch Back to Supabase

```javascript
import { switchToSupabase } from '@/src/config/databaseConfig'

switchToSupabase('Testing complete, switching back to Supabase')
console.log('Switched back to Supabase')

// Refresh page
window.location.reload()
```

---

## Complete Test Scenario

### Scenario: Testing with Sample Data

**Step 1: Create Test Google Sheets**
```
Spreadsheet Name: EEHS-Test
Sheets: DaftarAlat, JadwalKalibrasi, Users
```

**Step 2: Add Sample Data**

DaftarAlat sheet:
```
no | no_id | description | type_model | sn | year | location | area | crit_product | crit_process | crit_safety | crit_env | pm_overall | pm_6monthly | pm_yearly | pm_internal_external | calib_yesno | calib_schedule | status
1 | EQ-001 | Pressure Gauge | Model-A | SN001 | 2020 | Lab A | Area 1 | Y | Y | Y | N | Y | Y | N | I | Y | 6M | active
2 | EQ-002 | Thermometer | Model-B | SN002 | 2021 | Lab B | Area 2 | N | Y | N | N | Y | N | Y | E | Y | 12M | active
3 | EQ-003 | Scale | Model-C | SN003 | 2022 | Lab C | Area 1 | Y | Y | N | Y | N | Y | N | I | Y | 6M | active
```

JadwalKalibrasi sheet:
```
id | no_id | description | last_calibration | next_calibration | status | notes
1 | EQ-001 | Pressure Gauge | 2026-01-15 | 2026-07-15 | scheduled | Due in 6 months
2 | EQ-002 | Thermometer | 2025-12-01 | 2026-12-01 | completed | Last calib done
3 | EQ-003 | Scale | 2026-02-20 | 2026-08-20 | scheduled | Pending
```

Users sheet:
```
id | nama | email | role | is_active
1 | Admin User | admin@eehs.local | admin | Y
2 | John Doe | john@eehs.local | user | Y
3 | Jane Smith | jane@eehs.local | user | Y
```

**Step 3: Get Spreadsheet ID**
- Copy from URL
- Format: `1A2B3C4D5E6F7G8H9I0J...`

**Step 4: Run Tests**

```javascript
// Test 1: Config
import { switchToGoogleSheets, getDatabaseConfig } from '@/src/config/databaseConfig'
switchToGoogleSheets('YOUR_TEST_ID')
console.log('Config:', getDatabaseConfig())

// Test 2: Load Data
import { dataLoader } from '@/services/dataLoader'
Promise.all([
  dataLoader.loadDaftarAlat(),
  dataLoader.loadJadwalKalibrasi(),
  dataLoader.loadUsers()
]).then(([alat, jadwal, users]) => {
  console.log('✓ Daftar Alat:', alat.length, 'items')
  console.log('✓ Jadwal Kalibrasi:', jadwal.length, 'items')
  console.log('✓ Users:', users.length, 'items')
})

// Test 3: Refresh page
window.location.reload()
```

**Step 5: Verify Dashboard**
- Check halaman dashboard
- Verify data ditampilkan correct
- Check jumlah item matches

---

## Checklist Before Production

- [ ] Setup wizard tested
- [ ] Manual config tested
- [ ] Data loading works
- [ ] Dashboard displays data correctly
- [ ] Switch to Supabase works
- [ ] No console errors
- [ ] Cache works properly
- [ ] Test connection feature works
- [ ] Data is correctly normalized
- [ ] Performance is acceptable

---

## Common Issues & Solutions

### Issue 1: Data not loading

**Check:**
```javascript
import { getTableData } from '@/api/googleSheets/sheetsDatasource'
getTableData('YOUR_ID', 'DaftarAlat').catch(e => console.error('Error:', e))
```

**Solution:**
- Verify Spreadsheet ID
- Verify sheet name matches (`DaftarAlat` not `Daftar Alat`)
- Verify data exists
- Check network tab (F12 > Network)

### Issue 2: CORS error

**Check:**
```javascript
fetch('https://docs.google.com/spreadsheets/d/YOUR_ID/export?format=csv&sheet=DaftarAlat')
  .then(r => r.text())
  .then(t => console.log(t.substring(0, 100)))
```

**Solution:**
- Verify spreadsheet is public or shared
- Try different browser
- Disable browser extensions

### Issue 3: Cache issues

**Solution:**
```javascript
// Clear all cache
import { clearSheetsCache } from '@/api/googleSheets/sheetsDatasource'
clearSheetsCache()

// Or clear specific cache
localStorage.removeItem('sheets_YOUR_ID_daftaralat')

// Reload
window.location.reload()
```

---

## Debug Mode

Enable detailed logging:

```javascript
// Add to console to see all debug logs
const originalLog = console.log
console.log = function(...args) {
  if (args[0]?.includes?.('[')) {
    originalLog(...args)
  }
}

// Now re-run data loading
import { dataLoader } from '@/services/dataLoader'
dataLoader.loadDaftarAlat()
```

---

**Status**: Ready for Testing  
**Test Coverage**: 7 test scenarios  
**Last Updated**: June 2026
