# Config System Setup Guide

## Problem
Error saat upload logo: `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`

## Root Cause
Table `config` tidak memiliki unique constraint pada kolom `deskripsi`, sehingga Supabase tidak bisa melakukan upsert dengan `onConflict`.

## Solution

### Option 1: Quick Fix (Already Applied) ✅
**Status:** Sudah diterapkan di `src/api/supabase/configApi.js`

Menggunakan manual check-and-update/insert tanpa perlu unique constraint:
- Check apakah record sudah ada
- Jika ada → UPDATE
- Jika tidak → INSERT

**Pros:**
- ✅ Langsung bisa digunakan
- ✅ Tidak perlu ubah database

**Cons:**
- ❌ Lebih lambat (multiple queries)
- ❌ Tidak ada database-level validation

### Option 2: Optimal Fix (Recommended) 🚀
**Status:** Perlu dijalankan manual di Supabase

#### Step 1: Run SQL Script
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Klik "SQL Editor" di sidebar
4. Copy-paste isi file `supabase-config-fix-simple.sql`
5. Klik "Run" atau tekan Ctrl+Enter

#### Step 2: Replace configApi.js
Setelah SQL script berhasil dijalankan:
1. Backup file `src/api/supabase/configApi.js`
2. Replace dengan isi file `src/api/supabase/configApi-optimized.js`
3. Restart development server

**Pros:**
- ✅ Lebih cepat (single query upsert)
- ✅ Database-level validation
- ✅ Cleaner code
- ✅ Auto-increment id

**Cons:**
- ❌ Perlu akses ke Supabase SQL Editor

## Current Table Structure

```sql
CREATE TABLE public.config (
  id bigint NOT NULL,
  deskripsi text NULL,
  value text NULL,
  CONSTRAINT config_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
```

## Improved Table Structure (After Running SQL)

```sql
CREATE TABLE public.config (
  id bigint NOT NULL DEFAULT nextval('config_id_seq'),
  deskripsi text NOT NULL,
  value text NULL,
  CONSTRAINT config_pkey PRIMARY KEY (id),
  CONSTRAINT config_deskripsi_unique UNIQUE (deskripsi)
) TABLESPACE pg_default;
```

## Config Fields

| Deskripsi | Frontend Key | Usage |
|-----------|--------------|-------|
| `nama sistem` | `systemName` | Sidebar, Title, Footer |
| `versi sistem` | `systemVersion` | Footer, Print |
| `nama perusahaan` | `companyName` | Print Header |
| `noref daftaralat` | `documentRefEquipment` | Daftar Alat View |
| `noref kalibrasi` | `documentRefCalibration` | Jadwal Kalibrasi View |
| `logo sistem` | `logoUrl` | Sidebar, Favicon |
| `logo perusahaan` | `logoPerusahaanUrl` | Print Header |
| `favicon` | `faviconUrl` | Browser Favicon |

## Testing Upload

After applying either solution:

1. Open Konfigurasi Sistem page
2. Click "Pilih file logo"
3. Select an image (PNG/JPG)
4. Wait for compression & upload
5. Check preview updates
6. Check sidebar logo changes
7. Check browser favicon changes
8. Refresh browser - logo should persist

## Troubleshooting

### Upload still fails
- Check browser console for error messages
- Check Supabase logs in Dashboard
- Verify table structure in Supabase Table Editor

### Logo not showing after upload
- Check localStorage: `qms_frontend_config_v2`
- Check Supabase config table has the data
- Clear browser cache and reload

### Favicon not updating
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check favicon is generated (should be same as logo for now)

## Files Modified

- ✅ `src/api/supabase/configApi.js` - Current working version
- 📄 `src/api/supabase/configApi-optimized.js` - Optimized version (use after SQL)
- 📄 `supabase-config-fix-simple.sql` - SQL script to run
- 📄 `supabase-config-constraint.sql` - Detailed SQL with comments

## Next Steps

1. **For now:** Use current implementation (Option 1) - it works!
2. **Later:** Run SQL script and switch to optimized version (Option 2)
3. **Test:** Upload logo sistem and logo perusahaan
4. **Verify:** Check all views display config correctly
