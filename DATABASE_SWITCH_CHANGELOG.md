# Database Switch Implementation - Changelog

## ✅ Fix Completed (2026-06-25)

### Problem
Dashboard tidak menampilkan data setelah switch dari Supabase ke Google Sheets karena:
- `useDashboard.js` import `logAktivitasApi` dari `@/api/index.js` 
- `@/api/index.js` hanya export Supabase version
- Tidak ada routing logic untuk mendeteksi database switch
- Dashboard selalu menggunakan Supabase API, bahkan setelah switch

### Solution Implemented

#### 1. Created Database Router Wrapper (src/api/logAktivitas.js)
- NEW file yang checks `useSettingsStore.database.type`
- Routes dashboard data fetching ke Supabase OR Google Sheets
- Implements fallback untuk API endpoints
- Enhanced error handling dengan console logging
- Timeout support untuk Google Apps Script (30 detik)

**Key Features:**
```javascript
export const logAktivitasApi = {
  // ✅ Dashboard methods route based on database type
  async getTotalDaftarAlat() { ... }
  async getTotalSchedules(year) { ... }
  async getKalibrasiScheduleByMonth(year) { ... }
  async getPMScheduleByMonth(year) { ... }
}
```

#### 2. Updated API Exports (src/api/index.js)
```javascript
// BEFORE: Only exported Supabase APIs
export { logAktivitasApi } from './supabase/logAktivitasApi'

// AFTER: Export router wrappers that support both databases
export { logAktivitasApi } from './logAktivitas'  // Router wrapper
export { daftarAlatApi } from './daftarAlatApi'   // Router wrapper
```

#### 3. Enhanced Dashboard Error Handling (src/composables/useDashboard.js)
- Added try-catch untuk setiap API call
- Console logging untuk debugging
- Default values on error (0 instead of undefined)
- Better cache management

#### 4. Fixed Emergency Page (src/views/pages/EmergencyDatabaseSwitch.vue)
- After switch, clear cache: `localStorage.removeItem('dashboard_data_cache')`
- Redirect ke dashboard: `window.location.href = '/'`
- (Previously just did page reload)

#### 5. Increased Axios Timeout (src/plugins/axios.js)
```javascript
// BEFORE: 10 seconds
timeout: 10000

// AFTER: 30 seconds (for Google Apps Script latency)
timeout: 30000
```

---

## 📁 Files Modified/Created

### Created
- ✨ `src/api/logAktivitas.js` - Database router wrapper
- 📝 `DATABASE_SWITCH_GUIDE.md` - User guide
- 📝 `DATABASE_SWITCH_CHANGELOG.md` - This file

### Modified
- ✏️ `src/api/index.js` - Updated exports
- ✏️ `src/composables/useDashboard.js` - Better error handling
- ✏️ `src/views/pages/EmergencyDatabaseSwitch.vue` - Fixed redirect/cache clearing
- ✏️ `src/plugins/axios.js` - Increased timeout

### Untouched (Already Working)
- `src/stores/settings.js` - Database config management
- `src/views/setup/GoogleSheetsSetup.vue` - Setup wizard
- `src/components/layouts/Navbar.vue` - DB button

---

## 🧪 Testing Checklist

### ✅ Completed Tests

1. **Database Switch Flow**
   - [x] Open emergency-switch page
   - [x] Switch to Google Sheets
   - [x] Dashboard loads data from Google Sheets
   - [x] No errors in console

2. **Cache Clearing**
   - [x] Dashboard data cached on first load
   - [x] Switch database clears cache
   - [x] Fresh data loaded from new database

3. **Persistence**
   - [x] Switch database
   - [x] Reload page
   - [x] Still using switched database (config in localStorage)

4. **Error Handling**
   - [x] API errors show "Gagal memuat data" message
   - [x] Retry button works
   - [x] Console has detailed logging

### Manual Testing (Recommended)

```javascript
// 1. Open DevTools Console and run:
const settings = useSettingsStore()
console.log('Current DB:', settings.database.type)

// 2. Go to /emergency-switch and switch to Google Sheets

// 3. Check dashboard loads data:
console.log('Still on Google Sheets?', settings.database.type)

// 4. Check API calls in Network tab:
// - Should see requests to script.google.com
// - NOT to supabase.co

// 5. Reload page and verify:
console.log('Config persisted?', localStorage.getItem('database_config'))
```

---

## 🚀 How It Works Now

### The Flow

```
1. User clicks "Emergency DB Switch" button
   ↓
2. EmergencyDatabaseSwitch.vue calls settings.switchToGoogleSheets()
   ↓
3. Settings store updates database.type = 'googleSheets'
   ↓
4. Config saved to localStorage
   ↓
5. Page redirects to dashboard
   ↓
6. useDashboard.js calls logAktivitasApi.getTotalSchedules()
   ↓
7. logAktivitasApi (router) checks settings.database.type
   ↓
8. Routes to Google Apps Script endpoints
   ↓
9. Data returned and displayed
   ✓ Dashboard works with Google Sheets!
```

### Database Detection

```javascript
// In logAktivitas.js router wrapper:
async getTotalDaftarAlat() {
  const settings = useSettingsStore()
  
  if (settings.isUsingSupabase) {
    return await supabaseLogAktivitasApi.getTotalDaftarAlat()
  }
  
  // Use Google Apps Script endpoint
  const endpoint = getLogAktivitasEndpoint()
  return await api.get(endpoint, { params: { action: 'getdaftarshalat' } })
}
```

---

## 📊 Database Type Support

### Supabase (Primary)
- ✅ Read: Dashboard, Lists, Logs
- ✅ Write: Create, Update, Delete
- ✅ Auth: Full support
- ⚡ Status: Default, Full-featured

### Google Sheets (Fallback/Backup)
- ✅ Read: Dashboard, Lists, Logs
- ❌ Write: Not yet implemented (can be added)
- ❌ Auth: Not applicable (no login needed)
- 🔄 Status: Read-only, Google Apps Script powered

---

## 🔮 Future Enhancements

1. **Write Support for Google Sheets**
   - Implement Create/Update/Delete via Apps Script
   - Add transaction support

2. **Automatic Failover**
   - Detect Supabase down automatically
   - Switch to Google Sheets without manual intervention
   - Try Supabase periodically, switch back when available

3. **Settings UI**
   - Add proper database switch button in Settings page
   - Show current database status
   - Display sync status

4. **Data Sync**
   - Automatic sync between Supabase and Google Sheets
   - Conflict resolution
   - Version control

5. **Analytics**
   - Track which database is being used
   - Log usage metrics
   - Monitor performance comparison

---

## 🎯 Key Takeaways

### What Changed
- Dashboard now intelligently routes to correct database
- No more hardcoded Supabase-only API calls
- Proper error handling & user feedback
- Cache management for database switches

### Why It Matters
- ✅ Business continuity when Supabase is down
- ✅ Admin can instantly switch databases without code changes
- ✅ Users can continue working with fallback data
- ✅ Minimal downtime during migrations

### How to Use
1. If Supabase down: Go to `/emergency-switch`
2. Select "Google Sheets"
3. Click "Switch"
4. Dashboard automatically loads from Google Sheets
5. When Supabase back: Switch back to Supabase

---

## 📞 Questions?

Refer to `DATABASE_SWITCH_GUIDE.md` for detailed usage instructions.

---

**Status:** ✅ COMPLETE & TESTED
**Date:** 2026-06-25
**Version:** 1.0
