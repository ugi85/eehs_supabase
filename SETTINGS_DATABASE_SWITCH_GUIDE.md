# Settings Panel: Database Switch Guide

## 📍 Where to Find the Database Switch Button

The database switch functionality is **already implemented** in two locations:

### 1. **Settings → Konfigurasi (Admin Only)**
- Path: `/config` or click Settings menu → **Konfigurasi Sistem**
- Location: **Right side panel under "Database Configuration"** (red card)
- Security: ✅ **Admin role only** (checked via `v-if="isAdmin"`)
- Features:
  - Dropdown to select: Supabase or Google Spreadsheet
  - Current database status indicator
  - Test connection button
  - Switch history/audit trail
  - Change notes/comments field

### 2. **Emergency Database Switch (No Login)**
- Path: `/emergency-switch`
- Quick access: Red **DB button** in navbar (top-right)
- Security: ⚠️ **No authentication required** (for when Supabase is down)
- Features:
  - Simple one-click switch
  - No admin role check
  - Clear cache after switch

---

## 🔧 Implementation Details

### Settings Configuration Panel (Recommended for Admin Use)

**File**: `src/views/settings/config.vue`

**HTML Structure**:
```html
<!-- Database Configuration Switch (Admin Only) -->
<div class="card card-danger mt-4" v-if="isAdmin">
  <div class="card-header">
    <h3 class="card-title">
      <i class="fas fa-database mr-2"></i>Konfigurasi Database
      <span class="badge badge-warning ml-2">Admin Only</span>
    </h3>
  </div>
  
  <div class="card-body">
    <!-- Current Database Status -->
    <div class="alert" :class="isUsingSupabase ? 'alert-info' : 'alert-warning'">
      <h5><i class="fas fa-info-circle mr-2"></i>Database Saat Ini</h5>
      <p class="mb-0">
        <strong>{{ isUsingSupabase ? 'Supabase' : 'Spreadsheet' }}</strong>
      </p>
    </div>

    <!-- Switch Database Form -->
    <div class="form-group">
      <label>Pilih Tipe Database</label>
      <select v-model="databaseSwitchForm.database_type" class="form-control">
        <option value="supabase">Supabase (PostgreSQL)</option>
        <option value="spreadsheet">Google Spreadsheet</option>
      </select>
    </div>

    <!-- Switch Button -->
    <button @click="handleSwitchDatabase" class="btn btn-danger">
      <i class="fas fa-sync-alt mr-1"></i>Switch Database
    </button>
  </div>
</div>
```

**Key Features**:
- ✅ `v-if="isAdmin"` - Only shows for admin users
- ✅ Current database status alert
- ✅ Dropdown selector for database type
- ✅ Spreadsheet settings (ID, URL, test connection)
- ✅ Change notes/audit trail
- ✅ Database history table
- ✅ Backup reminder

---

### Emergency Switch Page (No Login Required)

**File**: `src/views/pages/EmergencyDatabaseSwitch.vue`

**Features**:
- Accessible without login
- Simple dropdown + button interface
- Auto-clears cache
- Redirects to dashboard after switch
- Added to navbar as red DB button

**Route Configuration**:
```javascript
{
  path: '/emergency-switch',
  component: EmergencyDatabaseSwitch,
  meta: { requiresAuth: false }  // ← No login required
}
```

---

## 🎯 How It Works

### Step-by-Step: Switching via Settings

1. **Login to system** (as admin)
2. Go to **Settings** menu (top-right avatar icon)
3. Click **Konfigurasi Sistem**
4. Scroll to **Database Configuration** section (red card at bottom)
5. Select database type from dropdown:
   - **Supabase (PostgreSQL)** - Primary database
   - **Google Spreadsheet** - Google Apps Script backend
6. If selecting Google Sheets:
   - Enter Google Sheets ID
   - Enter full Spreadsheet URL
   - Click **Test Connection** to verify
7. Add optional **Catatan Perubahan** (change notes)
8. Click **Switch Database** button
9. System switches and reloads page
10. Dashboard now loads from selected database

### Step-by-Step: Emergency Switch (No Login)

1. **Click red DB button** in navbar (if visible)
   - OR go directly to: `http://localhost:5174/emergency-switch`
2. Select **Google Sheets** from dropdown
3. Click **Confirm/Switch**
4. Cache clears automatically
5. Redirect to dashboard
6. Data now loads from Google Sheets

---

## 🔐 Security & Role-Based Access

### Admin Role Protection
```javascript
// In config.vue - only shows for admins
<div class="card card-danger mt-4" v-if="isAdmin">
```

