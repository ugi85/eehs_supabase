# Design: Supabase ↔ Google Sheets Sync System

## Overview

Arsitektur ini memperkenalkan lapisan abstraksi di antara UI dan data source. Supabase tetap menjadi primary, Google Sheets (via GAS) menjadi backup. Cache localStorage meminimalkan egress, dan monitoring dashboard memberikan visibilitas penggunaan.

```
┌─────────────────────────────────────────────────────┐
│                    Vue Components                    │
├─────────────────────────────────────────────────────┤
│              unifiedApi (Facade Layer)               │
│         ┌──────────────┬──────────────┐             │
│         │  cacheManager│ egressMonitor│             │
│         └──────────────┴──────────────┘             │
│    ┌──────────────────────────────────────┐         │
│    │         useDataSourceStatus          │         │
│    └──────────────────────────────────────┘         │
├──────────────────────┬──────────────────────────────┤
│   Supabase API       │   Google Sheets API (GAS)    │
│   (Primary)          │   (Backup / Legacy)          │
└──────────────────────┴──────────────────────────────┘
```

---

## 1. cacheManager Service

**File**: `src/services/cacheManager.js`

### Responsibilities
- Menyimpan dan mengambil data dari `localStorage` dengan TTL
- Fallback ke in-memory Map jika `localStorage` tidak tersedia

### Interface

```js
const cacheManager = {
  get(key),           // returns data atau null (jika expired/tidak ada)
  set(key, data, ttl = 1_800_000),  // simpan dengan TTL default 30 menit
  invalidate(key),    // hapus satu entry
  invalidateAll(),    // hapus semua entry dengan prefix 'cache:'
}
```

### Storage Format

```json
{
  "cache:daftarAlat:all": {
    "data": [...],
    "timestamp": 1700000000000,
    "ttl": 1800000
  }
}
```

### Implementation Notes
- Key prefix: `cache:` untuk semua entries
- Cek expiry: `Date.now() > timestamp + ttl`
- Try/catch semua `localStorage` calls, fallback ke `Map` object
- `invalidateAll()` hanya hapus keys yang prefix `cache:`

---

## 2. egressMonitor Service

**File**: `src/services/egressMonitor.js`

### Responsibilities
- Catat setiap Supabase request dengan ukuran data
- Aggregasi usage untuk monitoring dashboard
- Deteksi threshold warning

### Interface

```js
const egressMonitor = {
  track(endpointName, responseData),  // catat satu request
  getTodayUsage(),                     // total bytes hari ini (number)
  getMonthUsage(),                     // total bytes bulan ini (number)
  getUsageByDay(n = 30),               // array [{date, bytes}] untuk n hari
  isNearLimit(),                       // boolean, true jika >= 80% dari 8GB
  getTopEndpoints(n = 5),              // array [{endpoint, bytes}] top n
}
```

### Storage Format

```json
{
  "egress:log": [
    { "endpoint": "daftarAlat", "bytes": 4096, "ts": 1700000000000 },
    ...
  ]
}
```

### Implementation Notes
- `bytes` dihitung: `new TextEncoder().encode(JSON.stringify(data)).length`
- Rolling cleanup: hapus entries dengan `ts < Date.now() - 30 * 86400 * 1000`
- `MONTHLY_LIMIT = 8 * 1024 * 1024 * 1024` (8 GB dalam bytes)
- Warning threshold: `MONTHLY_LIMIT * 0.8`
- Cleanup dipanggil di constructor/init

---

## 3. useDataSourceStatus Composable

**File**: `src/composables/useDataSourceStatus.js`

### Responsibilities
- Menyediakan reactive state untuk status data source
- Persist state ke localStorage agar survive page refresh
- Emit browser events saat state berubah

### Interface

```js
const {
  isUsingBackup,  // computed boolean
  dataSource,     // computed: 'supabase' | 'google-sheets'
  lastError,      // ref: Error object atau null
  lastChecked,    // ref: Date atau null
  setFallback(error),  // masuk ke backup mode
  setPrimary(),        // kembali ke primary mode
  checkStatus(),       // cek availability Supabase
} = useDataSourceStatus()
```

### State Shape (localStorage key: `datasource:status`)

```json
{
  "isBackup": false,
  "lastError": null,
  "lastChecked": "2024-01-01T00:00:00.000Z"
}
```

### Events
- `window.dispatchEvent(new CustomEvent('datasource:fallback', { detail: { error } }))`
- `window.dispatchEvent(new CustomEvent('datasource:recovered'))`

### Implementation Notes
- Gunakan `ref()` dan `computed()` dari Vue
- Composable HARUS singleton (state di-share antar instance)
- `checkStatus()` melakukan lightweight Supabase ping (misal: `supabase.from('config').select('id').limit(1)`)

