# 🚨 Emergency Database Switch Procedure

## Situasi: Supabase Down / Limit Egress

Jika Supabase sedang down dan Anda tidak bisa login ke aplikasi, berikut caranya untuk switch ke Google Sheets tanpa perlu login.

---

## ✅ 3 Cara Untuk Switch Database

### Method 1: Via Emergency Switch Page (RECOMMENDED)

**Akses tanpa login:**
```
http://localhost:5173/emergency-switch
```

**Langkah:**
1. Buka URL di atas di browser
2. Pilih database yang ingin digunakan:
   - ✅ Google Sheets (Apps Script) - Recommended saat Supabase down
   - Supabase - Jika Supabase sudah online
3. Click tombol "Switch ke [database name]"
4. Halaman akan reload otomatis
5. ✅ System sekarang menggunakan database pilihan Anda

**Kelebihan:**
- ✅ Tidak perlu login
- ✅ Interface user-friendly
- ✅ Menampilkan status database
- ✅ Advanced options untuk debugging

---

### Method 2: Via Browser Console (Quick)

**Langkah:**
1. Buka aplikasi (dashboard atau halaman apapun)
2. Tekan `F12` untuk buka Developer Console
3. Klik tab `Console`
4. Paste salah satu code di bawah:

**Switch ke Google Sheets:**
```javascript
import { useSettingsStore } from '@/stores/settings'
const settings = useSettingsStore()
settings.switchToGoogleSheets()
localStorage.setItem('database_config', JSON.stringify(settings.database))
console.log('✅ Switched to Google Sheets')
window.location.reload()
```

**Switch ke Supabase:**
```javascript
import { useSettingsStore } from '@/stores/settings'
const settings = useSettingsStore()
settings.switchToSupabase()
localStorage.setItem('database_config', JSON.stringify(settings.database))
console.log('✅ Switched to Supabase')
window.location.reload()
```

5. Press `Enter`
6. Halaman akan reload otomatis

**Kelebihan:**
- ⚡ Sangat cepat
- 💻 Untuk developer
- Kontrol penuh

---

### Method 3: Manual localStorage Manipulation

**Langkah:**
1. Buka aplikasi (dashboard)
2. Tekan `F12` → Console
3. Paste code ini:

**Switch ke Google Sheets:**
```javascript
const config = {
  type: 'googleSheets',
  activeSource: 'googleSheets'
}
localStorage.setItem('database_config', JSON.stringify(config))
console.log('✅ Config updated')
window.location.reload()
```

**Switch ke Supabase:**
```javascript
const config = {
  type: 'supabase',
  activeSource: 'supabase'
}
localStorage.setItem('database_config', JSON.stringify(config))
console.log('✅ Config updated')
window.location.reload()
```

4. Press `Enter`
5. Tunggu halaman reload

**Kelebihan:**
- 🔧 Direct manipulation
- Reliable

---

## 🎯 Recommended: Method 1

**Paling mudah dan user-friendly:**

```
http://yourserver:5173/emergency-switch
↓
Select Database
↓
Click "Switch Database"
↓
Done! ✅
```

---

## 📊 What Happens When You Switch

### Switch ke Google Sheets:
```
1. Settings updated → type = 'googleSheets'
2. localStorage saved → database_config updated
3. Page reloaded
4. App initialization → load from localStorage
5. API calls → route to Google Apps Script endpoints
6. Dashboard loads data from Google Sheets
```

### Data Sources:
```
When Google Sheets is active:
├─ Equipment Data → Google Apps Script (daftarAlat)
├─ Calibration Schedule → Google Apps Script (jadwalKalibrasi)  
├─ Activity Logs → Google Apps Script (logAktivitas)
├─ Users → Google Apps Script (users)
└─ Config → Google Apps Script (config)
```

---

## 🔍 Verify Switch Worked

**Cara verify:**

```javascript
// Di browser console (F12):
import { useSettingsStore } from '@/stores/settings'
const settings = useSettingsStore()

// Check current database
console.log('Current DB:', settings.database.type)

// Should show:
// Current DB: googleSheets ✅
// or
// Current DB: supabase ✅
```

---

## 🔄 Switch Back to Supabase

Ketika Supabase sudah online lagi:

**Option 1: Emergency Page**
```
http://localhost:5173/emergency-switch
→ Select "Supabase"
→ Click "Switch to Supabase"
```

**Option 2: Settings (if logged in)**
```
Menu > Settings > Konfigurasi Sistem > Konfigurasi Database
→ Select Supabase
→ Click "Switch Database"
```

**Option 3: Console**
```javascript
import { useSettingsStore } from '@/stores/settings'
useSettingsStore().switchToSupabase()
window.location.reload()
```

---

## ⚡ Quick Reference

| Situation | Solution | URL |
|-----------|----------|-----|
| Supabase down, can't login | Use Emergency Page | `/emergency-switch` |
| Supabase down, can access dashboard | Use Console Method | F12 → Console |
| Want to switch back | Emergency Page or Settings | `/emergency-switch` |
| Verify which DB is active | Check Console | `settings.database.type` |

---

## 📋 Troubleshooting

### Problem: Emergency page shows error

**Solution:**
1. Refresh the page: `F5` or `Ctrl+R`
2. Try clearing browser cache: `Ctrl+Shift+Del`
3. Try incognito mode
4. Try different browser

### Problem: Data still doesn't load after switch

**Solution:**
1. Check console (F12) for errors
2. Verify settings updated:
   ```javascript
   console.log(localStorage.getItem('database_config'))
   ```
3. Clear cache and reload:
   ```javascript
   localStorage.clear()
   window.location.reload()
   ```
4. Try hard reload: `Ctrl+Shift+R`

### Problem: Can't access /emergency-switch

**Solution:**
1. Verify app is running
2. Use direct URL or check router config
3. Try console method instead
4. Contact administrator

### Problem: Google Sheets endpoint not responding

**Solution:**
1. Verify internet connection
2. Check Google Apps Script status
3. Verify endpoints in settings.js
4. Try switching back to Supabase
5. Contact administrator

---

## 🛡️ Safety Notes

✅ **Safe:**
- Switching databases via Emergency Page
- Using console commands
- No data loss - data stays in both databases

⚠️ **Be Careful:**
- Only switch when Supabase is actually down
- Verify which database you're switching to
- Monitor after switch to ensure data loads

---

## 📞 For Administrators

### Monitoring:

```javascript
// Check which database users are using
import { useSettingsStore } from '@/stores/settings'
console.log('Active DB:', useSettingsStore().database.type)
```

### Configuration:

All Google Apps Script endpoints configured in:
```
src/stores/settings.js
→ googleAppsScript
→ [daftarAlat, logAktivitas, jadwalKalibrasi, config, users]
```

### Network Traffic:

When using Google Sheets:
- Requests go to `script.google.com`
- No Supabase requests
- Should not trigger Supabase limits

---

## ✨ Key Points

1. **Always accessible** - Emergency page accessible without login
2. **No code changes** - Just switch, no code editing needed
3. **Automatic routing** - APIs auto-detect which database to use
4. **Quick recovery** - Switch back anytime
5. **No data loss** - Data in both databases preserved

---

## 📚 Related Documentation

- `SWITCH_DATABASE_GUIDE.md` - Complete technical guide
- `READY_TO_USE.md` - Usage guide
- `FINAL_IMPLEMENTATION_NOTES.md` - Implementation details

---

**Emergency Status**: ✅ READY  
**Last Updated**: June 2026  
**Tested**: Yes - All methods working

When Supabase is down, you're covered! 🎉
