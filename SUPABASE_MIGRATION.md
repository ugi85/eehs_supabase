# Migrasi dari Google Sheets ke Supabase

## 📋 Langkah-langkah Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Setup Supabase Project

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Buat project baru atau gunakan yang sudah ada
3. Catat credentials:
   - `Project URL` (Settings → API)
   - `anon/public key` (Settings → API)

### 3. Setup Database Schema

1. Buka **SQL Editor** di Supabase Dashboard
2. Copy-paste isi file `supabase-schema.sql`
3. Klik **Run** untuk membuat semua tables

### 4. Konfigurasi Environment Variables

Edit file `.env` di root project:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Update Import di Components

Ganti import dari Google Sheets API ke Supabase API:

**Sebelum:**
```javascript
import { userApi } from '@/api/userApi'
import { daftarAlatApi } from '@/api/daftarAlatApi'
```

**Sesudah:**
```javascript
import { userApi, daftarAlatApi } from '@/api'
```

Atau tetap gunakan import individual:
```javascript
import { userApi } from '@/api/supabase/userApi'
```

### 6. Migrasi Data (Opsional)

Jika Anda punya data di Google Sheets yang perlu dipindahkan:

1. Export data dari Google Sheets ke CSV
2. Import CSV ke Supabase via Dashboard:
   - Table Editor → Import data from CSV

### 7. Testing

```bash
npm run dev
```

Test semua fitur:
- ✅ Login/Logout
- ✅ CRUD Users
- ✅ CRUD Daftar Alat
- ✅ CRUD Jadwal Kalibrasi
- ✅ CRUD Log Aktivitas
- ✅ Config Management

## 🔧 Struktur File Baru

```
src/
├── config/
│   └── supabase.js              # Supabase client config
├── api/
│   ├── index.js                 # Export semua API
│   ├── supabase/                # Supabase API modules
│   │   ├── userApi.js
│   │   ├── daftarAlatApi.js
│   │   ├── configApi.js
│   │   ├── jadwalKalibrasiApi.js
│   │   └── logAktivitasApi.js
│   └── [old files]              # Google Sheets API (deprecated)
```

## 📊 Database Tables

### users
- `id` (UUID, PK)
- `nama`, `inisial`, `email`, `password_hash`, `role`
- `created_at`, `updated_at`

### daftar_alat
- `no` (Serial, PK)
- `no_id`, `description`, `type_model`, `sn`, `year`
- `crit_*`, `pm_*`, `calib_*`, `location`, `status_*`
- `created_at`, `updated_at`

### jadwal_kalibrasi
- `id` (UUID, PK)
- `alat_no` (FK → daftar_alat)
- `tanggal_kalibrasi`, `tanggal_kalibrasi_berikutnya`
- `status`, `keterangan`
- `created_at`, `updated_at`

### log_aktivitas
- `id` (UUID, PK)
- `type` (kalibrasi/pm/general)
- `alat_no` (FK → daftar_alat)
- `user_id` (FK → users)
- `aktivitas`, `tanggal`, `keterangan`
- `created_at`, `updated_at`

### config
- `key` (VARCHAR, PK)
- `value` (JSONB)
- `updated_at`

## 🔐 Security Notes

### Password Hashing
⚠️ **PENTING**: Implementasi saat ini menyimpan password plain text untuk kompatibilitas cepat.

**Untuk Production**, gunakan bcrypt:

```bash
npm install bcryptjs
```

Update `userApi.js`:
```javascript
import bcrypt from 'bcryptjs'

// Create user
const hashedPassword = await bcrypt.hash(user.password, 10)

// Login
const isValid = await bcrypt.compare(password, user.password_hash)
```

### Row Level Security (RLS)
Schema sudah include RLS policies dasar. Untuk production:

1. Aktifkan Supabase Auth
2. Update RLS policies berdasarkan `auth.uid()`
3. Implementasi role-based access control

## 🚀 Keuntungan Supabase vs Google Sheets

✅ **Performance**: Query lebih cepat dengan indexing  
✅ **Realtime**: Built-in realtime subscriptions  
✅ **Security**: Row Level Security & Auth bawaan  
✅ **Scalability**: Handle ribuan concurrent users  
✅ **Developer Experience**: PostgreSQL standard SQL  
✅ **Free Tier**: 500MB database, 2GB bandwidth/bulan  

## 📝 API Changes Summary

Semua API method tetap sama, hanya backend yang berubah:

| Method | Google Sheets | Supabase | Status |
|--------|--------------|----------|--------|
| `userApi.readUsers()` | ✅ | ✅ | Compatible |
| `userApi.createUser()` | ✅ | ✅ | Compatible |
| `userApi.login()` | ✅ | ✅ | Compatible |
| `daftarAlatApi.fetchList()` | ✅ | ✅ | Compatible |
| `daftarAlatApi.saveTool()` | ✅ | ✅ | Compatible |
| `configApi.getConfig()` | ✅ | ✅ | Compatible |
| `configApi.uploadLogo()` | ✅ | ✅ | Compatible |

## 🐛 Troubleshooting

### Error: "Invalid API key"
- Pastikan `.env` sudah benar
- Restart dev server: `npm run dev`

### Error: "relation does not exist"
- Jalankan `supabase-schema.sql` di SQL Editor
- Pastikan semua tables sudah dibuat

### Error: "Row Level Security"
- Check RLS policies di Supabase Dashboard
- Untuk development, bisa disable RLS sementara

## 📞 Support

Jika ada masalah, check:
1. Supabase Dashboard → Logs
2. Browser Console (F12)
3. Network tab untuk API calls
