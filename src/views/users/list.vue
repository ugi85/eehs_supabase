<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { usePermissions } from '@/composables/usePermissions'
import { userStore } from '@/stores/userStore'

const { users, loading, fetchUsers, createUser, updateUser, deleteUser, isSaving } = useUsers()
const { isLoggedIn, can } = usePermissions()

// Computed untuk permission checks
const canCreateUser = computed(() => can('user:create'))
const canEditUser = computed(() => can('user:edit'))
const canDeleteUser = computed(() => can('user:delete'))
const canViewUser = computed(() => can('user:view'))

// ✅ State untuk bulk delete
const selectedUsers = ref([])
const bulkDeleteMode = ref(false)

// ✅ Toggle bulk delete mode
const toggleBulkDeleteMode = () => {
  bulkDeleteMode.value = !bulkDeleteMode.value
  if (!bulkDeleteMode.value) {
    selectedUsers.value = []
  }
}

// ✅ Check if user is selected
const isUserSelected = (id) => {
  return selectedUsers.value.includes(id)
}

// ✅ Toggle single user selection
const toggleUserSelection = (id) => {
  const index = selectedUsers.value.indexOf(id)
  if (index === -1) {
    selectedUsers.value.push(id)
  } else {
    selectedUsers.value.splice(index, 1)
  }
}

// ✅ Toggle select all
const toggleSelectAll = () => {
  if (selectedUsers.value.length === filteredUsers.value.length) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = filteredUsers.value.map(user => user.id)
  }
}

// ✅ Check if all selected
const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && selectedUsers.value.length === filteredUsers.value.length
})

// ✅ Bulk delete handler
const handleBulkDelete = async () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Peringatan!', 'Pilih minimal 1 user untuk dihapus', 'warning')
    return
  }

  if (!canDeleteUser.value) {
    Swal.fire('Error!', 'Anda tidak memiliki izin untuk hapus user', 'error')
    return
  }

  try {
    const result = await Swal.fire({
      title: 'Hapus User?',
      html: `Yakin hapus <strong>${selectedUsers.value.length}</strong> user?<br><small class="text-muted">Data tidak bisa dikembalikan!</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const deletedCount = selectedUsers.value.length
      
      // Show loading
      Swal.fire({
        title: 'Menghapus...',
        text: 'Sedang menghapus data, mohon tunggu',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Delete sequentially
      for (const id of selectedUsers.value) {
        const user = filteredUsers.value.find(u => u.id === id)
        if (user) {
          await deleteUser(user.id, user.nama)
        }
      }

      // Reset
      selectedUsers.value = []
      bulkDeleteMode.value = false

      // Refresh
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchUsers()

      // Success
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${deletedCount} user berhasil dihapus.`,
        timer: 2000,
        showConfirmButton: false
      })
    }
  } catch (error) {
    console.error('Error saat bulk delete:', error)
    Swal.fire('Error!', error.message || 'Gagal menghapus user', 'error')
  }
}

// Computed untuk cek apakah user adalah superadmin
const isSuperAdmin = computed(() => {
  if (!isLoggedIn.value) return false
  const user = userStore.state.user
  console.log('[Users] isSuperAdmin - User:', user, 'Role:', user?.role)
  // Check role = 'superadmin' OR email starts with 'super@'
  return user && (
    (user.role && user.role.toLowerCase() === 'superadmin') ||
    (user.email && user.email.toLowerCase().startsWith('super@'))
  )
})

// Filter users - sembunyikan superadmin dari non-superadmin
const filteredUsers = computed(() => {
  if (!Array.isArray(users.value)) return []
  
  // Jika superadmin, tampilkan semua
  if (isSuperAdmin.value) {
    console.log('[Users] filteredUsers - Superadmin viewing, showing all', users.value.length, 'users')
    return users.value
  }
  
  // Jika bukan superadmin, filter out superadmin
  const filtered = users.value.filter(u => u.role && u.role.toLowerCase() !== 'superadmin')
  console.log('[Users] filteredUsers - Non-superadmin viewing, showing', filtered.length, 'of', users.value.length, 'users')
  return filtered
})