---

## 4. unifiedApi Service

**File**: `src/services/unifiedApi.js`

### Responsibilities
- Facade untuk semua data operations
- Implementasi failover logic
- Integrasi cache dan egress monitoring

### Interface

```js
const unifiedApi = {
  // daftarAlat
  getDaftarAlat(params),
  getDaftarAlatById(id),
  createDaftarAlat(data),
  updateDaftarAlat(id, data),
  deleteDaftarAlat(id),

  // kalibrasi
  getKalibrasi(params),
  getKalibrasiById(id),
  createKalibrasi(data),
  updateKalibrasi(id, data),
  deleteKalibrasi(id),

  // logAktivitas
  getLogAktivitas(params),
  createLogAktivitas(data),

  // users
  getUsers(),
  getUserById(id),
  createUser(data),
  updateUser(id, data),
  deleteUser(id),

  // config
  getConfig(),
  updateConfig(data),
}
```

### Request Flow

```
unifiedApi.getDaftarAlat()
  │
  ├─ cacheManager.get('daftarAlat:all')
  │   ├─ HIT  → return cached data
  │   └─ MISS → continue
  │
  ├─ try: supabaseApi.getDaftarAlat()
  │   ├─ SUCCESS → egressMonitor.track() → cacheManager.set() → return data
  │   └─ ERROR  → setFallback(err)
  │               ↓
  └─ try: gasApi.getDaftarAlat()  (GAS = Google Apps Script)
      ├─ SUCCESS → return data (tidak di-cache, tidak di-track egress)
      └─ ERROR  → throw combined error
```

### Implementation Notes
- Import `daftarAlatApi` dari `src/api/supabase/`
- Import `useDataSourceStatus` untuk failover management
- Saat `isUsingBackup === true` (dari sebelumnya), skip Supabase dan langsung ke GAS
- Cache keys: `daftarAlat:all`, `kalibrasi:all`, `kalibrasi:jadwal`, dll.
- Write operations: invalidate semua related cache keys

---

## 5. FailoverBanner Component

**File**: `src/components/common/FailoverBanner.vue`

### Template Structure

```html
<div v-if="show" class="failover-banner alert alert-warning">
  <div class="banner-content">
    <i class="fas fa-exclamation-triangle"></i>
    <span>Mode Backup Aktif — Data diambil dari Google Sheets</span>
    <small>Sejak: {{ formatTime(lastError?.timestamp) }}</small>
  </div>
  <div class="banner-actions">
    <button @click="showDetail">Lihat Detail</button>
    <button @click="retryConnection">Coba Lagi</button>
    <button @click="dismiss">Tutup</button>
  </div>
</div>
```

### Logic
- `show`: `isUsingBackup && !dismissed`
- `dismissed`: local ref, reset ke `false` saat `isUsingBackup` berubah ke `true` lagi
- `retryConnection()`: panggil `checkStatus()` → jika sukses, tampilkan success toast
- "Lihat Detail": buka modal dengan info lengkap error dan troubleshooting tips

---

## 6. LegacyBanner Component

**File**: `src/components/common/LegacyBanner.vue`

### Template Structure

```html
<div class="legacy-banner alert alert-info">
  <i class="fas fa-info-circle"></i>
  <span>Anda sedang menggunakan Legacy Mode (Google Sheets API)</span>
  <button @click="goToPrimary">Kembali ke Mode Primary</button>
</div>
```

### Smart Redirect Logic

```js
const routeMap = {
  '/legacy/dashboard': '/',
  '/legacy/daftarAlat': '/daftarAlat',
  '/legacy/jadwalKalibrasi': '/jadwalKalibrasi',
  '/legacy/logAktifitas/kalibrasi': '/logAktifitas/kalibrasi',
  '/legacy/logAktifitas/pm': '/logAktifitas/pm',
  '/legacy/logAktifitas/allAktivitas': '/logAktifitas/allAktivitas',
}
// currentRoute.path → strip '/legacy' prefix → router.push(primaryRoute)
```

---

## 7. Updated Composables

### useDaftarAlat.js

**File**: `src/composables/useDaftarAlat.js`

Changes:
- `CACHE_DURATION`: `1 * 60 * 1000` → `30 * 60 * 1000`
- Auto-refresh interval: `1 * 60 * 1000` → `30 * 60 * 1000`
- Cache invalidation logic tetap sama (clear + refetch saat write)

### useJadwalKalibrasi.js

**File**: `src/composables/useJadwalKalibrasi.js`

Changes:
- `CACHE_DURATION`: `1 * 60 * 1000` → `30 * 60 * 1000`
- Auto-refresh interval: `1 * 60 * 1000` → `30 * 60 * 1000`