### Verification
- Admin role is determined by `usePermissions().hasPermission('admin')`
- Database switch in Settings is **restricted to admin only**
- Emergency switch has **no restriction** (for disaster recovery)

### Audit Trail
The database configuration history is stored and displayed:
- Who made the change (updated_by)
- When it was changed (updated_at)
- What was changed (database_type)
- Active status indicator

---

## 🔌 Behind the Scenes: How Database Switch Works

### 1. Pinia Store (`src/stores/settings.js`)
```javascript
switchToGoogleSheets() {
  this.database.type = 'googleSheets'
  localStorage.setItem('database_config', JSON.stringify(this.database))
}

switchToSupabase() {
  this.database.type = 'supabase'
  localStorage.setItem('database_config', JSON.stringify(this.database))
}
```

### 2. API Router Wrappers
All API calls check the active database:
```javascript
// In src/api/logAktivitas.js
function getLogAktivitasEndpoint() {
  const settings = useSettingsStore()
  
  if (settings.isUsingSupabase) {
    return null  // Use Supabase directly
  }
  
  return settings.googleAppsScript.logAktivitas  // Use Google Apps Script
}
```

### 3. Data Persistence
- Database setting saved in **localStorage** under key: `database_config`
- Persists across page refreshes and browser restarts
- Automatically restored on app load via `initializeDatabase()`

---

## 📱 UI Components

### Navbar Button (Quick Access)
```html
<!-- In src/components/layouts/Navbar.vue -->
<button class="btn btn-sm btn-danger" title="Emergency Database Switch">
  <i class="fas fa-database"></i> DB
  <router-link to="/emergency-switch" />
</button>
```

### Settings Card Colors
- **Supabase**: Blue alert (`alert-info`)
- **Google Sheets**: Yellow/Orange alert (`alert-warning`)
- Button: Red (`btn-danger`) - indicates critical change

---

## 🧪 Testing the Feature

### Test 1: Verify Admin-Only Access
1. Login as **admin** → Settings visible ✅
2. Login as **regular user** → Settings NOT visible ✅

### Test 2: Switch from Settings
1. Go to Settings → Konfigurasi
2. Find Database Configuration section
3. Select Google Sheets
4. Click Switch Database
5. Verify dashboard loads from Google Sheets

### Test 3: Emergency Switch
1. Click red DB button in navbar
2. Select Google Sheets
3. Click Confirm
4. Verify redirect to dashboard

### Test 4: Data Persistence
1. Switch database
2. Refresh page (F5)
3. Verify still on same database
4. Check localStorage for `database_config` key

---

## 📝 Configuration Details

### Database Endpoints (in `src/stores/settings.js`)

```javascript
googleAppsScript: {
  daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297...',
  logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI...',
  jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJ...',
  config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46X...',
  users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-t...'
}
```

### Switching Logic
- Supabase is the **default** database
- Google Sheets is **fallback** when Supabase is down
- Switch is **persistent** via localStorage
- Switch is **immediate** - no server-side config needed

---

## 🚀 Best Practices

### For Admins:
1. Use **Settings panel** for regular database management
2. Keep **audit trail** updated with change notes
3. Test connection before switching
4. Ensure data backup before major switch
5. Monitor logs after switch

### For Users:
1. Use **Emergency DB button** only when Supabase is down
2. Report database issues to admin
3. Don't manually edit localStorage

### For Developers:
1. All API routers must check `useSettingsStore().database.type`
2. Use dynamic imports to avoid circular dependencies
3. Support both databases in all API methods
4. Test with both databases before deploying

---

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Settings panel not visible | Check if logged in as admin. Admin role may not be assigned. |
| Database switch button disabled | Check if spreadsheet_id is filled in. |
| Switch doesn't persist after refresh | Check browser localStorage settings. May be disabled. |
| Dashboard data doesn't load after switch | Check browser console (F12) for endpoint errors. |
| Can't access emergency-switch | Try going directly to URL: `/emergency-switch` |

---

## 📚 Related Documentation

- `TESTING_DATABASE_SWITCH_COMPLETE.md` - Full testing guide
- `src/stores/settings.js` - Database configuration store
- `src/api/index.js` - API router exports
- `src/views/pages/EmergencyDatabaseSwitch.vue` - Emergency switch UI

---

## ✅ Verification Checklist

- [x] Database switch in Settings (admin-only)
- [x] Emergency database switch (no login)
- [x] Red DB button in navbar
- [x] Dropdown selector for database type
- [x] Current status indicator
- [x] Database history/audit trail
- [x] Change notes field
- [x] Test connection button
- [x] Data persistence via localStorage
- [x] Auto-redirect after switch
- [x] Cache clearing

---

**Status**: ✅ Complete - Ready for production use