// Template untuk field form
const getEmptyUser = () => ({
  id: '',
  nama: '',
  inisial: '',
  email: '',
  password: '',
  role: ''
})

// State untuk modal
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingUser = ref(getEmptyUser())

// Function to open login modal
const openLoginModal = () => {
  window.dispatchEvent(new CustomEvent('open-login-modal'))
}

// Computed untuk judul modal
const modalTitle = computed(() =>
  isEditMode.value ? 'Edit User' : 'Tambah User Baru'
)

// Computed untuk text tombol simpan
const saveButtonText = computed(() =>
  isEditMode.value ? 'Simpan Perubahan' : 'Tambah User'
)

// Refresh data
const refresh = () => fetchUsers()

// Buka modal TAMBAH
const openCreateModal = () => {
  if (!canCreateUser.value) {
    Swal.fire('Error!', 'Anda tidak memiliki izin untuk menambah user', 'error')
    return
  }
  editingUser.value = getEmptyUser()
  isEditMode.value = false
  isModalOpen.value = true
}

// Buka modal EDIT
const openEditModal = (user) => {
  if (!canEditUser.value) {
    Swal.fire('Error!', 'Anda tidak memiliki izin untuk edit user', 'error')
    return
  }
  editingUser.value = {
    id: user.id || '',
    nama: user.nama || '',
    inisial: user.inisial || '',
    email: user.email || '',
    password: '', // Reset password untuk edit
    role: user.role || ''
  }
  isEditMode.value = true
  isModalOpen.value = true
}

// Tutup modal
const closeModal = () => {
  isModalOpen.value = false
  editingUser.value = getEmptyUser()
  isEditMode.value = false
}

// Simpan (Create/Update)
const saveEditingUser = async () => {
  try {
    if (isEditMode.value) {
      if (!canEditUser.value) {
        Swal.fire('Error!', 'Anda tidak memiliki izin untuk update user', 'error')
        return
      }
      await updateUser(editingUser.value)
    } else {
      if (!canCreateUser.value) {
        Swal.fire('Error!', 'Anda tidak memiliki izin untuk tambah user', 'error')
        return
      }
      await createUser(editingUser.value)
    }
    closeModal()
  } catch (error) {
    console.error('Gagal menyimpan:', error)
  }
}

// Hapus
const handleDelete = async (user) => {
  if (!canDeleteUser.value) {
    Swal.fire('Error!', 'Anda tidak memiliki izin untuk hapus user', 'error')
    return
  }
  try {
    await deleteUser(user.id, user.nama)
  } catch (error) {
    console.error('Gagal menghapus:', error)
  }
}

// Badge class untuk role
const getRoleBadgeClass = (role) => {
  const classes = {
    admin: 'badge bg-danger',
    user: 'badge bg-primary',
    viewer: 'badge bg-secondary'
  }
  return classes[role] || 'badge bg-info'
}

