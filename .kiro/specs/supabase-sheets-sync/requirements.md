# Requirements: Supabase ↔ Google Sheets Sync System

## Overview

Sistem ini membangun jembatan sinkronisasi antara Supabase (primary database) dan Google Sheets via Google Apps Script (GAS) sebagai backup. Tujuannya adalah mengurangi egress cost Supabase, menyediakan failover otomatis, dan mempertahankan akses legacy via Google Sheets API.

---

## 1. Cache Manager (localStorage TTL-based)

### 1.1 Cache Storage
- Sistem HARUS menyimpan response data ke `localStorage` dengan key berbasis nama endpoint/query
- Setiap cache entry HARUS menyimpan data, timestamp, dan TTL
- Default TTL HARUS 30 menit (1.800.000 ms)

### 1.2 Cache Retrieval
- Sistem HARUS mengembalikan data dari cache jika entry ada dan belum expired
- Sistem HARUS mengembalikan `null` (cache miss) jika entry expired atau tidak ada
- Expired entries HARUS dihapus secara otomatis saat diakses

### 1.3 Cache Invalidation
- Sistem HARUS menyediakan method `invalidate(key)` untuk hapus cache entry tertentu
- Sistem HARUS menyediakan method `invalidateAll()` untuk hapus semua cache entries
- Write operations (insert, update, delete) HARUS selalu invalidate cache yang relevan

### 1.4 Fallback ke Memory Cache
- Jika `localStorage` tidak tersedia atau throw error, sistem HARUS fallback ke in-memory Map
- Fallback TIDAK BOLEH menyebabkan error yang terekspos ke UI
- Sistem HARUS log warning saat menggunakan memory fallback

---

## 2. Egress Monitor

### 2.1 Request Tracking
- Setiap Supabase API call HARUS dicatat dengan: endpoint name, estimated byte size, timestamp
- Estimasi byte size DIHITUNG dari `JSON.stringify(response).length`
- Data tracking HARUS disimpan ke `localStorage` dengan rolling 30-hari window

### 2.2 Usage Aggregation
- Sistem HARUS menyediakan `getTodayUsage()` yang return total bytes hari ini
- Sistem HARUS menyediakan `getMonthUsage()` yang return total bytes bulan berjalan
- Sistem HARUS menyediakan `getUsageByDay(n)` yang return array usage per hari untuk n hari terakhir

### 2.3 Threshold Warning
- Batas egress bulanan ADALAH 8 GB (8.589.934.592 bytes)
- Sistem HARUS emit warning saat penggunaan bulanan mencapai 80% dari batas (≥ 6.87 GB)
- Warning HARUS tersedia sebagai reactive state yang bisa diobservasi komponen

### 2.4 Data Retention
- Data egress HARUS otomatis dihapus jika lebih dari 30 hari
- Cleanup HARUS berjalan saat service diinisialisasi

---

## 3. Data Source Status & Failover

### 3.1 Reactive State
- Sistem HARUS menyediakan composable `useDataSourceStatus` dengan reactive state:
  - `isUsingBackup`: boolean, true jika aktif menggunakan Google Sheets
  - `dataSource`: string, `'supabase'` atau `'google-sheets'`
  - `lastError`: object/null, error terakhir yang menyebabkan failover
  - `lastChecked`: Date/null, waktu terakhir status dicek

### 3.2 Failover Trigger
- Method `setFallback(error)` HARUS mengubah state ke backup mode
- Saat masuk backup mode, sistem HARUS emit event `datasource:fallback` via `window.dispatchEvent`
- `lastError` HARUS menyimpan error object yang menyebabkan failover

### 3.3 Recovery
- Method `setPrimary()` HARUS mengembalikan state ke primary mode (Supabase)
- Saat kembali ke primary, sistem HARUS emit event `datasource:recovered`
- `lastChecked` HARUS diupdate setiap kali `checkStatus()` dipanggil

### 3.4 Persistence
- State failover HARUS dipersist ke `localStorage` agar tidak reset saat page refresh
- State HARUS di-restore saat composable pertama kali diinisialisasi

---

## 4. Unified API Service

### 4.1 API Coverage
- Unified API HARUS meng-wrap semua endpoint Supabase:
  - `daftarAlat`: getDaftarAlat, getDaftarAlatById, createDaftarAlat, updateDaftarAlat, deleteDaftarAlat
  - `kalibrasi`: getKalibrasi, getKalibrasiById, createKalibrasi, updateKalibrasi, deleteKalibrasi
  - `logAktivitas`: getLogAktivitas, createLogAktivitas
  - `users`: getUsers, getUserById, createUser, updateUser, deleteUser
  - `config`: getConfig, updateConfig

### 4.2 Auto-failover Logic
- Jika Supabase call throw error, sistem HARUS otomatis retry menggunakan Google Sheets API
- Failover HARUS memanggil `setFallback(error)` dari `useDataSourceStatus`
- Jika Google Sheets API juga gagal, sistem HARUS throw error dengan context lengkap
- Saat Supabase kembali available, sistem HARUS otomatis kembali ke primary pada request berikutnya

### 4.3 Cache Integration
- Read operations HARUS cek cache terlebih dahulu sebelum hit API
- Cache hit HARUS return data tanpa network request
- Cache HARUS diisi setelah successful API response
- Write operations HARUS invalidate cache yang relevan

