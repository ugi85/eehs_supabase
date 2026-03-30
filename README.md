# EEHS System — Equipment & Calibration Management

Sistem manajemen peralatan, jadwal kalibrasi, dan preventive maintenance (PM) berbasis web untuk PT. AGIS Instrument Services.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Vue 3 (Composition API) + Vite |
| UI Framework | AdminLTE 3 + Bootstrap 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Custom (SHA-256 password, session via localStorage) |
| Excel | SheetJS (xlsx) |
| Charts | Chart.js |
| State | Pinia + composables |
| Router | Vue Router 4 |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi environment
```bash
cp .env.example .env
```
Isi `.env` dengan kredensial Supabase:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Jalankan migrasi database
Jalankan file SQL berikut di **Supabase SQL Editor** secara berurutan:
1. `supabase-schema.sql` — skema tabel utama
2. `add-backlog-columns.sql` — kolom backlog & audit trail
3. `fix-daftaralat-sequence.sql` — fix sequence kolom `no` di tabel `daftaralat`

### 4. Jalankan development server
```bash
npm run dev
```

---

## Struktur Database

| Tabel | Deskripsi |
|---|---|
| `daftaralat` | Master data peralatan |
| `kalibrasi` | Jadwal kalibrasi per alat |
| `logaktivitas` | Log pelaksanaan kalibrasi & PM |
| `users` | Data pengguna sistem |
| `config` | Konfigurasi sistem (nama, logo, dll) |

---

## Fitur & Modul

### Dashboard Chart (`/dashChart`)
- Ringkasan statistik: total peralatan aktif, total jadwal kalibrasi, total PM
- Grafik line chart aktivitas Kalibrasi & PM per bulan (scheduled vs executed)
- Data di-refresh otomatis setiap 1 menit
- Persentase penyelesaian per bulan ditampilkan secara visual

---

### Daftar Alat (`/daftarAlat`)
Manajemen master data peralatan.

**Fitur:**
- Tabel dengan DataTables (search, sort, paging, scroll horizontal)
- Filter status: **Aktif** / **Obsolete** / **Semua** (admin/superadmin only)
- Tambah, edit, hapus alat (admin/superadmin only)
- Field status alat: `aktif` atau `obsolete` — dapat diubah via form edit
- Status `obsolete` otomatis di-sync oleh DB trigger saat log aktivitas berisi keterangan `obsolete`
- **Export** data ke Excel
- **Download template** Excel untuk import
- **Import** dari Excel dengan preview sebelum konfirmasi — upsert berdasarkan `no_id`
- Cache data 1 menit + auto-refresh setiap 1 menit
- Reload otomatis saat tab browser kembali aktif (visibilitychange)

**Kolom utama:** No.ID, Description, Type/Model, SN, Location, PM Y/N, Schedule, Status

---

### Jadwal Kalibrasi (`/jadwalKalibrasi`)
Manajemen jadwal kalibrasi per alat.

**Fitur:**
- Tabel DataTables dengan search, sort, paging
- Tambah, edit, hapus jadwal (admin/superadmin only)
- **Export** ke Excel
- **Download template** & **Import** dari Excel — upsert berdasarkan `calibration_id`
- Cache 1 menit + auto-refresh setiap 1 menit
- Reload otomatis saat tab aktif kembali

**Kolom utama:** No.ID, Description, Calibration ID, Parameter, Process Range, Reject Error Limit, Due Date, Remark, Criticality

---

### Log Kalibrasi (`/logCal`)
Input pelaksanaan kalibrasi per periode bulan/tahun.

**Fitur:**
- Pilih bulan & tahun → tampilkan semua jadwal kalibrasi bulan tersebut
- Alat dengan status `obsolete` ditandai dengan baris abu-abu (tetap tampil untuk referensi historis)
- Input PIC via custom dropdown (daftar user dari DB, exclude superadmin)
- Input execute date & keterangan per baris
- Simpan per baris langsung ke `logaktivitas` — status baris berubah jadi **Selesai** tanpa reload halaman
- Baris yang sudah Selesai: tampil centang hijau + tombol **Backlog** (clipboard icon)
- **Backlog modal** untuk baris Selesai: set status (Pending/Completed) + catatan
- Badge backlog di kolom Status: kuning (Pending) / biru (Done)
- Print laporan kalibrasi bulanan (landscape)
- Fix encoding otomatis untuk karakter `°C`, `°F`, `±`

---

### Log PM (`/logPm`)
Input pelaksanaan Preventive Maintenance per periode bulan/tahun.

