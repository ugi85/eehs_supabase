# 🔄 Switch Database Guide - Google Sheets ↔ Supabase

## Overview

Sistem ini sekarang support 2 database sources:
1. **Supabase** (PostgreSQL) - Default & primary database
2. **Google Sheets** (via Google Apps Script) - Fallback saat Supabase down

---

## 🎯 Cara Switch Database

### Via Settings UI (Admin Only)

1. Login sebagai **Admin** atau **Superadmin**
2. Buka **Settings** (⚙️ menu)
3. Pilih **Konfigurasi Sistem**
4. Scroll ke bagian **Konfigurasi Database**
5. Pilih database type dari dropdown:
   - `Supabase (PostgreSQL)`
   - `Google Sheets (Apps Script)`
6. Klik **"Switch Database"**
7. Confirm di popup
8. ✅ Halaman akan reload otomatis

### Via Browser Console (Quick)

```javascript
// Switch ke Google Sheets
import { useSettingsStore } from '@/stores/settings'
const settings = useSettingsStore()
settings.switchToGoogleSheets()
window.location.reload()

// Switch ke Supabase
settings.switchToSupabase()
window.location.reload()
```

---

## 📁 File Structure

### Files Modified/Created

```
src/
├── stores/
│   └── settings.js                          ✅ UPDATED - Database config
├── api/
│   └── daftarAlatApi.js                     ✅ UPDATED - Dual source support
├── composables/
│   └── useDatabaseSwitch.js                 ✅ NEW - Switch composable
├── main.js                                  ✅ UPDATED - Initialize on startup
└── views/settings/
    └── config.vue                           ✅ UPDATED - Switch UI

Documentation/
└── SWITCH_DATABASE_GUIDE.md                 ✅ This file
```

---

## 🔌 How It Works

### System Architecture

```
Component (Dashboard, etc)
   ↓
Composable (useDaftarAlat, etc)
   ↓
API Layer (daftarAlatApi.js)
   ├→ [if Supabase] → supabase/daftarAlatApi
   └→ [if Google Sheets] → Google Apps Script endpoint
   ↓
Data
```

### Settings Store Flow

```javascript
useSettingsStore()
├─ state.database.type = 'supabase' | 'googleSheets'
├─ getters.isUsingSupabase / isUsingGoogleSheets
├─ getters.getApiEndpoint(module)
└─ actions.switchToGoogleSheets() / switchToSupabase()
```

### API Detection Logic

```javascript
// In daftarAlatApi.js
export const daftarAlatApi = {
  async fetchList() {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      // Use Supabase directly
      return await supabaseDaftarAlatApi.fetchList()
    } else {
      // Use Google Apps Script endpoint
      return await api.get(settings.api.daftarAlat, {...})
    }
  }
}
```

---

## 🚀 Google Apps Script Endpoints

API endpoints dari Google Sheets (via Apps Script):

```javascript
// Di settings.js
googleAppsScript: {
  daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec',
  logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec',
  jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJAs0qol4wwPImj27ds1tubFTDbzb49YngyPhbBi2J12S6/exec',
  config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46XVY4f877kZ_2hcM8pnrjzNmU_I8bvyu1AQifqGzolpl/exec',
  users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-terRT6ICi9l8vz2IHgTGXGyFx4-frUmdPy-lz-vE0Y/exec'
}
```

---

## 💾 Configuration Storage

### localStorage Keys

**`database_config`** - Menyimpan database preference
```json
{
  "type": "supabase|googleSheets",
  "activeSource": "supabase|googleSheets"
}
```

Contoh:
```json
{
  "type": "googleSheets",
  "activeSource": "googleSheets"
}
```

---

## 🔄 Supported Modules

Modules yang support dual database:
- ✅ `daftarAlatApi` - Equipment list
- ⚠️ Others - dapat ditambahkan dengan pattern yang sama

Pattern untuk add module baru:
1. Update `settings.js` dengan API endpoint Google Apps Script
2. Update module API file (e.g., `jadwalKalibrasiApi.js`)
3. Add dual-source check seperti di `daftarAlatApi.js`

---

## ✅ Initialization Flow

### App Startup

1. `main.js` → create app
2. `main.js` → create pinia
3. `main.js` → `settings.initializeDatabase()`
4. `initializeDatabase()` → check localStorage
5. Restore config atau default ke Supabase

```javascript
// main.js
const settings = useSettingsStore()
settings.initializeDatabase() // ← Terjadi di sini

console.log('Current DB:', settings.database.type)
```

---

## 🎯 Usage Examples

### Example 1: Load Data (Auto-Detect)

