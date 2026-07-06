# TESTING GUIDE: Complete Database Switch Feature

**Status**: ✅ All fixes applied and build successful
**App Running**: http://localhost:5174/ (or http://localhost:5173/)

---

## 📋 What Was Fixed

### Issue #1: Blank White Screen
- **Root Cause**: Circular dependency in `src/api/users.js` - was trying to access `useSettingsStore` at module load time
- **Solution**: Changed all imports to dynamic `await import()` at runtime inside async functions
- **Files Modified**: 
  - `src/api/users.js` - All 7 methods now use dynamic imports
  - `src/api/logAktivitas.js` - Fixed syntax error (getLogByNo was outside export object)

### Issue #2: Syntax Error in logAktivitas
- **Problem**: `getLogByNo()` method was outside the export object, breaking the build
- **Solution**: Moved method inside the export object as the 7th method
- **Result**: Build now completes successfully

---

## 🧪 STEP-BY-STEP TESTING

### Test 1: Verify App Loads (No Blank Screen)
1. Open browser to **http://localhost:5174**
2. Expected result: ✅ Login page appears with email/password fields
3. Check browser console (F12) - should show no errors

**Success Criteria**: 
- [ ] Login page visible
- [ ] No JavaScript errors in console
- [ ] Page is responsive and interactive

---

### Test 2: Login with Supabase (Default Database)
1. App should start with **Supabase** as default database
2. Use your actual Supabase credentials:
   - Email: `[your-admin-email]`
   - Password: `[your-supabase-password]`
3. Click "Sign In"
4. Expected result: ✅ Redirect to dashboard

**Success Criteria**:
- [ ] Login succeeds with valid Supabase credentials
- [ ] Redirects to dashboard (`/`)
- [ ] Navbar shows logged-in user name
- [ ] Console shows: `[main.js] App initialized with database: supabase`

---

### Test 3: Dashboard Loads with Supabase Data
1. After login, dashboard should display:
   - Monthly calibration charts
   - PM schedule charts
   - Equipment statistics
2. Console should log:
   ```
   [logAktivitas] Current database type: supabase
   [useDashboard] Successfully loaded dashboard data
   ```

**Success Criteria**:
- [ ] Dashboard charts render with data
- [ ] No loading errors
- [ ] Data displays correctly

---

### Test 4: Switch to Google Sheets (Emergency Switch)
1. Go to **Settings** menu (top-right avatar/settings icon)
2. Look for **Database Configuration** option
3. OR go to **red DB button** in navbar (or `/emergency-switch` route)
4. Select **Google Sheets** from dropdown
5. Click **Confirm** or **Switch Database**
6. Should see message: "Switching to Google Sheets..."
7. Expected result: ✅ Page redirects to dashboard

**Success Criteria**:
- [ ] Database switch button/page accessible
- [ ] Can select Google Sheets option
- [ ] Switch completes without errors
- [ ] Redirects to dashboard after switch

---

### Test 5: Dashboard Works After Google Sheets Switch
1. Dashboard should now load data from Google Sheets API
2. Check browser console - should show:
   ```
   [logAktivitas] Current database type: googleSheets
   [logAktivitas] Using endpoint: https://script.google.com/macros/s/AKfycbzGKIeA...
   ```
3. All charts should display data from Google Sheets

**Success Criteria**:
- [ ] Dashboard displays after switch (no blank screen)
- [ ] Data loads from Google Sheets (check endpoint in console)
- [ ] Charts render correctly

---

### Test 6: Login with Google Sheets Database
1. Go to settings and switch to Google Sheets
2. Return to login page (clear session if needed)
3. Try to login with Google Sheets credentials:
   - Email: `admin@google` (or valid Google Sheets user email)
   - Password: `password123` (or valid Google Sheets password - SHA-256 hashed)
4. Console should log:
   ```
   [users] Attempting login with email: admin@google
   [users] Current database type: googleSheets
   [users] Using endpoint: https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcI...
   ```

**Success Criteria**:
- [ ] Login attempt is routed to Google Sheets API
- [ ] Proper error message if credentials invalid
- [ ] Login succeeds with valid Google Sheets credentials
- [ ] User data maps correctly to app format

---

### Test 7: All Menu Items Work with Google Sheets
After switching to Google Sheets, test each menu:

#### 7a. Daftar Alat (Equipment List)
- [ ] Loads equipment list from Google Sheets
- [ ] Can view equipment details
- [ ] No errors in console

#### 7b. Jadwal Kalibrasi (Calibration Schedule)
- [ ] Displays schedule data from Google Sheets
- [ ] Shows monthly schedule
- [ ] Can view schedule details

#### 7c. Log Aktivitas (Activity Logs)
- [ ] Displays all activity logs
- [ ] Can filter/search logs
- [ ] Can view log details

#### 7d. Dashboard
- [ ] Charts display data
- [ ] Monthly statistics show
- [ ] No loading errors

**Success Criteria for All**: Each menu should work without errors

---

### Test 8: Switch Back to Supabase
1. Go to emergency-switch or settings
2. Switch back to **Supabase**
3. Console should show:
   ```
   [Settings] Switching to Supabase
   ```
4. Refresh page or navigate to dashboard
5. Data should load from Supabase