**Fitur:**
- Pilih bulan & tahun → tampilkan semua alat PM yang terjadwal bulan tersebut
- Pengecekan interval PM dari 3 field: `schedule`, `6_monthly`, `yearly`
- Kolom interval PM ditampilkan (6 bulan / 12 bulan)
- Input PIC, execute date, keterangan per baris
- Log ID otomatis format `{No.ID}.PM`
- Simpan per baris langsung ke `logaktivitas`
- Baris Selesai: centang hijau + tombol **Backlog**
- **Backlog modal** dengan audit trail (waktu & user yang mengubah)
- Badge backlog di kolom Status
- Print laporan PM bulanan (landscape)

---

### All Aktivitas (`/allAktivitas`)
Riwayat lengkap semua log aktivitas (Kalibrasi + PM).

**Fitur:**
- Tabel DataTables semua log tanpa filter periode
- Kolom: No, No.ID, Description, Log ID, Jenis, PIC, Execute Date, Keterangan
- Badge **obsolete** di kolom No.ID jika alat sudah obsolete
- Badge **Pending** (kuning) / **Done** (hijau) di kolom Keterangan untuk status backlog
- Edit log: ubah PIC, tanggal, keterangan, dan status backlog + catatan
- Hapus log (single atau bulk delete dengan checkbox)
- Auto-refresh setiap 1 menit
- Reload saat tab aktif kembali
- Print semua log aktivitas
- Hanya user login yang bisa edit/hapus

---

### Backlog / Follow-up
Sistem tracking tindak lanjut yang belum selesai setelah aktivitas PM/Kalibrasi dilakukan.

**Skenario:** PM sudah dilakukan tapi ada part yang belum diganti karena inden barang.

**Status backlog:**
| Status | Keterangan |
|---|---|
| `null` | Tidak ada backlog |
| `pending` | Ada follow-up yang masih perlu ditindaklanjuti |
| `completed` | Follow-up sudah selesai |

**Audit trail:** Setiap perubahan backlog menyimpan:
- `backlog_updated_at` — timestamp perubahan
- `backlog_updated_by` — inisial/nama user yang mengubah

Info audit ditampilkan di modal backlog: *"Terakhir diubah: 24/03/2026 14:30 oleh JKL"*

---

### Data Users (`/user`)
Manajemen pengguna sistem (admin/superadmin only).

**Fitur:**
- Tambah, edit, hapus user
- Field: Nama, Email, Inisial, Role, Password
- Password disimpan sebagai SHA-256 hash
- Role tersedia: `superadmin`, `admin`, `user`
- Inisial digunakan sebagai identitas PIC di log aktivitas

---

### Konfigurasi Sistem (`/configurasi`)
Pengaturan tampilan dan identitas sistem (admin/superadmin only).

**Fitur:**
- Ubah nama sistem (tampil di sidebar & navbar)
- Upload logo (disimpan sebagai base64 di tabel `config`)
- Kompresi gambar otomatis dengan deteksi MIME type (PNG transparency dipertahankan)
- Perubahan langsung ter-reflect di seluruh tampilan tanpa reload

---

### Roles & Permissions (`/roles`)
Manajemen hak akses per role (superadmin only).

**Fitur:**
- Lihat dan edit permission per role
- Permission granular per modul: `view`, `create`, `edit`, `delete`
- Perubahan permission langsung aktif tanpa logout

---

## Sistem Autentikasi & Otorisasi

### Login
- URL: `/examples/login`
- Password di-hash SHA-256 sebelum dikirim ke DB
- Session disimpan di `localStorage` via Pinia store

### Role Hierarchy
```
superadmin > admin > user > public (tidak login)
```

### Public Access (tanpa login)
User yang tidak login tetap bisa mengakses:
- Dashboard Chart
- Daftar Alat (view only)
- Jadwal Kalibrasi (view only)
- Log Kalibrasi & Log PM (view + input)

### Permission Matrix

| Fitur | Public | User | Admin | Superadmin |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Daftar Alat (view) | ✓ | ✓ | ✓ | ✓ |
| Daftar Alat (CRUD) | — | ✓ | ✓ | ✓ |
| Daftar Alat (filter obsolete) | — | — | ✓ | ✓ |
| Jadwal Kalibrasi (view) | ✓ | ✓ | ✓ | ✓ |
| Jadwal Kalibrasi (CRUD) | — | ✓ | ✓ | ✓ |
| Log Aktivitas (view + input) | ✓ | ✓ | ✓ | ✓ |
| Log Aktivitas (edit/hapus) | — | ✓ | ✓ | ✓ |
| All Aktivitas | — | ✓ | ✓ | ✓ |
| Export/Import Excel | — | — | ✓ | ✓ |
| Data Users | — | — | ✓ | ✓ |
| Konfigurasi Sistem | — | — | ✓ | ✓ |
| Roles & Permissions | — | — | — | ✓ |

