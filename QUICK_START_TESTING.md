# Quick Start: Testing Database Switch Feature

**Status**: ✅ Blank screen fixed - Ready to test  
**App URL**: http://localhost:5174  
**Dev Server**: Running on port 5174

---

## 🚀 Start Here (2 Minutes)

### 1. Access the App
```
http://localhost:5174
```
**Expected**: Login page appears (no blank screen) ✅

---

## 📋 Quick Test Plan (10 Minutes)

### Test 1: Login (Supabase) - 2 min
```
1. Go to http://localhost:5174
2. Enter your Supabase email and password
3. Click "Sign In"
4. Expected: Dashboard loads with charts
```
**Success if**: ✅ Dashboard visible with data

### Test 2: Check Settings (Admin) - 2 min
```
1. Click settings (top-right avatar icon)
2. Go to "Konfigurasi Sistem"
3. Scroll down to "Database Configuration"
4. Expected: Red card with database options visible
```
**Success if**: ✅ Database switch section visible (admin only)

### Test 3: Switch to Google Sheets - 2 min
```
1. In Database Configuration section
2. Select "Google Spreadsheet" from dropdown
3. Enter spreadsheet ID: [test-sheet-id]
4. Click "Switch Database"
5. Expected: Dashboard reloads with Google Sheets data
```
**Success if**: ✅ Dashboard displays after switch, no errors

### Test 4: Check Menus - 2 min
```
1. Navigate to: Daftar Alat → Jadwal Kalibrasi → Log Aktivitas
2. Expected: Data loads from Google Sheets (not blank)
```
**Success if**: ✅ All menus display data

### Test 5: Switch Back - 2 min
```
1. Go back to Settings > Konfigurasi
2. Select "Supabase" from dropdown
3. Click "Switch Database"
4. Expected: Dashboard reloads with Supabase data
```
**Success if**: ✅ Back to original Supabase data

---

## 🆘 Emergency Access (No Login)

```
1. Click red "DB" button in navbar (top-right)
   OR go to: http://localhost:5174/emergency-switch

2. Select "Google Sheets"
3. Click "Confirm"
4. Expected: Dashboard loads without login
```
**Success if**: ✅ Redirects to dashboard without login

---

## 🔍 Verification Checklist

- [ ] App loads (no blank screen)
- [ ] Login page visible
- [ ] Can login with credentials
- [ ] Dashboard displays data
- [ ] Settings panel accessible (admin)
- [ ] Database switch option visible
- [ ] Can switch to Google Sheets
- [ ] Data displays after switch
- [ ] All menus work
- [ ] Can switch back to Supabase
- [ ] Emergency access works
- [ ] Data persists after page refresh (F5)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank white screen | Refresh (F5) or restart dev server |
| "Invalid credentials" error | Check email/password are correct |
| Settings panel not visible | Make sure logged in as admin |
| Data not loading after switch | Check browser console (F12) for errors |
| Emergency switch not working | Go directly to `/emergency-switch` URL |
| Port 5173 in use | Dev server auto-uses 5174 instead |

---

## 📊 Expected Console Logs

### On App Start:
```
[main.js] App initialized with database: supabase
```

### On Login:
```
[users] Attempting login with email: ...
[users] Current database type: supabase
```

### After Switching to Google Sheets:
```
[Settings] Switching to Google Sheets
[logAktivitas] Current database type: googleSheets
[logAktivitas] Using endpoint: https://script.google.com/macros/s/...
```

---

## 📁 Key Files to Know

- **App Entry**: `src/main.js`
- **Database Config**: `src/stores/settings.js`
- **API Routers**: `src/api/*.js` (all support both databases)
- **Settings UI**: `src/views/settings/config.vue`
- **Emergency Switch**: `src/views/pages/EmergencyDatabaseSwitch.vue`
- **Navbar**: `src/components/layouts/Navbar.vue` (red DB button)

---

## 💡 Tips for Testing

1. **Open DevTools**: Press F12 to see console logs
2. **Check Network**: See which API endpoints are called
3. **Clear Cache**: Ctrl+Shift+Delete before testing
4. **Test localStorage**: Go to DevTools > Application > LocalStorage
   - Look for key: `database_config`
   - Shows which database is active

---

## ✅ Pass/Fail Criteria

**PASS** if:
- ✅ App loads without errors
- ✅ Can login to Supabase
- ✅ Dashboard displays data
- ✅ Can switch databases
- ✅ All menus work with both databases
- ✅ Emergency access works
- ✅ Settings visible to admins only

**FAIL** if:
- ❌ Blank white screen on load
- ❌ Cannot login
- ❌ Dashboard doesn't display data
- ❌ Cannot switch databases
- ❌ Settings visible to non-admins
- ❌ Console shows JavaScript errors

---

## 📞 Next Steps

1. **If all tests pass**: System is ready for production use
2. **If some tests fail**: Check troubleshooting above or review detailed testing guide
3. **If errors persist**: Check console logs and error messages in browser DevTools (F12)

---

## 📚 Detailed Guides

- `FIX_SUMMARY_BLANK_SCREEN.md` - What was fixed and how
- `TESTING_DATABASE_SWITCH_COMPLETE.md` - Complete testing procedures
- `SETTINGS_DATABASE_SWITCH_GUIDE.md` - Database switch in settings panel

---

## 🎯 Testing Duration

- Quick test: **10 minutes**
- Comprehensive test: **30 minutes**
- Full validation: **1 hour**

---

**Ready to test?** Open http://localhost:5174 now! 🚀

