# 📝 Summary: Fitur Database Switch

## ✅ Yang Sudah Dibuat

### 1. Database Schema
**File**: `supabase-database-config.sql`
- ✅ Tabel `config_database` untuk menyimpan konfigurasi
- ✅ Trigger auto-update timestamp
- ✅ RLS (Row Level Security) policies
- ✅ Default config (Supabase sebagai default)

### 2. Backend API
**File**: `src/api/supabase/databaseConfigApi.js`
- ✅ `getActiveDatabaseConfig()` - Get config yang aktif
- ✅ `getAllDatabaseConfigs()` - Get semua history config
- ✅ `switchDatabaseType()` - Switch database type
- ✅ `updateDatabaseConfig()` - Update config yang ada
- ✅ `testSpreadsheetConnection()` - Test koneksi ke spreadsheet

### 3. Composable
**File**: `src/composables/useDatabaseConfig.js`
- ✅ State management untuk database config
- ✅ Computed properties (isUsingSupabase, isUsingSpreadsheet, dll)
- ✅ Methods untuk load, switch, update config
- ✅ Cache ke localStorage untuk quick access
- ✅ Auto reload page setelah switch

### 4. UI Component
**File**: `src/views/settings/config.vue`
- ✅ Card "Konfigurasi Database" (Admin Only)
- ✅ Status database saat ini
- ✅ Form switch database dengan dropdown
- ✅ Input Spreadsheet ID dan URL (conditional)
- ✅ Tombol "Test Koneksi"
- ✅ Tombol "Switch Database" dengan confirmation
- ✅ Tabel riwayat konfigurasi database
- ✅ Loading states dan disabled states
- ✅ Role-based access control (hanya Admin/Superadmin)

### 5. Google Sheets API (Skeleton)
**File**: `src/api/googleSheets/sheetsApi.js`
- ✅ Struktur dasar untuk Google Sheets integration
- ✅ CRUD operations (read, append, update, delete)
- ✅ Test connection function
- ✅ Sheet name mapping
- ⚠️ **TODO**: Implementasi real API calls

### 6. Dokumentasi
**Files**:
- ✅ `DATABASE_SWITCH_GUIDE.md` - Panduan lengkap (English)
- ✅ `PANDUAN_SWITCH_DATABASE.md` - Panduan cepat (Bahasa Indonesia)
- ✅ `README.md` - Updated dengan info fitur baru
- ✅ `.env.example` - Updated dengan Google Sheets config

## 📍 Lokasi Fitur

### Di Aplikasi
```
Login sebagai Admin/Superadmin
↓
Settings (menu samping)
↓
Konfigurasi Sistem
↓
Scroll ke bawah
↓
Card "Konfigurasi Database" (kartu merah dengan badge "Admin Only")
```

### Di Code
```
src/
├── api/
│   ├── supabase/
│   │   └── databaseConfigApi.js          ← API Supabase
│   └── googleSheets/
│       └── sheetsApi.js                   ← API Google Sheets (TODO)
├── composables/
│   └── useDatabaseConfig.js               ← Business logic
└── views/
    └── settings/
        └── config.vue                      ← UI Component
```

## 🎯 Cara Menggunakan

### Step 1: Setup Database
```bash
# Buka Supabase SQL Editor
# Run file: supabase-database-config.sql
```

### Step 2: Login sebagai Admin
```
Username: admin
Password: [your admin password]
```

### Step 3: Akses Settings
```
Menu > Settings > Konfigurasi Sistem
```

### Step 4: Switch Database
```
1. Pilih database type dari dropdown
2. Isi Spreadsheet ID (jika pilih spreadsheet)
3. Test koneksi (optional)
4. Klik "Switch Database"
5. Konfirmasi
6. Page akan reload otomatis
```

## 🔒 Security & Permissions

### Role Access
| Role | Lihat Status | Switch Database | Lihat History |
|------|--------------|-----------------|---------------|
| Superadmin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| User | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ |

### Implementation
- UI level: `v-if="isAdmin"` pada card
- Store level: Check `userStore.state.user.role`
- Database level: RLS policies di Supabase

## 🎨 UI Features

### Status Display
- Badge warna: Blue (Supabase) / Yellow (Spreadsheet)
- Link ke spreadsheet (jika mode spreadsheet)
- Timestamp update terakhir