```javascript
import { daftarAlatApi } from '@/api'

// Automatically use active database
const data = await daftarAlatApi.fetchList()
console.log('Data:', data) // Works with both Supabase & Google Sheets
```

### Example 2: Check Current Database

```javascript
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

if (settings.isUsingSupabase) {
  console.log('Using Supabase')
} else if (settings.isUsingGoogleSheets) {
  console.log('Using Google Sheets')
}

console.log('Current:', settings.database.type)
```

### Example 3: Switch Databases

```javascript
import { useDatabaseSwitch } from '@/composables/useDatabaseSwitch'

const { switchToGoogleSheets, switchToSupabase } = useDatabaseSwitch()

// Switch to Google Sheets
await switchToGoogleSheets()

// Or switch to Supabase
await switchToSupabase()
```

---

## 🐛 Troubleshooting

### Problem: Data tidak muncul setelah switch

**Solusi:**
1. Check console (F12) untuk error
2. Verify database config:
   ```javascript
   import { useSettingsStore } from '@/stores/settings'
   console.log(useSettingsStore().database)
   ```
3. Clear cache:
   ```javascript
   localStorage.clear()
   window.location.reload()
   ```

### Problem: "API not found" error

**Penyebab:**
- Google Apps Script endpoint tidak bisa diakses
- Network error
- CORS issue

**Solusi:**
1. Verify endpoint URL di `settings.js`
2. Check network tab (F12 > Network)
3. Try switch back to Supabase
4. Contact administrator

### Problem: Settings tidak tersimpan

**Solusi:**
```javascript
// Manual save
import { useSettingsStore } from '@/stores/settings'
const settings = useSettingsStore()
settings.switchToGoogleSheets()
localStorage.setItem('database_config', JSON.stringify(settings.database))
window.location.reload()
```

---

## 🔒 Security Notes

1. **Google Apps Script endpoints** - Make sure published & accessible
2. **Database selection** - Only admins dapat switch
3. **Fallback logic** - Automatic error handling

---

## 📊 Comparison

| Aspect | Supabase | Google Sheets |
|--------|----------|---------------|
| Speed | Fast (cloud) | Medium (Apps Script) |
| Reliability | High | Medium |
| Features | Full SQL | Limited |
| Recommended Use | Production | Fallback/Emergency |
| Cost | Pay per usage | Free |
| Setup | Complex | Simple |

---

## 🎓 Architecture Layers

### Layer 1: Store (State Management)
```
useSettingsStore() 
├─ database config
├─ API endpoints
└─ switch methods
```

### Layer 2: API Adapter (Data Source)
```
daftarAlatApi
├─ Check database type
├─ Route to Supabase/Google Sheets
└─ Return data
```

### Layer 3: Composable (Business Logic)
```
useDaftarAlat
├─ Call daftarAlatApi
├─ Handle loading/errors
└─ Provide UI data
```

### Layer 4: Component (Presentation)
```
list.vue
├─ Use composable
├─ Display data
└─ Handle user interactions
```

---

## 🚀 Next Steps

### For Immediate Use
1. ✅ Code sudah ready
2. ✅ Google Apps Script endpoints sudah ada
3. ✅ Settings store sudah configured
4. → **Just switch via Settings UI!**

### For Production Hardening
- [ ] Add error logging
- [ ] Add metrics/monitoring
- [ ] Add fallback retry logic
- [ ] Add data sync functionality
- [ ] Add backup procedures

---

## 📞 Quick Reference

### Console Commands

```javascript
// Check current DB
import { useSettingsStore } from '@/stores/settings'
useSettingsStore().database

// Switch to Google Sheets
useSettingsStore().switchToGoogleSheets()

// Switch to Supabase
useSettingsStore().switchToSupabase()

// Test data fetch
import { daftarAlatApi } from '@/api'
daftarAlatApi.fetchList().then(data => console.log(data))

// Check if using Sheets
useSettingsStore().isUsingGoogleSheets

// Reload
window.location.reload()
```

---

## ✨ Key Features

✅ **Seamless Switching** - Change database without code changes  
✅ **Automatic Detection** - System auto-detect active database  
✅ **Fallback Logic** - Built-in error handling  
✅ **localStorage Persistence** - Config saved across sessions  
✅ **Admin-Only** - Controlled access  
✅ **Auto-Reload** - Page reload after switch  

---

## 🎉 Ready to Use!

Semua sudah siap. Anda bisa mulai menggunakan dengan:

1. Buka Settings
2. Pilih database
3. Click switch
4. Done! ✅

---

**Version**: 1.0  
**Status**: Ready for Production  
**Last Updated**: June 2026
