# Audit Trail - Daftar Alat

## 📋 Overview
Fitur audit trail untuk melacak kapan dan oleh siapa data alat dibuat atau diubah.

---

## 🚀 Cara Setup

### **Step 1: Jalankan SQL Migration**

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy paste isi file `add-audit-trail-columns.sql`
3. Klik **Run** untuk execute

File ini akan:
- ✅ Menambahkan kolom: `created_at`, `updated_at`, `created_by`, `updated_by`
- ✅ Membuat trigger otomatis untuk `updated_at`
- ✅ Membuat tabel `daftaralat_audit_log` untuk history lengkap
- ✅ Update data existing dengan default values

---

### **Step 2: Test di Aplikasi**

1. Refresh browser
2. Buka **Daftar Alat**
3. Tambah atau edit alat
4. Hover icon ⓘ di kolom **No.ID** untuk melihat audit trail

---

## 📊 Apa yang Direkam

### **Level 1: Kolom di Tabel `daftaralat`** (Sudah diimplementasi)
| Kolom | Deskripsi | Auto/Manual |
|-------|-----------|-------------|
| `created_at` | Timestamp data dibuat | ✅ Auto (NOW()) |
| `updated_at` | Timestamp data terakhir diupdate | ✅ Auto (Trigger) |
| `created_by` | User yang membuat data | ⚠️ Manual (dari user session) |
| `updated_by` | User yang update data | ⚠️ Manual (dari user session) |

### **Level 2: Tabel `daftaralat_audit_log`** (Sudah di SQL)
Tabel terpisah yang menyimpan **history lengkap** setiap perubahan:
- `id`: Auto increment
- `alat_no_id`: No.ID alat yang berubah
- `action`: 'INSERT', 'UPDATE', atau 'DELETE'
- `old_data`: Data sebelum perubahan (JSON)
- `new_data`: Data setelah perubahan (JSON)
- `changed_by`: User yang mengubah
- `changed_at`: Timestamp perubahan

---

## 💡 Cara Pakai Audit Trail

### **1. Lihat Audit Trail di UI**
- Hover icon ⓘ di kolom No.ID
- Tooltip akan menampilkan:
  ```
  Dibuat: 12/04/2026 14:30 oleh admin@company.com
  Update: 12/04/2026 15:45 oleh user@company.com
  ```

### **2. Query Audit Trail di Supabase**

```sql
-- Lihat semua perubahan untuk alat tertentu
SELECT 
  action,
  changed_by,
  changed_at,
  old_data->>'description' as old_description,
  new_data->>'description' as new_description
FROM daftaralat_audit_log
WHERE alat_no_id = 'ALAT-001'
ORDER BY changed_at DESC;

-- Lihat siapa yang paling sering update
SELECT 
  changed_by,
  COUNT(*) as total_changes
FROM daftaralat_audit_log
GROUP BY changed_by
ORDER BY total_changes DESC;

-- Lihat data yang dihapus
SELECT *
FROM daftaralat_audit_log
WHERE action = 'DELETE'
ORDER BY changed_at DESC;
```

---

## 🔧 Integrasi dengan User Session (Opsional)

Untuk otomatis mengisi `created_by` dan `updated_by`, update composable `useDaftarAlat`:

```javascript
// src/composables/useDaftarAlat.js
import { useAuth } from '@/composables/useAuth' // atau wherever user stored

async function saveTool(tool) {
  const { user } = useAuth() // Get current user
  
  const result = await daftarAlatApi.saveTool(tool, user.value)
  // ... rest of code
}
```

---

## 📝 Contoh Penggunaan

### **Scenario 1: Cek kapan data baru ditambahkan**
```sql
SELECT 
  no_id,
  description,
  created_at,
  created_by
FROM daftaralat
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **Scenario 2: Cek siapa yang ubah data**
```sql
SELECT 
  alat_no_id,
  old_data->>'status' as old_status,
  new_data->>'status' as new_status,
  changed_by,
  changed_at
FROM daftaralat_audit_log
WHERE action = 'UPDATE'
  AND old_data->>'status' != new_data->>'status'
ORDER BY changed_at DESC;
```

### **Scenario 3: Restore data yang terhapus**
```sql
-- Lihat data yang terhapus
SELECT * FROM daftaralat_audit_log WHERE action = 'DELETE';

-- Restore (manual insert)
INSERT INTO daftaralat (no_id, description, type_model, ...)
SELECT 
  old_data->>'no_id',
  old_data->>'description',
  old_data->>'type_model',
  ...
FROM daftaralat_audit_log
WHERE alat_no_id = 'ALAT-001' AND action = 'DELETE';
```

---

## ⚠️ Catatan Penting

### **🔴 TROUBLESHOOTING: Error Bulk Delete**

Jika Anda mendapat error saat bulk delete seperti:
```
Bulk Delete Selesai Sebagian
Berhasil menghapus 0 dari 18 alat.
Beberapa chunk gagal, silakan ulangi untuk sisa data.
```

**Penyebab:**
- Trigger audit trail mencoba insert ke tabel `daftaralat_audit_log` yang belum ada
- Atau ada masalah dengan trigger function

**Solusi (PILIH SALAH SATU):**

#### **Opsi A: Fix dengan SQL (RECOMMENDED)**
1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy paste isi file `fix-audit-trigger.sql`
3. Klik **Run**
4. Test bulk delete lagi

#### **Opsi B: Disable Trigger Sementara**
Jika Anda belum butuh audit trail dan ingin bulk delete jalan:
```sql
-- Disable trigger audit trail
DROP TRIGGER IF EXISTS trg_daftaralat_audit ON daftaralat;
DROP FUNCTION IF EXISTS log_daftaralat_changes();

-- Bulk delete akan jalan normal
-- Nanti bisa enable lagi dengan run add-audit-trail-columns.sql
```

#### **Opsi C: Cek Console Log**
1. Buka **Browser Developer Console** (F12)
2. Coba bulk delete lagi
3. Lihat error detail di console
4. Screenshot dan share untuk debug lebih lanjut

---

1. **Trigger `updated_at`** otomatis update setiap kali ada perubahan
2. **Tabel `daftaralat_audit_log`** bisa jadi besar → pertimbangkan untuk archive data lama
3. **`created_by` dan `updated_by`** saat ini masih manual (perlu integrasi dengan user session)
4. Untuk **import Excel**, user akan tercatat sebagai `'system'` atau `'migration'` (bisa diupdate)

---

## 🎯 Best Practices

| Kebutuhan | Solusi |
|-----------|--------|
| Lihat perubahan terakhir | Hover icon ⓘ di UI |
| Lihat history lengkap | Query `daftaralat_audit_log` |
| Restore data terhapus | Query audit log + manual insert |
| Tracking siapa yang ubah | Isi `updated_by` dari user session |
| Performance | Index sudah ada di `created_at` dan `updated_at` |

---

## 📚 File yang Diubah

- ✅ `add-audit-trail-columns.sql` - Migration SQL
- ✅ `src/api/supabase/daftarAlatApi.js` - API update
- ✅ `src/views/daftarAlat/list.vue` - UI tooltip

---

**Last Updated**: 12 April 2026