### Form Features
- Dropdown untuk pilih database type
- Conditional fields (Spreadsheet ID/URL hanya muncul jika pilih spreadsheet)
- Test Connection button (disabled jika ID kosong)
- Switch button (disabled jika sedang switching atau ID kosong untuk mode spreadsheet)

### Feedback
- Loading spinner saat switching/testing
- SweetAlert confirmations
- Success/Error notifications
- Auto reload page dengan countdown

### History Table
- Tabel responsive dengan badge status
- Tampilkan: Type, Date, User, Status
- Auto-refresh setelah switch

## ⚠️ Important Notes

### 1. Backup Data
- **WAJIB** backup data sebelum switch
- Sistem tidak auto-migrate data
- Switch hanya mengubah pointer database

### 2. Page Reload
- Setelah switch, page akan reload otomatis (3 detik delay)
- Diperlukan untuk re-initialize config
- localStorage akan di-update dengan config baru

### 3. Google Sheets Integration
- Saat ini hanya skeleton/mock
- Real implementation butuh:
  - Google Sheets API enabled
  - Service Account credentials
  - Share spreadsheet dengan service account
  - Implement real API calls di `sheetsApi.js`

### 4. Data Migration
- Fitur ini TIDAK auto-migrate data
- Anda perlu:
  1. Export data dari database lama
  2. Switch database
  3. Import data ke database baru
  - Atau implement sync tool sendiri

## 🚀 Next Steps (TODO)

### High Priority
- [ ] Implement real Google Sheets API calls
- [ ] Add data migration/sync tool
- [ ] Add validation untuk spreadsheet structure
- [ ] Add error handling untuk network issues

### Medium Priority
- [ ] Add confirmation before page reload
- [ ] Add loading overlay saat switching
- [ ] Add database health check
- [ ] Add backup/restore functionality

### Low Priority
- [ ] Add multiple spreadsheets support
- [ ] Add custom sheet mapping configuration
- [ ] Add database usage statistics
- [ ] Add export/import tools

## 🐛 Known Issues

1. **Google Sheets API**: Belum diimplementasi, masih mock/skeleton
2. **Data Migration**: Tidak auto-migrate, perlu manual
3. **Page Reload**: Tidak ada cancel option setelah switch dimulai

## 📦 Dependencies

### Already Installed
- `@supabase/supabase-js` - Supabase client
- `vue` - Frontend framework
- `sweetalert2` - Alert/notification

### Need to Install (for Google Sheets)
```bash
npm install google-auth-library googleapis
```

## 🔧 Configuration Files

### Database
- `supabase-database-config.sql` - Migration file

### Environment
- `.env` - Add Google Sheets API credentials (optional)
- `.env.example` - Template with comments

### Code
- `src/config/supabase.js` - Supabase client config
- `src/api/supabase/databaseConfigApi.js` - API implementation
- `src/composables/useDatabaseConfig.js` - Composable logic

## 📊 Database Structure

### Table: config_database
```sql
CREATE TABLE config_database (
  id SERIAL PRIMARY KEY,
  database_type VARCHAR(50) NOT NULL,      -- 'supabase' atau 'spreadsheet'
  spreadsheet_id VARCHAR(255),             -- ID Google Sheets
  spreadsheet_url TEXT,                    -- URL lengkap
  is_active BOOLEAN DEFAULT TRUE,          -- Hanya 1 yang aktif
  updated_at TIMESTAMP WITH TIME ZONE,     -- Auto-update
  updated_by VARCHAR(255),                 -- Nama user
  notes TEXT                               -- Catatan perubahan
);
```

## 💡 Tips Penggunaan

1. **Development**: Gunakan Supabase (lebih reliable)
2. **Testing**: Bisa pakai Spreadsheet (mudah edit manual)
3. **Production**: Wajib Supabase (security & performance)
4. **Backup**: Selalu backup sebelum switch
5. **Monitoring**: Cek console browser setelah switch

## 📞 Support

Jika ada issue atau pertanyaan:
1. Cek dokumentasi lengkap: `DATABASE_SWITCH_GUIDE.md`
2. Cek panduan cepat: `PANDUAN_SWITCH_DATABASE.md`
3. Cek console browser untuk error messages
4. Contact system administrator

---

**Created**: June 2026  
**Version**: 1.0  
**Status**: ✅ Ready for Testing  
**Author**: Engineering Team