**Success Criteria**:
- [ ] Can switch back to Supabase
- [ ] Dashboard loads with Supabase data
- [ ] No errors after switch

---

### Test 9: Data Persistence After Page Refresh
1. Switch to Google Sheets
2. Navigate to different pages (Daftar Alat, Jadwal, etc.)
3. Refresh page (F5)
4. Expected behavior: ✅ Still using Google Sheets (database setting persisted in localStorage)
5. Check browser's DevTools > Application > LocalStorage
6. Look for key: `database_config`

**Success Criteria**:
- [ ] Database setting persists after refresh
- [ ] Data continues loading from correct database
- [ ] localStorage contains correct database type

---

### Test 10: Emergency Access Button
1. Go to login page
2. Click red **"Emergency Access"** button (bottom of login form)
3. Should navigate to `/emergency-switch`
4. Can select and switch database without login

**Success Criteria**:
- [ ] Emergency access button works
- [ ] Can access database switch without login
- [ ] Can switch to Google Sheets without credentials

---

## 🔍 Console Log Verification

**Expected logs when switching databases:**

### Switch to Google Sheets:
```
[Settings] Switching to Google Sheets
[logAktivitas] Current database type: googleSheets
[logAktivitas] Using endpoint: https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec
[daftarAlat] Current database type: googleSheets
[users] Current database type: googleSheets
```

### Switch to Supabase:
```
[Settings] Switching to Supabase
[logAktivitas] Current database type: supabase
[daftarAlat] Current database type: supabase
[users] Current database type: supabase
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank white screen on load | Cleared ✅ - Circular dependency fixed. Refresh browser if still seeing. Check console for errors (F12). |
| Login fails with "password wrong" | Check if using correct database - is Google Sheets selected but using Supabase credentials? |
| Charts don't load after switch | Check network tab (F12) - are Google Apps Script requests reaching endpoint? |
| Page keeps flickering | Should be fixed ✅. If still occurring, check if there are multiple router guard redirects. |
| Data shows as "undefined" | Check if Google Sheets API is returning correct data format. Verify endpoint URLs in settings.js. |
| localStorage not persisting | Check if browser allows localStorage. Try incognito mode. |

---

## ✅ Verification Checklist

Before declaring the fix complete, verify:

- [ ] Build completes without errors: `npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] No console errors on app load
- [ ] Login page displays correctly
- [ ] Can login with Supabase
- [ ] Dashboard displays with Supabase data
- [ ] Can switch to Google Sheets
- [ ] Dashboard displays with Google Sheets data
- [ ] All menus work (Daftar Alat, Jadwal, Log Aktivitas)
- [ ] Can switch back to Supabase
- [ ] Database setting persists after refresh
- [ ] Emergency access button works
- [ ] No circular dependency warnings in console

---

## 📊 Testing Results Summary

After testing, fill in results:

| Test | Status | Notes |
|------|--------|-------|
| 1. App Loads | ⬜ | |
| 2. Supabase Login | ⬜ | |
| 3. Dashboard Data | ⬜ | |
| 4. Switch to Google Sheets | ⬜ | |
| 5. Google Sheets Data | ⬜ | |
| 6. Google Sheets Login | ⬜ | |
| 7a. Daftar Alat | ⬜ | |
| 7b. Jadwal Kalibrasi | ⬜ | |
| 7c. Log Aktivitas | ⬜ | |
| 7d. Dashboard | ⬜ | |
| 8. Switch Back | ⬜ | |
| 9. Data Persistence | ⬜ | |
| 10. Emergency Access | ⬜ | |

Use: ✅ (Pass), ❌ (Fail), ⚠️ (Warning), ⬜ (Not Tested)

---

## 🎯 Implementation Summary

### Features Implemented:
1. ✅ Dual-database system (Supabase + Google Sheets)
2. ✅ Automatic API routing based on selected database
3. ✅ Database switch in Settings or Emergency Access page
4. ✅ Data persistence via localStorage
5. ✅ Google Sheets login with SHA-256 password hashing
6. ✅ All menus support both databases
7. ✅ Fallback to Google Sheets when Supabase is down

### Router Wrappers Created:
- ✅ `src/api/users.js` - Routes login between databases
- ✅ `src/api/daftarAlatApi.js` - Routes equipment data
- ✅ `src/api/jadwalKalibrasi.js` - Routes schedule data
- ✅ `src/api/logAktivitas.js` - Routes activity logs
- ✅ `src/api/index.js` - Exports all routers

### Configuration Files:
- ✅ `src/stores/settings.js` - Database configuration & switching logic
- ✅ `src/composables/useDatabaseSwitch.js` - Database switch helper
- ✅ `src/views/pages/EmergencyDatabaseSwitch.vue` - Switch UI
- ✅ Emergency DB button in navbar

---

## 📝 Notes

- Google Apps Script endpoints are pre-configured in `src/stores/settings.js`
- Password hashing uses SHA-256 (browser crypto API - no external library needed)
- Axios timeout set to 30s for slower Google Apps Script responses
- All write operations (create/edit/delete) are read-only in Google Sheets mode
- Database config stored in localStorage under key: `database_config`

---

**Last Updated**: June 25, 2026
**Status**: ✅ Blank Screen Fixed - Ready for Testing

