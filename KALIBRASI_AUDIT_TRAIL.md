# Audit Trail - Jadwal Kalibrasi

## Overview
Fitur audit trail untuk Jadwal Kalibrasi menampilkan informasi kapan data dibuat, diupdate, dan oleh siapa.

## Cara Menggunakan

### 1. Jalankan SQL Migration
Jalankan file SQL berikut di Supabase SQL Editor untuk menambahkan kolom audit trail ke tabel `kalibrasi`:

```sql
-- File: add-kalibrasi-audit-columns.sql
```

File ini akan:
- Menambahkan kolom `created_at`, `updated_at`, `created_by`, `updated_by` ke tabel `kalibrasi`
- Membuat trigger otomatis untuk update `updated_at`
- Membuat tabel `kalibrasi_audit_log` untuk history lengkap
- Update data existing dengan nilai default

### 2. Hover Icon di Jadwal Kalibrasi
Setelah migration dijalankan, icon info (`ℹ️`) akan muncul di kolom **No.ID** pada tabel Jadwal Kalibrasi.

Hover mouse di atas icon untuk melihat:
- **Dibuat**: Tanggal dan waktu pembuatan, serta user yang membuat
- **Update**: Tanggal dan waktu update terakhir, serta user yang update (jika ada)

## Sumber Data Audit Trail

Data audit trail diambil dengan prioritas:
1. **Utama**: Dari tabel `kalibrasi` (jika sudah memiliki kolom audit)
2. **Fallback**: Dari tabel `daftaralat` (data alat yang sudah memiliki audit trail)

## Implementasi Teknis

### File yang Diubah

#### 1. API Layer
**File**: `src/api/supabase/jadwalKalibrasiApi.js`

```javascript
// Fetch daftar alat untuk audit trail fallback
const { data: daftarAlatData } = await supabase
  .from('daftaralat')
  .select('no_id, status, created_at, updated_at, created_by, updated_by')

// Map dengan fallback
created_at: item.created_at || alatData.created_at || null,
updated_at: item.updated_at || alatData.updated_at || null,
created_by: item.created_by || alatData.created_by || null,
updated_by: item.updated_by || alatData.updated_by || null
```

#### 2. Vue Component
**File**: `src/views/jadwalKalibrasi/list.vue`

```vue
<!-- Tooltip di kolom No.ID -->
<td>{{ row.no_id || '—' }}
  <span v-if="row.created_at || row.updated_at" class="ml-1" style="cursor: help;" :title="formatAuditInfo(row)">
    <i class="fas fa-info-circle text-muted" style="font-size: 0.75rem;"></i>
  </span>
</td>
```

#### 3. Format Function
```javascript
const formatAuditInfo = (jadwal) => {
  const parts = []
  
  if (jadwal.created_at) {
    const date = new Date(jadwal.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Dibuat: ${date}`)
    if (jadwal.created_by) parts.push(`oleh ${jadwal.created_by}`)
  }
  
  if (jadwal.updated_at && jadwal.updated_at !== jadwal.created_at) {
    const date = new Date(jadwal.updated_at).toLocaleString('id-ID', { ... })
    parts.push(`Update: ${date}`)
    if (jadwal.updated_by) parts.push(`oleh ${jadwal.updated_by}`)
  }
  
  return parts.join('\n') || 'Tidak ada informasi audit'
}
```

## Database Schema

### Tabel: kalibrasi (setelah migration)
```sql
created_at      timestamptz     DEFAULT NOW()
updated_at      timestamptz     DEFAULT NOW() (auto-update trigger)
created_by      varchar(100)
updated_by      varchar(100)
```

### Tabel: kalibrasi_audit_log (baru)
```sql
id              bigserial       PRIMARY KEY
alat_no_id      text            NOT NULL
calibration_id  text
action          text            -- 'INSERT', 'UPDATE', 'DELETE'
old_data        jsonb
new_data        jsonb
changed_by      varchar(100)
changed_at      timestamptz     DEFAULT NOW()
```

## Troubleshooting

### Icon tidak muncul
- Pastikan migration SQL sudah dijalankan
- Cek apakah data memiliki `created_at` atau `updated_at`
- Periksa console browser untuk error

### Data audit tidak lengkap
- Pastikan user sudah login (untuk tracking `created_by` dan `updated_by`)
- Cek trigger di Supabase: `trg_kalibrasi_updated_at` dan `trg_kalibrasi_audit`
- Periksa tabel `kalibrasi_audit_log` untuk history lengkap

## Catatan Penting
- Icon hanya muncul jika ada data audit trail (`created_at` atau `updated_at`)
- Data fallback dari `daftaralat` memastikan informasi tetap tampil meskipun data kalibrasi belum lengkap
- Trigger otomatis akan mengupdate `updated_at` setiap kali ada perubahan data
