# Permission System - Role-Based Access Control

Sistem permission berbasis role untuk mengontrol akses user ke fitur-fitur aplikasi.

## 📋 Daftar Isi
- [Roles](#roles)
- [Permissions](#permissions)
- [Cara Penggunaan](#cara-penggunaan)
- [Contoh](#contoh)

---

## 🎭 Roles

Sistem ini memiliki 3 role:

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **admin** | Administrator dengan akses penuh | Semua fitur |
| **user** | User biasa | Fitur operasional (tanpa user management & config) |
| **viewer** | Viewer / Read-only | Hanya bisa melihat dan print |

---

## 🔐 Permissions

### Dashboard & Monitoring
- `dashboard:view` - Lihat dashboard
- `dashboard:edit` - Edit dashboard
- `charts:view` - Lihat charts

### Daftar Alat
- `daftarAlat:view` - Lihat daftar alat
- `daftarAlat:create` - Tambah alat baru
- `daftarAlat:edit` - Edit alat
- `daftarAlat:delete` - Hapus alat

### Jadwal Kalibrasi
- `jadwalKalibrasi:view` - Lihat jadwal kalibrasi
- `jadwalKalibrasi:create` - Tambah jadwal baru
- `jadwalKalibrasi:edit` - Edit jadwal
- `jadwalKalibrasi:delete` - Hapus jadwal

### Log Aktivitas
- `logAktivitas:view` - Lihat log aktivitas
- `logAktivitas:create` - Buat log baru
- `logAktivitas:edit` - Edit log
- `logAktivitas:delete` - Hapus log

### User Management
- `user:view` - Lihat daftar user ⚠️ **Admin only**
- `user:create` - Tambah user baru ⚠️ **Admin only**
- `user:edit` - Edit user ⚠️ **Admin only**
- `user:delete` - Hapus user ⚠️ **Admin only**

### Konfigurasi Sistem
- `config:view` - Lihat konfigurasi ⚠️ **Admin only**
- `config:edit` - Edit konfigurasi ⚠️ **Admin only**

### Reports & Print
- `report:view` - Lihat laporan
- `report:print` - Cetak laporan
- `report:export` - Export laporan

---

## 📖 Cara Penggunaan

### 1. Set User Saat Login

```javascript
import { usePermissions } from '@/composables/usePermissions'

const { setUser } = usePermissions()

// Setelah login berhasil
const user = {
  id: 'USR001',
  nama: 'John Doe',
  email: 'john@example.com',
  role: 'admin' // atau 'user' atau 'viewer'
}

setUser(user)
```

### 2. Cek Permission di Component

```javascript
import { usePermissions } from '@/composables/usePermissions'

const { can, canAny, canAll, hasRole } = usePermissions()

// Cek single permission
if (can('daftarAlat:create')) {
  // User bisa tambah alat
}

// Cek multiple permissions (salah satu)
if (canAny(['daftarAlat:create', 'daftarAlat:edit'])) {
  // User bisa create ATAU edit
}

// Cek multiple permissions (semua)
if (canAll(['daftarAlat:view', 'daftarAlat:edit'])) {
  // User bisa view DAN edit
}

// Cek role
if (hasRole('admin')) {
  // User adalah admin
}
```

### 3. Gunakan Directive di Template

```vue
<template>
  <!-- Tombol hanya muncul jika user punya permission -->
  <button v-can="'daftarAlat:create'">
    Tambah Alat
  </button>
  
  <!-- Section hanya muncul untuk admin -->
  <div v-can="'user:view'">
    <h3>User Management</h3>
  </div>
</template>
```

### 4. Gunakan Global Methods di Template

```vue
<template>
  <!-- Menggunakan $can -->
  <button v-if="$can('daftarAlat:create')">
    Tambah Alat
  </button>
  
  <!-- Menggunakan $isAdmin -->
  <div v-if="$isAdmin()">
    <p>Admin Panel</p>
  </div>
  
  <!-- Menggunakan $user -->
  <div v-if="$user()">
    <p>Halo, {{ $user()?.nama }}</p>
  </div>
</template>
```

### 5. Di Composable/Script

```vue
<script setup>
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

const { can } = usePermissions()

// Computed properties untuk permission
const canCreate = computed(() => can('daftarAlat:create'))
const canEdit = computed(() => can('daftarAlat:edit'))
const canDelete = computed(() => can('daftarAlat:delete'))

// Gunakan di function
const handleDelete = () => {
  if (!canDelete.value) {
    Swal.fire('Error', 'Anda tidak memiliki izin untuk menghapus', 'error')
    return
  }
  // Delete logic...
}
</script>
```

---

## 🎯 Contoh Lengkap

### User Management Page

```vue
<script setup>
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

const { can, getUser } = usePermissions()

// Permission checks
const canCreateUser = computed(() => can('user:create'))
const canEditUser = computed(() => can('user:edit'))
const canDeleteUser = computed(() => can('user:delete'))

// Check permission sebelum action
const handleDelete = async (user) => {
  if (!canDeleteUser.value) {
    Swal.fire('Error!', 'Anda tidak memiliki izin untuk hapus user', 'error')
    return
  }
  // Delete logic...
}
</script>

<template>
  <div>
    <!-- Button hanya muncul untuk admin -->
    <button 
      v-if="canCreateUser" 
      @click="openCreateModal"
    >
      Tambah User
    </button>
    
    <!-- Table dengan action buttons -->
    <table>
      <tr v-for="user in users">
        <td>{{ user.nama }}</td>
        <td>
          <!-- Edit button -->
          <button 
            v-if="canEditUser" 
            @click="editUser(user)"
          >
            Edit
          </button>
          
          <!-- Delete button -->
          <button 
            v-if="canDeleteUser" 
            @click="deleteUser(user)"
          >
            Delete
          </button>
        </td>
      </tr>
    </table>
  </div>
</template>
```

---

## 🚀 Menambahkan Permission Baru

1. **Tambahkan di `src/composables/usePermissions.js`**

```javascript
const PERMISSIONS = {
  // ... existing permissions ...
  
  // Permission baru
  'fiturBaru:view': ['admin', 'user'],
  'fiturBaru:create': ['admin'],
  'fiturBaru:edit': ['admin'],
  'fiturBaru:delete': ['admin']
}
```

2. **Gunakan di component**

```vue
<button v-if="$can('fiturBaru:create')">
  Tambah Fitur Baru
</button>
```

---

## 📝 Notes

- User data disimpan di `localStorage` dengan key `current_user`
- Permission check dilakukan di client-side
- Untuk security tambahan, validasi juga di server/API
- Role hierarchy: admin > user > viewer

---

## 📂 File Structure

```
src/
├── composables/
│   ├── usePermissions.js    # Permission logic
│   └── useUsers.js          # User CRUD logic
├── plugins/
│   └── permissions.js       # Vue directive & global methods
├── views/
│   └── users/
│       └── list.vue         # User management page
└── main.js                  # Register permission plugin
```

---

Dibuat untuk **EeHS Board** - PT. AGIS INSTRUMENT SERVICES