---

## Struktur Proyek

```
src/
├── api/
│   └── supabase/
│       ├── daftarAlatApi.js       # CRUD + upsert batch daftar alat
│       ├── jadwalKalibrasiApi.js  # CRUD + upsert batch jadwal kalibrasi
│       ├── logAktivitasApi.js     # Log aktivitas + backlog + dashboard data
│       ├── userApi.js             # CRUD users
│       └── configApi.js          # Baca/tulis konfigurasi sistem
├── composables/
│   ├── useDaftarAlat.js          # State + cache + auto-refresh daftar alat
│   ├── useJadwalKalibrasi.js     # State + cache + auto-refresh jadwal kalibrasi
│   ├── useLogAktivitas.js        # State + form + DataTables log aktivitas
│   ├── useExcelImport.js         # Import/export Excel (wrapper SheetJS)
│   ├── usePermissions.js         # Cek permission berdasarkan role
│   └── useConfig.js              # Baca konfigurasi sistem (nama, logo)
├── services/
│   ├── excelService.js           # SheetJS: download template, export, parse
│   └── printService.js           # Print laporan kalibrasi, PM, all aktivitas
├── views/
│   ├── DashboardChart.vue        # Dashboard dengan chart statistik
│   ├── daftarAlat/list.vue       # Halaman daftar alat
│   ├── jadwalKalibrasi/list.vue  # Halaman jadwal kalibrasi
│   ├── logAktifitas/
│   │   ├── kalibrasi.vue         # Input log kalibrasi bulanan
│   │   ├── pm.vue                # Input log PM bulanan
│   │   └── allAktivitas.vue      # Riwayat semua log aktivitas
│   ├── users/list.vue            # Manajemen user
│   ├── settings/config.vue       # Konfigurasi sistem
│   └── roles/list.vue            # Roles & permissions
├── components/layouts/
│   ├── Sidebar.vue               # Navigasi sidebar (Vue-native toggle)
│   └── Navbar.vue                # Navbar atas
├── config/
│   └── supabase.js               # Inisialisasi Supabase client
├── stores/
│   └── userStore.js              # Pinia store untuk session user
└── router/index.js               # Definisi route + navigation guard
```

---

## SQL Files

| File | Fungsi |
|---|---|
| `supabase-schema.sql` | Skema lengkap semua tabel |
| `add-backlog-columns.sql` | Tambah kolom backlog + audit trail ke `logaktivitas` |
| `fix-daftaralat-sequence.sql` | Fix sequence auto-increment kolom `no` di `daftaralat` |

---

## Catatan Teknis

- **Encoding fix:** Karakter `°C`, `°F`, `±` dari data lama yang corrupt di-fix otomatis saat fetch — pengecekan degree symbol dilakukan sebelum plus-minus
- **Obsolete sync:** Status `obsolete` di `daftaralat` di-update otomatis via DB trigger `trg_sync_daftaralat_status` saat log aktivitas berisi keterangan `obsolete`. Keterangan historis di log tidak ikut berubah saat status alat dikembalikan ke aktif
- **Import upsert:** Daftar Alat menggunakan `no_id` sebagai key upsert, Jadwal Kalibrasi menggunakan `calibration_id`
- **Import tidak mempengaruhi log aktivitas:** Tabel `logaktivitas` tidak disentuh saat import. Semua riwayat aktivitas tetap aman. Import hanya update/insert di `daftaralat` dan `kalibrasi`
- **Perubahan No.ID saat import:** Jika `no_id` alat diganti di file Excel (misal `EWT-01` → `EWT-001`), sistem akan membuat entri baru karena key tidak cocok. Log aktivitas lama yang mereferensi `no_id` lama tetap ada sebagai catatan historis dan tidak ikut berubah — ini by design karena log adalah rekaman permanen
- **Sequence workaround:** Kolom `no` di `daftaralat` menggunakan fetch `MAX(no)` + assign manual untuk insert baru karena sequence DB sempat tidak sinkron
- **Supabase RPC:** Menggunakan `try/catch` bukan `.catch()` karena `supabase.rpc()` mengembalikan PromiseLike bukan Promise