---

## 8. Navbar Update

**File**: `src/components/layouts/Navbar.vue`

### Addition: Data Source Badge

```html
<!-- Tambahkan di navbar-right sebelum user dropdown -->
<li class="nav-item datasource-badge" @click="showStatusModal = true">
  <span :class="badgeClass">
    {{ isUsingBackup ? '🟡 Backup' : '🟢 Primary' }}
  </span>
</li>

<!-- Status Modal -->
<div v-if="showStatusModal" class="datasource-modal">
  <p>Mode: {{ dataSource }}</p>
  <p>Reason: {{ lastError?.message }}</p>
  <p>Last Check: {{ lastChecked }}</p>
  <button @click="setPrimary(); showStatusModal = false">Switch ke Primary</button>
</div>
```

---

## 9. Sidebar Update

**File**: `src/components/layouts/Sidebar.vue`

### Addition: Monitoring Menu Group (admin only)

```html
<!-- Menu Group: Monitoring (collapsible, v-if="isAdmin") -->
<li class="nav-item has-treeview">
  <a class="nav-link">
    <i class="nav-icon fas fa-chart-line"></i>
    <p>Monitoring <i class="right fas fa-angle-left"></i></p>
  </a>
  <ul class="nav nav-treeview">
    <li><a href="/monitoring/egress">Egress Usage</a></li>
    <li><a href="/monitoring/sync">Sync Status</a></li>
  </ul>
</li>

<!-- Menu Item: Legacy Mode -->
<li class="nav-item">
  <router-link to="/legacy/dashboard">
    <i class="nav-icon fas fa-history"></i>
    <p>Legacy Mode</p>
  </router-link>
</li>
```

---

## 10. Router Updates

**File**: `src/router/index.js`

### New Routes

```js
// Legacy routes
{
  path: '/legacy',
  meta: { isLegacyMode: true },
  children: [
    { path: 'dashboard', component: () => import('@/views/legacy/Dashboard.vue') },
    { path: 'daftarAlat', component: () => import('@/views/legacy/daftarAlat/list.vue') },
    { path: 'jadwalKalibrasi', component: () => import('@/views/legacy/jadwalKalibrasi/list.vue') },
    { path: 'logAktifitas/kalibrasi', component: () => import('@/views/legacy/logAktifitas/kalibrasi.vue') },
    { path: 'logAktifitas/pm', component: () => import('@/views/legacy/logAktifitas/pm.vue') },
    { path: 'logAktifitas/allAktivitas', component: () => import('@/views/legacy/logAktifitas/allAktivitas.vue') },
  ]
},

// Monitoring routes (admin only)
{
  path: '/monitoring',
  meta: { requiresAuth: true, roles: ['admin', 'superadmin'] },
  children: [
    { path: 'egress', component: () => import('@/views/monitoring/EgressUsage.vue') },
    { path: 'sync', component: () => import('@/views/monitoring/SyncStatus.vue') },
  ]
},

// Recovery route (superadmin only)
{
  path: '/recovery/manual-sync',
  meta: { requiresAuth: true, roles: ['superadmin'] },
  component: () => import('@/views/recovery/ManualSync.vue'),
},
```

---

## 11. Legacy Views

**Folder**: `src/views/legacy/`

### Structure

```
src/views/legacy/
├── Dashboard.vue
├── daftarAlat/
│   └── list.vue
├── jadwalKalibrasi/
│   └── list.vue
└── logAktifitas/
    ├── kalibrasi.vue
    ├── pm.vue
    └── allAktivitas.vue
```

### Pattern untuk setiap Legacy View

```vue
<script setup>
import LegacyBanner from '@/components/common/LegacyBanner.vue'
// Import LANGSUNG dari GAS API lama (bukan unifiedApi)
import { fetchDaftarAlat } from '@/api/configApi.js'  // atau axios ke GAS URL
</script>

<template>
  <LegacyBanner />
  <!-- konten view mirip dengan primary view, tapi data dari GAS -->
</template>
```

---

## 12. Monitoring Views

### EgressUsage View

**File**: `src/views/monitoring/EgressUsage.vue`

#### Sections
1. **Summary Cards**: Today Usage + Month Usage (progress bar berwarna)
2. **Line Chart**: Chart.js, `type: 'line'`, data dari `egressMonitor.getUsageByDay(30)`
3. **Top Endpoints Table**: Dari `egressMonitor.getTopEndpoints(5)`
4. **Auto-refresh**: `setInterval` 5 menit, tombol manual refresh

#### Progress Bar Color Logic
```js
const barColor = (percent) => {
  if (percent >= 80) return 'bg-danger'
  if (percent >= 60) return 'bg-warning'
  return 'bg-success'
}
```

### SyncStatus View