// Format tanggal
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="content-wrapper">
    <!-- Header dengan Tombol Tambah -->
    <section class="content-header">
      <div class="container-fluid d-flex justify-content-between align-items-start">
        <div>
          <h1 class="mb-0">Manajemen User</h1>
          <small class="text-muted">Kelola akses pengguna sistem</small>
        </div>
        <button v-if="canCreateUser && isLoggedIn" class="btn btn-info" @click="openCreateModal">
          <i class="fas fa-plus mr-1"></i> Tambah User
        </button>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <div class="card">
          <div class="card-body">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-4">
              <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
              <p class="mt-2">Memuat data...</p>
            </div>

            <!-- Not Logged In State -->
            <div v-else-if="!isLoggedIn" class="text-center py-5">
              <i class="fas fa-lock fa-3x text-muted mb-3"></i>
              <h4 class="text-muted mb-3">Silakan Login Terlebih Dahulu</h4>
              <p class="text-muted mb-4">Anda harus login untuk mengakses halaman ini</p>
              <button class="btn btn-primary" @click="openLoginModal">
                <i class="fas fa-sign-in-alt mr-2"></i>
                Login Sekarang
              </button>
            </div>

            <!-- No Permission State -->
            <div v-else-if="!canViewUser" class="text-center py-5">
              <i class="fas fa-lock fa-3x text-muted mb-3"></i>
              <h4 class="text-muted mb-3">Akses Ditolak</h4>
              <p class="text-muted">
                <strong>Manajemen User</strong> hanya dapat diakses oleh <strong>Admin</strong> dan <strong>Super Admin</strong>
              </p>
            </div>

            <!-- Empty State (filtered data) -->
            <div v-else-if="filteredUsers.length === 0" class="text-center py-5">
              <i class="fas fa-users fa-3x text-muted mb-3"></i>
              <h4 class="text-muted mb-3">Tidak Ada Data User</h4>
              <p class="text-muted">
                <span v-if="isSuperAdmin">Belum ada user dalam sistem</span>
                <span v-else>User dengan role Anda tidak tersedia</span>
              </p>
            </div>

            <!-- Data Table State -->
            <div v-else :class="{ 'bulk-delete-active': bulkDeleteMode }">
              <!-- Bulk delete buttons - sejajar dengan DataTables controls -->
              <div class="bulk-delete-wrapper no-print" v-if="isLoggedIn && canDeleteUser">
                <!-- Tombol Hapus Banyak - di tengah -->
                <button
                  class="btn btn-outline-danger btn-sm bulk-delete-toggle-btn"
                  :class="{ 'active': bulkDeleteMode }"
                  @click="toggleBulkDeleteMode"
                  title="Mode hapus banyak"
                >
                  <i class="fas fa-trash-alt mr-1"></i>
                  {{ bulkDeleteMode ? 'Cancel' : 'Delete' }}
                </button>
                <!-- Tombol Hapus X User - di kanan dekat search -->
                <button
                  v-if="bulkDeleteMode && selectedUsers.length > 0"
                  class="btn btn-danger btn-sm bulk-delete-action-btn"
                  @click="handleBulkDelete"
                  title="Hapus user yang dipilih"
                >
                  <i class="fas fa-trash mr-1"></i>Delete {{ selectedUsers.length }} User
                </button>
              </div>
              <table class="table table-bordered table-hover users-table">
                <thead>
                  <tr>
                    <th class="text-center checkbox-column" style="width: 40px;" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @click.stop="toggleSelectAll"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </th>
                    <th class="text-center" style="width: 50px;">No</th>
                    <th>Nama</th>
                    <th>Inisial</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Dibuat</th>
                    <th>Diupdate</th>
                    <th class="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in filteredUsers" :key="user.id">
                    <td class="text-center checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isUserSelected(user.id)"
                        @click.stop="toggleUserSelection(user.id)"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </td>
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ user.nama }}</td>
                    <td>{{ user.inisial }}</td>
                    <td>{{ user.email }}</td>
                    <td>
                      <span :class="getRoleBadgeClass(user.role)">{{ user.role }}</span>
                    </td>
                    <td>{{ formatDate(user.createdAt) }}</td>
                    <td>{{ formatDate(user.updatedAt) }}</td>
                    <td class="text-center">
                      <button
                        v-if="canEditUser"
                        class="btn btn-warning btn-sm mr-1"
                        @click="openEditModal(user)"
                        :disabled="isSaving"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        v-if="canDeleteUser"
                        class="btn btn-danger btn-sm"
                        @click="handleDelete(user)"
                        :disabled="isSaving"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                      <span v-if="!canEditUser && !canDeleteUser" class="text-muted">
                        -
                      </span>
                    </td>
                  </tr>
                  <tr v-if="users.length === 0">
                    <td colspan="7" class="text-center text-muted py-4">
                      <i class="fas fa-inbox fa-2x mb-2"></i>
                      <p>Belum ada data user</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal Create/Edit -->
    <div
      v-if="isModalOpen"
      class="modal fade show"
      tabindex="-1"
      style="display: block; background-color: rgba(0, 0, 0, 0.5);"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalTitle }}</h5>
            <button
              type="button"
              class="close"
              @click="closeModal"
              :disabled="isSaving"
            >
              &times;
            </button>
          </div>
          <div class="modal-body">
            <!-- ID (Readonly untuk edit) -->
            <div v-if="isEditMode && editingUser.id" class="form-group">
              <label>ID User</label>
              <input
                v-model="editingUser.id"
                type="text"
                class="form-control"
                readonly
              />
            </div>

            <!-- Nama -->
            <div class="form-group">
              <label>Nama <span class="text-danger">*</span></label>
              <input
                v-model="editingUser.nama"
                type="text"
                class="form-control"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <!-- Inisial -->
            <div class="form-group">
              <label>Inisial <span class="text-danger">*</span></label>
              <input
                v-model="editingUser.inisial"
                type="text"
                class="form-control"
                placeholder="Contoh: JD"
                maxlength="10"
                required
              />
            </div>

            <!-- Email -->
            <div class="form-group">
              <label>Email <span class="text-danger">*</span></label>
              <input
                v-model="editingUser.email"
                type="email"
                class="form-control"
                placeholder="email@example.com"
                required
              />
            </div>

            <!-- Password -->
            <div class="form-group">
              <label>
                Password
                <span class="text-danger">*</span>
                <span v-if="isEditMode" class="text-muted small">
                  (kosongkan jika tidak diubah)
                </span>
              </label>
              <input
                v-model="editingUser.password"
                type="password"
                class="form-control"
                :required="!isEditMode"
                :placeholder="isEditMode ? 'Kosongkan jika tidak diubah' : 'Masukkan password'"
              />
            </div>

            <!-- Role -->
            <div class="form-group">
              <label>Role <span class="text-danger">*</span></label>
              <select
                v-model="editingUser.role"
                class="form-control"
                required
              >
                <option value="">Pilih Role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModal"
              :disabled="isSaving"
            >
              Batal
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveEditingUser"
              :disabled="isSaving"
            >
              <span v-if="isSaving">
                <span class="spinner-border spinner-border-sm mr-1"></span>
                Menyimpan...
              </span>
              <span v-else>
                {{ saveButtonText }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ✅ Bulk delete controls styling */
.bulk-delete-wrapper {
  position: relative;
  height: 0;
  z-index: 10;
}

/* Tombol Hapus Banyak - di tengah */
.bulk-delete-toggle-btn {
  position: absolute;
  left: 20%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* Tombol Hapus X User - di kanan dekat search box */
.bulk-delete-action-btn {
  position: absolute;
  right: 220px;
  top: 0;
  white-space: nowrap;
}

/* ✅ Checkbox column styling */
.checkbox-column {
  width: 0;
  min-width: 0;
  max-width: 0;
  padding: 0 !important;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Tampilkan kolom saat bulk delete mode aktif */
.bulk-delete-active .checkbox-column {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 0.5rem !important;
}

.checkbox-column input[type="checkbox"] {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
  position: relative;
  z-index: 1;
  pointer-events: none !important;
}

/* Tampilkan checkbox saat bulk delete mode aktif */
.bulk-delete-active .checkbox-column input[type="checkbox"] {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.cursor-pointer {
  cursor: pointer;
}

/* Header styling */
.users-table thead th {
  vertical-align: middle;
  font-weight: 600;
  background-color: #f2f7fc;
}

.users-table th,
.users-table td {
  white-space: nowrap;
  padding: 0.5rem;
}

.users-table .text-center {
  text-align: center;
}

.users-table code {
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}

.users-table .badge {
  padding: 0.35em 0.65em;
  font-size: 0.75em;
  font-weight: 600;
}

/* Modal scrollable styling */
.modal-dialog {
  max-height: calc(100vh - 2rem);
  display: flex;
}

.modal-content {
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
}

.modal-body {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 10px;
  }

  .users-table {
    font-size: 0.8rem;
  }

  .users-table th,
  .users-table td {
    padding: 0.4rem;
  }
}
</style>
