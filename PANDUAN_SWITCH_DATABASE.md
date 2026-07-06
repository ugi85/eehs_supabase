# 📋 Panduan Cepat Switch Database

## 🎯 Ringkasan
Fitur ini memungkinkan **Admin** untuk beralih antara **Supabase (database cloud)** dan **Google Spreadsheet** sebagai sumber data sistem.

## ⚙️ Setup Awal

### 1. Setup Tabel Konfigurasi di Supabase

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Buka Supabase Dashboard > SQL Editor
-- Copy-paste isi file: supabase-database-config.sql
-- Klik "Run"
```

File SQL akan membuat:
- ✅ Tabel `config_database`
- ✅ Default config (Supabase sebagai database)
- ✅ Security policies (RLS)

### 2. Verifikasi Setup

1. Buka Supabase Dashboard
2. Masuk ke **Table Editor**
3. Cari tabel `config_database`
4. Pastikan ada 1 row dengan `database_type = 'supabase'` dan `is_active = true`

## 🚀 Cara Menggunakan

### Akses Menu Switch Database

1. **Login sebagai Admin/Superadmin**
2. Buka menu **Settings** (⚙️ icon)
3. Pilih **Konfigurasi Sistem**
4. Scroll ke bagian **"Konfigurasi Database"** (kartu merah dengan badge "Admin Only")

### Switch ke Supabase (Database Cloud)

1. Pilih **"Supabase (PostgreSQL)"** dari dropdown
2. Isi catatan perubahan (opsional)
3. Klik tombol **"Switch Database"**
4. Konfirmasi di popup
5. ✅ Halaman akan reload otomatis

### Switch ke Google Spreadsheet

1. Pilih **"Google Spreadsheet"** dari dropdown
2. **Isi Spreadsheet ID** (wajib):
   - Buka Google Sheets Anda
   - Copy bagian ID dari URL:
     ```
     https://docs.google.com/spreadsheets/d/[INI_SPREADSHEET_ID]/edit
     ```
3. **Isi URL lengkap** (opsional, untuk shortcut)
4. Klik **"Test Koneksi"** untuk verifikasi (recommended)
5. Isi catatan perubahan (opsional)
6. Klik tombol **"Switch Database"**
7. Konfirmasi di popup
8. ✅ Halaman akan reload otomatis

## 📊 Status Database Saat Ini

Di bagian atas kartu "Konfigurasi Database", Anda akan melihat:

- **Database Aktif**: Supabase atau Spreadsheet
- **Link ke Spreadsheet**: Jika aktif mode spreadsheet
- **Terakhir diupdate**: Timestamp perubahan terakhir

## 📜 Riwayat Perubahan

Di bagian bawah kartu, ada tabel **"Riwayat Konfigurasi Database"** yang menampilkan:
- ✅ Tipe database (Supabase/Spreadsheet)
- ✅ Tanggal perubahan
- ✅ User yang melakukan perubahan
- ✅ Status (Aktif/Tidak Aktif)

## ⚠️ PENTING: Hal yang Harus Diperhatikan

### 1. **Backup Data Dulu!**
   - Sebelum switch, **WAJIB backup data** dari database saat ini
   - Export data ke Excel/CSV
   - Simpan backup di tempat aman

### 2. **Koordinasi dengan Tim**
   - Informasikan tim sebelum switch
   - Pastikan tidak ada operasi penting yang sedang berjalan
   - Lakukan di waktu yang tidak sibuk

### 3. **Test Koneksi Spreadsheet**
   - Selalu klik "Test Koneksi" sebelum switch ke spreadsheet
   - Pastikan Spreadsheet ID valid
   - Pastikan permissions spreadsheet sudah benar

### 4. **Catat Alasan Switch**
   - Isi field "Catatan Perubahan"
   - Dokumentasikan kenapa melakukan switch
   - Berguna untuk audit trail

## 🔐 Permission & Akses

### Yang Bisa Akses Fitur Ini:
- ✅ **Superadmin** - Full access
- ✅ **Admin** - Full access
- ❌ **User** - Tidak bisa akses
- ❌ **Viewer** - Tidak bisa akses

### Jika Menu Tidak Muncul:
- Cek role akun Anda
- Hanya Admin/Superadmin yang bisa melihat kartu "Konfigurasi Database"
- Contact administrator untuk upgrade role

## 🛠️ Troubleshooting

### Problem: Tombol Switch Database tidak aktif

**Penyebab**:
- Spreadsheet ID belum diisi (untuk mode spreadsheet)
- Sedang dalam proses switching

**Solusi**:
- Pastikan semua field required sudah diisi
- Tunggu hingga proses selesai

### Problem: Test Koneksi Gagal

**Penyebab**:
- Spreadsheet ID salah
- Spreadsheet private/tidak accessible

**Solusi**:
1. Verifikasi Spreadsheet ID benar
2. Buka spreadsheet, pastikan bisa diakses
3. Coba copy-paste ulang ID dari URL

### Problem: Halaman Tidak Reload Setelah Switch

**Solusi**:
1. Tunggu 3 detik (ada delay otomatis)
2. Jika belum reload, refresh manual (F5)
3. Atau logout dan login ulang

### Problem: Data Tidak Muncul Setelah Switch

**Penyebab**:
- Data belum di-sync ke database baru
- API masih pointing ke database lama

**Solusi**:
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard reload (Ctrl+Shift+R)
3. Logout dan login ulang
4. Contact administrator jika masih bermasalah

## 💡 Tips & Best Practices

1. **Gunakan Supabase untuk Production**
   - Lebih aman dan reliable
   - Fitur realtime dan backup otomatis
   - Performa lebih cepat

2. **Gunakan Spreadsheet untuk Development/Testing**
   - Mudah diedit manual
   - Kolaborasi real-time dengan tim
   - Tidak perlu setup database kompleks

3. **Jangan Sering-Sering Switch**
   - Switch database berdampak ke seluruh user
   - Lakukan hanya saat benar-benar perlu
   - Rencanakan dengan matang

4. **Monitor Setelah Switch**
   - Cek apakah semua fitur berjalan normal
   - Verifikasi data bisa diakses
   - Cek log errors di console

## 📞 Bantuan

Jika mengalami kesulitan:

1. **Cek Dokumentasi Lengkap**: `DATABASE_SWITCH_GUIDE.md`
2. **Cek Console Browser**: F12 > Console (untuk melihat error)
3. **Contact Admin**: Hubungi system administrator

## 🔄 Kapan Harus Switch?

### Scenario 1: Development → Production
- **Dari**: Spreadsheet (development)
- **Ke**: Supabase (production)
- **Alasan**: Production butuh database yang reliable dan secure

### Scenario 2: Data Entry Manual
- **Dari**: Supabase
- **Ke**: Spreadsheet (temporary)
- **Alasan**: Tim perlu input data besar secara manual di spreadsheet
- **Setelah selesai**: Switch balik ke Supabase

### Scenario 3: Troubleshooting
- **Dari**: Supabase
- **Ke**: Spreadsheet (temporary)
- **Alasan**: Debugging data atau testing
- **Setelah selesai**: Switch balik ke Supabase

## ✅ Checklist Sebelum Switch

- [ ] Data sudah di-backup
- [ ] Tim sudah diinformasikan
- [ ] Spreadsheet ID sudah valid (jika switch ke spreadsheet)
- [ ] Test koneksi berhasil (jika switch ke spreadsheet)
- [ ] Waktu switch pas (tidak sedang jam sibuk)
- [ ] Sudah isi catatan perubahan
- [ ] Siap monitor setelah switch

---

**Tips Terakhir**: Jika ragu, jangan switch! Konsultasikan dulu dengan tim teknis.

📅 **Last Updated**: Juni 2026  
👨‍💻 **Engineering Team**