**File**: `src/views/monitoring/SyncStatus.vue`

#### Table Columns
| Table | Supabase Rows | Last Sync | Status | Action |
|-------|--------------|-----------|--------|--------|
| daftaralat | count | datetime | badge | button |

#### Status Badge Colors
- `Synced`: `badge-success`
- `Out of Sync`: `badge-warning`  
- `Error`: `badge-danger`

---

## 13. Recovery View

**File**: `src/views/recovery/ManualSync.vue`

### Tab: Export
- Fetch semua data dari Supabase (semua tabel)
- `JSON.stringify()` dan trigger download via `Blob` + `URL.createObjectURL`
- Filename: `supabase-export-${new Date().toISOString().slice(0,10)}.json`

### Tab: Import
- File input accept `.json`
- Parse dan preview tabel dari JSON
- Konfirmasi dialog sebelum submit
- POST ke GAS batch endpoint dengan progress per tabel

### Tab: Manual Sync
- List semua tabel dengan tombol sync per tabel
- Progress bar per tabel saat sync berjalan
- Tampilkan result: `{ table, status, count, duration }`

---

## 14. GAS Webhook Script

**File**: `GAS_SYNC_WEBHOOK.js` (root project, bukan di `src/`)

### Script Structure

```js
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents)
    const { table, type, record, old_record } = payload
    
    const sheet = getSheetByTable(table)
    if (!sheet) return errorResponse('Unknown table: ' + table)
    
    switch (type) {
      case 'INSERT': return upsertRow(sheet, record)
      case 'UPDATE': return upsertRow(sheet, record)
      case 'DELETE': return deleteRow(sheet, old_record.id)
    }
  } catch (err) {
    return errorResponse(err.message)
  }
}

function getSheetByTable(tableName) {
  const mapping = {
    'daftaralat': 'DaftarAlat',
    'kalibrasi': 'Kalibrasi', 
    'logaktivitas': 'LogAktivitas',
    'users': 'Users',
    'config': 'Config'
  }
  const sheetName = mapping[tableName.toLowerCase()]
  return sheetName ? SpreadsheetApp.getActive().getSheetByName(sheetName) : null
}
```

---

## 15. Setup Documentation

**File**: `SYNC_SETUP_GUIDE.md` (root project)

### Sections
1. Prerequisites (Node.js, GAS account, Supabase project)
2. Deploy GAS Script (step-by-step dengan URL deployment)
3. Configure Supabase Database Webhooks (URL, events, table selection)
4. Configure Environment Variables (`.env` keys yang dibutuhkan)
5. Testing the Webhook
6. Troubleshooting

---

## Dependencies

Tidak ada dependency baru yang perlu diinstall. Semua menggunakan:
- **Vue 3 Composition API** (sudah ada)
- **Chart.js** — cek apakah sudah ada di `package.json`, jika belum tambahkan
- **localStorage API** (browser built-in)
- **Supabase JS Client** (sudah ada di `src/config/supabase.js`)
- **Axios** (sudah ada di `src/plugins/axios.js`)

---

## File Structure Summary

```
src/
├── services/
│   ├── cacheManager.js          (NEW - Task 1)
│   ├── egressMonitor.js         (NEW - Task 2)
│   ├── unifiedApi.js            (NEW - Task 4)
│   └── excelService.js          (existing)
├── composables/
│   ├── useDataSourceStatus.js   (NEW - Task 3)
│   ├── useDaftarAlat.js         (UPDATE - Task 6)
│   └── useJadwalKalibrasi.js    (UPDATE - Task 6)
├── components/
│   ├── common/
│   │   ├── FailoverBanner.vue   (NEW - Task 5)
│   │   └── LegacyBanner.vue     (NEW - Task 5)
│   └── layouts/
│       ├── Navbar.vue           (UPDATE - Task 7)
│       └── Sidebar.vue          (UPDATE - Task 8)
├── views/
│   ├── legacy/                  (NEW folder - Task 9)
│   │   ├── Dashboard.vue
│   │   ├── daftarAlat/list.vue
│   │   ├── jadwalKalibrasi/list.vue
│   │   └── logAktifitas/
│   │       ├── kalibrasi.vue
│   │       ├── pm.vue
│   │       └── allAktivitas.vue
│   ├── monitoring/              (NEW folder - Task 11, 12)
│   │   ├── EgressUsage.vue
│   │   └── SyncStatus.vue
│   └── recovery/               (NEW folder - Task 13)
│       └── ManualSync.vue
└── router/
    └── index.js                 (UPDATE - Task 10)

GAS_SYNC_WEBHOOK.js              (NEW - Task 14, root)
SYNC_SETUP_GUIDE.md              (NEW - Task 14, root)
```
