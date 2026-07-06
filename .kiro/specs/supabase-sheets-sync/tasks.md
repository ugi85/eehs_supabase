# Tasks: Supabase ↔ Google Sheets Sync System

- [-] 1. Build Cache Manager Service
  - Buat `src/services/cacheManager.js` dengan localStorage cache TTL 30 menit
  - Methods: get, set, invalidate, invalidateAll
  - Fallback ke memory cache jika localStorage gagal
  - **Demo**: Import cacheManager, set/get data, verify TTL expiry

- [~] 2. Build Egress Monitor Service
  - Buat `src/services/egressMonitor.js`
  - Track tiap Supabase request dengan estimasi byte size
  - Aggregation: getTodayUsage(), getMonthUsage(), getUsageByDay(n)
  - Rolling 30-hari window, threshold warning 80% dari 8GB
  - **Demo**: Track beberapa requests, verify aggregasi data

- [~] 3. Build Data Source Status Composable
  - Buat `src/composables/useDataSourceStatus.js`
  - Reactive: isUsingBackup, dataSource, lastError, lastChecked
  - Methods: setFallback(err), setPrimary(), checkStatus()
  - Emit events: datasource:fallback, datasource:recovered
  - **Demo**: Trigger setFallback, verify state changes reaktif

- [~] 4. Build Unified API Service with Failover
  - Buat `src/services/unifiedApi.js`
  - Wrap semua Supabase API (daftarAlat, kalibrasi, logAktivitas, users, config)
  - Auto-failover ke Google Sheets API saat Supabase error
  - Integrate dengan cacheManager (30 menit TTL)
  - Integrate dengan egressMonitor (track setiap request)
  - Invalidate cache setelah write operations
  - **Demo**: Call getDaftarAlat(), verify cache hit pada call kedua

- [~] 5. Build FailoverBanner and LegacyBanner Components
  - Buat `src/components/common/FailoverBanner.vue`: warning banner saat backup mode aktif
  - Buat `src/components/common/LegacyBanner.vue`: info banner di halaman legacy
  - FailoverBanner: tombol "Lihat Detail", "Coba Lagi", "Tutup"
  - LegacyBanner: tombol "Kembali ke Mode Primary" dengan smart redirect
  - **Demo**: Tampilkan FailoverBanner, verifikasi tombol berfungsi

- [~] 6. Update Composables Cache Duration to 30 Minutes
  - Update `src/composables/useDaftarAlat.js`: CACHE_DURATION 1 menit → 30 menit
  - Update `src/composables/useJadwalKalibrasi.js`: sama
  - Auto-refresh interval: 1 menit → 30 menit
  - Cache invalidation saat write tetap bekerja (clear + refetch)
  - **Demo**: Fetch data, reload page, verify data dari cache (tidak fetch ulang)

- [~] 7. Update Navbar with Data Source Badge
  - Update `src/components/layouts/Navbar.vue`
  - Tambah badge "🟢 Primary" atau "🟡 Backup" di navbar kanan
  - Gunakan useDataSourceStatus composable
  - Click badge → modal detail: mode, reason, last check, tombol "Switch"
  - **Demo**: Badge tampil di navbar, mode indicator berubah saat state berubah

- [~] 8. Update Sidebar with Monitoring and Legacy Sections
  - Update `src/components/layouts/Sidebar.vue`
  - Tambah menu group "Monitoring" (collapsible, admin only) dengan submenu Egress Usage dan Sync Status
  - Tambah menu item "Legacy Mode" di bawah dengan link ke `/legacy/dashboard`
  - **Demo**: Sidebar tampilkan menu baru, navigasi ke /legacy/dashboard berfungsi

- [~] 9. Create Legacy Views (Google Sheets mode)
  - Buat folder `src/views/legacy/`
  - Buat `legacy/Dashboard.vue`, `legacy/daftarAlat/list.vue`, `legacy/jadwalKalibrasi/list.vue`
  - Buat `legacy/logAktifitas/kalibrasi.vue`, `legacy/logAktifitas/pm.vue`, `legacy/logAktifitas/allAktivitas.vue`
  - Setiap view: force-use Google Sheets API (import dari `src/api/` lama), include LegacyBanner
  - **Demo**: Buka /legacy/daftarAlat, verifikasi data dari Google Sheets, banner tampil

- [~] 10. Update Router with Legacy and Monitoring Routes
  - Update `src/router/index.js`
  - Tambah route group `/legacy/*` dengan meta `{ isLegacyMode: true }`
  - Tambah routes `/monitoring/egress`, `/monitoring/sync`
  - Tambah route `/recovery/manual-sync` (superadmin only)
  - **Demo**: Navigate ke semua route baru, verifikasi tidak ada 404

- [~] 11. Create Egress Usage Monitoring View
  - Buat `src/views/monitoring/EgressUsage.vue`
  - Summary card: penggunaan hari ini dan bulan ini (progress bar warna)
  - Line chart Chart.js: 30 hari terakhir harian usage
  - Table top 5 endpoints by usage
  - Auto-refresh 5 menit, tombol manual refresh
  - **Demo**: Dashboard tampilkan data egress, chart render dengan benar

- [~] 12. Create Sync Status Monitoring View
  - Buat `src/views/monitoring/SyncStatus.vue`
  - Table per tabel: daftaralat, kalibrasi, logaktivitas, users, config
  - Kolom: Table, Supabase Rows, Last Sync, Status, Action
  - Tombol "Manual Sync" per tabel
  - **Demo**: View tampil dengan status per tabel

- [~] 13. Create Data Recovery View
  - Buat `src/views/recovery/ManualSync.vue` (superadmin only)
  - Tab "Export": download semua data Supabase sebagai JSON
  - Tab "Import": upload JSON ke Google Sheets via GAS batch API
  - Tab "Manual Sync": sync per tabel dengan progress indicator
  - **Demo**: Export data Supabase berhasil, file JSON ter-download

- [~] 14. Create GAS Webhook Script and Documentation
  - Buat `GAS_SYNC_WEBHOOK.js` di root: Google Apps Script untuk terima Supabase webhooks
  - doPost() handler, routing ke sheet berdasarkan table name, upsert logic
  - Buat `SYNC_SETUP_GUIDE.md`: panduan deploy GAS, setup Supabase webhooks
  - **Demo**: File tersedia, dokumentasi lengkap dengan step-by-step