### 4.4 Egress Tracking Integration
- Setiap successful Supabase response HARUS dicatat ke egressMonitor
- Tracking HARUS non-blocking (tidak delay response ke caller)

---

## 5. UI Components

### 5.1 FailoverBanner
- Banner HARUS tampil secara otomatis saat `isUsingBackup === true`
- Banner HARUS menampilkan: pesan warning, nama data source aktif, waktu failover
- Banner HARUS memiliki tombol: "Lihat Detail", "Coba Lagi", "Tutup"
- Tombol "Coba Lagi" HARUS memanggil `checkStatus()` dan attempt re-connect ke Supabase
- Banner HARUS bisa di-dismiss (tutup) oleh user
- Setelah di-dismiss, banner TIDAK BOLEH muncul kembali kecuali state berubah

### 5.2 LegacyBanner
- Banner HARUS tampil di semua halaman dengan route prefix `/legacy/*`
- Banner HARUS menampilkan info bahwa halaman ini menggunakan Google Sheets API
- Banner HARUS memiliki tombol "Kembali ke Mode Primary" yang redirect ke route non-legacy yang setara
- Smart redirect: `/legacy/daftarAlat` → `/daftarAlat`, `/legacy/dashboard` → `/`

---

## 6. Legacy Routes

### 6.1 Route Structure
- Semua legacy routes HARUS berada di bawah prefix `/legacy/*`
- Legacy routes HARUS memiliki meta `{ isLegacyMode: true }`
- Legacy routes yang HARUS ada:
  - `/legacy/dashboard`
  - `/legacy/daftarAlat`
  - `/legacy/jadwalKalibrasi`
  - `/legacy/logAktifitas/kalibrasi`
  - `/legacy/logAktifitas/pm`
  - `/legacy/logAktifitas/allAktivitas`

### 6.2 Legacy View Behavior
- Setiap legacy view HARUS force-use Google Sheets API (import langsung dari `src/api/` lama)
- Legacy views HARUS TIDAK menggunakan `unifiedApi` atau Supabase
- Setiap legacy view HARUS include `LegacyBanner` component

---

## 7. Monitoring Dashboard

### 7.1 Egress Usage View (`/monitoring/egress`)
- View HARUS menampilkan summary card: usage hari ini dan bulan ini dengan progress bar
- Progress bar HARUS berwarna: hijau (<60%), kuning (60-80%), merah (>80%)
- View HARUS menampilkan line chart 30 hari terakhir menggunakan Chart.js
- View HARUS menampilkan tabel top 5 endpoints berdasarkan usage
- View HARUS auto-refresh setiap 5 menit dan memiliki tombol manual refresh

### 7.2 Sync Status View (`/monitoring/sync`)
- View HARUS menampilkan table dengan kolom: Table, Supabase Rows, Last Sync, Status, Action
- Tabel yang ditampilkan: daftaralat, kalibrasi, logaktivitas, users, config
- Setiap row HARUS memiliki tombol "Manual Sync"
- Status HARUS berupa badge berwarna: Synced (hijau), Out of Sync (kuning), Error (merah)

### 7.3 Access Control
- Monitoring routes (`/monitoring/*`) HARUS hanya bisa diakses oleh role admin atau superadmin

---

## 8. Data Recovery Tool

### 8.1 Manual Sync View (`/recovery/manual-sync`)
- View HARUS hanya bisa diakses oleh role superadmin
- View HARUS memiliki 3 tab: Export, Import, Manual Sync

### 8.2 Export Tab
- User HARUS bisa download semua data Supabase sebagai file JSON
- File JSON HARUS berisi semua tabel: daftarAlat, kalibrasi, logAktivitas, users, config
- Filename HARUS include timestamp: `supabase-export-YYYY-MM-DD.json`

### 8.3 Import Tab
- User HARUS bisa upload file JSON dan import ke Google Sheets via GAS batch API
- Import HARUS menampilkan preview data sebelum konfirmasi
- Progress HARUS ditampilkan per tabel selama proses import

### 8.4 Manual Sync Tab
- User HARUS bisa trigger sync per tabel (Supabase → Google Sheets)
- Progress indicator HARUS tampil per tabel selama sync
- Hasil sync (sukses/gagal + jumlah record) HARUS ditampilkan setelah selesai

---

## 9. GAS Webhook Handler

### 9.1 Webhook Endpoint
- GAS script HARUS menyediakan `doPost(e)` handler untuk menerima Supabase Database Webhooks
- Handler HARUS parse JSON body dari request
- Handler HARUS routing ke sheet yang tepat berdasarkan `table` field dalam payload

### 9.2 Upsert Logic
- Untuk event `INSERT` dan `UPDATE`: HARUS upsert row di sheet (cari by ID, update jika ada, insert jika tidak)
- Untuk event `DELETE`: HARUS hapus row dari sheet berdasarkan ID
- Semua operasi HARUS atomic per row (tidak partial update)

### 9.3 Response Format
- Success response: `{ status: 'ok', table: <name>, action: <insert|update|delete>, id: <id> }`
- Error response: `{ status: 'error', message: <string> }` dengan HTTP 500

---

## 10. Setup Documentation

### 10.1 SYNC_SETUP_GUIDE.md
- Dokumentasi HARUS mencakup: prerequisites, langkah deploy GAS script, cara setup Supabase Database Webhooks
- Dokumentasi HARUS step-by-step dengan screenshot placeholder
- Dokumentasi HARUS mencakup troubleshooting section
