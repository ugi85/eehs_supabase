<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { usePermissions } from '@/composables/usePermissions'
import { userStore } from '@/stores/userStore'
import permissionService from '@/services/permissionService'

const { users, loading: usersLoading, fetchUsers } = useUsers()
const permission = usePermissions()

// State untuk role yang dipilih
const selectedUser = ref(null)
const selectedRole = ref('')
const isSaving = ref(false)

// Permission groups
const permissionGroups = ref([
  {
    name: 'Dashboard & Monitoring',
    icon: 'fas fa-tachometer-alt',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard' },
      { key: 'dashboard:edit', label: 'Edit Dashboard' },
      { key: 'charts:view', label: 'View Charts' }
    ]
  },
  {
    name: 'Daftar Alat',
    icon: 'fas fa-tools',
    permissions: [
      { key: 'daftarAlat:view', label: 'View Daftar Alat' },
      { key: 'daftarAlat:create', label: 'Create Alat' },
      { key: 'daftarAlat:edit', label: 'Edit Alat' },
      { key: 'daftarAlat:delete', label: 'Delete Alat' }
    ]
  },
  {
    name: 'Jadwal Kalibrasi',
    icon: 'fas fa-calendar-alt',
    permissions: [
      { key: 'jadwalKalibrasi:view', label: 'View Jadwal' },
      { key: 'jadwalKalibrasi:create', label: 'Create Jadwal' },
      { key: 'jadwalKalibrasi:edit', label: 'Edit Jadwal' },
      { key: 'jadwalKalibrasi:delete', label: 'Delete Jadwal' }
    ]
  },
  {
    name: 'Log Aktivitas',
    icon: 'fas fa-history',
    permissions: [
      { key: 'logAktivitas:view', label: 'View Log' },
      { key: 'logAktivitas:create', label: 'Create Log' },
      { key: 'logAktivitas:edit', label: 'Edit Log' },
      { key: 'logAktivitas:delete', label: 'Delete Log' }
    ]
  },
  {
    name: 'User Management',
    icon: 'fas fa-users',
    permissions: [
      { key: 'user:view', label: 'View Users' },
      { key: 'user:create', label: 'Create User' },
      { key: 'user:edit', label: 'Edit User' },
      { key: 'user:delete', label: 'Delete User' }
    ]
  },
  {
    name: 'Konfigurasi Sistem',
    icon: 'fas fa-cogs',
    permissions: [
      { key: 'config:view', label: 'View Config' },
      { key: 'config:edit', label: 'Edit Config' }
    ]
  },
  {
    name: 'Reports & Print',
    icon: 'fas fa-file-alt',
    permissions: [
      { key: 'report:view', label: 'View Reports' },
      { key: 'report:print', label: 'Print Reports' },
      { key: 'report:export', label: 'Export Reports' }
    ]
  }
])

// Role templates
const roleTemplates = {
  superadmin: {
    name: 'Super Admin',
    description: 'Akses penuh ke SEMUA fitur termasuk Roles',
    color: 'danger',
    permissions: Object.values(permissionGroups.value).flatMap(g => g.permissions.map(p => p.key))
  },
  admin: {
    name: 'Admin',
    description: 'Akses penuh ke semua fitur kecuali Roles',
    color: 'primary',
    permissions: [
      'dashboard:view', 'dashboard:edit', 'charts:view',
      'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit', 'daftarAlat:delete',
      'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit', 'jadwalKalibrasi:delete',
      'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit', 'logAktivitas:delete',
      'user:view', 'user:create', 'user:edit', 'user:delete',
      'config:view', 'config:edit',
      'report:view', 'report:print', 'report:export'
    ]
  },
  user: {
    name: 'User',
    description: 'Akses untuk operasional harian (tanpa delete)',
    color: 'info',
    permissions: [
      'dashboard:view', 'dashboard:edit', 'charts:view',
      'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit',
      'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit',
      'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit',
      'report:view', 'report:print', 'report:export'
    ]
  }
}

// User permissions state
const userPermissions = ref({})
const unsavedChanges = ref(false)

// Computed
const canEditRoles = computed(() => permission.can('user:edit') || permission.can('config:edit'))
const isLoggedIn = computed(() => permission.isLoggedIn.value)

// Watch for changes
const markUnsavedChanges = () => {
  unsavedChanges.value = true
}

// Select user
const selectUser = (user) => {
  selectedUser.value = user
  selectedRole.value = user.role || ''
  
  // Load user permissions
  loadUserPermissions(user)
}

// Load user permissions
const loadUserPermissions = (user) => {
  // Get custom permissions dari storage
  const customPermissions = permissionService.getUserPermissions(user.id, user.role)
  
  if (customPermissions && customPermissions.length > 0) {
    // User punya custom permissions
    userPermissions.value = {}
    customPermissions.forEach(key => {
      userPermissions.value[key] = true
    })
  } else {
    // Gunakan default permissions dari role template
    const template = roleTemplates[user.role]
    if (template) {
      userPermissions.value = {}
      template.permissions.forEach(key => {
        userPermissions.value[key] = true
      })
    } else {
      userPermissions.value = {}
    }
  }
  unsavedChanges.value = false
}

// Toggle permission
const togglePermission = (permissionKey) => {
  userPermissions.value[permissionKey] = !userPermissions.value[permissionKey]
  markUnsavedChanges()
}

// Toggle group
const toggleGroup = (group, checked) => {
  group.permissions.forEach(perm => {
    userPermissions.value[perm.key] = checked
  })
  markUnsavedChanges()
}

// Check if group is fully selected
const isGroupSelected = (group) => {
  return group.permissions.every(perm => userPermissions.value[perm.key])
}

// Check if group is partially selected
const isGroupPartial = (group) => {
  const selected = group.permissions.filter(perm => userPermissions.value[perm.key])
  return selected.length > 0 && selected.length < group.permissions.length
}

// Select role template
const selectRoleTemplate = (roleKey) => {
  selectedRole.value = roleKey
  const template = roleTemplates[roleKey]
  if (template) {
    userPermissions.value = {}
    template.permissions.forEach(key => {
      userPermissions.value[key] = true
    })
  }
  markUnsavedChanges()
}

// Select all permissions
const selectAll = () => {
  permissionGroups.value.forEach(group => {
    group.permissions.forEach(perm => {
      userPermissions.value[perm.key] = true
    })
  })
  markUnsavedChanges()
}

// Deselect all permissions
const deselectAll = () => {
  permissionGroups.value.forEach(group => {
    group.permissions.forEach(perm => {
      userPermissions.value[perm.key] = false
    })
  })
  markUnsavedChanges()
}

// Save permissions
const savePermissions = async () => {
  if (!selectedUser.value) return

  isSaving.value = true

  try {
    // Get selected permissions
    const selectedPermissions = Object.entries(userPermissions.value)
      .filter(([_, value]) => value)
      .map(([key]) => key)

    const userId = selectedUser.value.id
    const userName = selectedUser.value.nama

    console.log('[Roles] ========================================')
    console.log('[Roles] Saving permissions for user:', userName, 'ID:', userId)
    console.log('[Roles] Permissions to save:', selectedPermissions)

    // Save menggunakan permissionService
    permissionService.setUserPermissions(userId, selectedPermissions)

    // Verify saved permissions
    const savedPerms = permissionService.getUserPermissions(userId, selectedUser.value.role)
    console.log('[Roles] ✅ Verified saved permissions:', savedPerms)
    console.log('[Roles] ========================================')

    // Update user role jika berubah
    if (selectedUser.value.role !== selectedRole.value) {
      selectedUser.value.role = selectedRole.value
    }

    // Update current user permissions jika ini user yang sedang login
    if (userStore.state.user && userStore.state.user.id === userId) {
      userStore.updateUserPermissions(selectedPermissions)
      console.log('[Roles] ✅ Updated CURRENT USER permissions')
    } else {
      console.log('[Roles] ⚠️ User', userName, 'is not currently logged in')
      console.log('[Roles] ℹ️ Notifying all tabs to refresh permissions...')
      
      // Trigger refresh untuk semua tab yang sedang membuka aplikasi
      window.dispatchEvent(new CustomEvent('permissions-changed', {
        detail: { userId: userId, permissions: selectedPermissions }
      }))
      
      // Juga trigger storage event untuk cross-tab sync
      localStorage.setItem('permissions-changed', JSON.stringify({
        userId: userId,
        permissions: selectedPermissions,
        timestamp: Date.now()
      }))
    }

    // Show success
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      html: `
        <p>Permission untuk <strong>${userName}</strong> telah disimpan.</p>
        <p class="text-muted small mt-2">
          <i class="fas fa-info-circle mr-1"></i>
          Total: ${selectedPermissions.length} permissions<br>
          ${userStore.state.user?.id === userId ? '<span class="text-success">✅ User sedang login, perubahan LANGSUNG berlaku!</span>' : '<span class="text-info">🔄 Perubahan akan sinkron otomatis ke semua tab yang terbuka.</span>'}
        </p>
      `,
      timer: 3000,
      showConfirmButton: false
    })

    unsavedChanges.value = false
  } catch (error) {
    console.error('Error saving permissions:', error)
    Swal.fire('Error!', 'Gagal menyimpan permission', 'error')
  } finally {
    isSaving.value = false
  }
}

// Get badge class for role
const getRoleBadgeClass = (role) => {
  const classes = {
    superadmin: 'badge bg-danger',
    admin: 'badge bg-primary',
    user: 'badge bg-info'
  }
  return classes[role] || 'badge bg-secondary'
}

// Get selected permissions count
const getSelectedPermissionsCount = () => {
  return Object.values(userPermissions.value).filter(v => v).length
}

// Get total permissions count
const getTotalPermissionsCount = () => {
  return permissionGroups.value.reduce((acc, group) => acc + group.permissions.length, 0)
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="content-wrapper">
    <!-- Header -->
    <section class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1><i class="fas fa-user-shield mr-2"></i>Roles & Permissions</h1>
            <small class="text-muted">Kelola hak akses pengguna berdasarkan role dan permission</small>
          </div>
          <div class="col-sm-6">
            <ol class="breadcrumb float-sm-right">
              <li class="breadcrumb-item"><a href="/dashChart">Home</a></li>
              <li class="breadcrumb-item active">Roles & Permissions</li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <div class="row">
          <!-- Left Column: User List -->
          <div class="col-md-4">
            <div class="card card-primary card-outline">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-users mr-2"></i>Daftar User
                </h3>
              </div>
              <div class="card-body p-0">
                <div v-if="usersLoading" class="text-center py-4">
                  <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                  <p class="mt-2">Memuat data...</p>
                </div>
                <div v-else-if="!isLoggedIn" class="text-center py-4">
                  <i class="fas fa-lock fa-2x text-muted"></i>
                  <p class="text-muted mt-2">Silakan login terlebih dahulu</p>
                </div>
                <ul v-else class="nav nav-pills flex-column">
                  <li
                    v-for="user in users"
                    :key="user.id"
                    class="nav-item"
                  >
                    <a
                      href="#"
                      class="nav-link"
                      :class="{ active: selectedUser?.id === user.id }"
                      @click.prevent="selectUser(user)"
                    >
                      <div class="d-flex justify-content-between align-items-center">
                        <div>
                          <i class="fas fa-user-circle mr-2"></i>
                          {{ user.nama }}
                          <br>
                          <small class="text-muted">{{ user.email }}</small>
                        </div>
                        <span :class="getRoleBadgeClass(user.role)">
                          {{ user.role }}
                        </span>
                      </div>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Role Templates Card -->
            <div class="card card-secondary">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-tag mr-2"></i>Role Templates
                </h3>
              </div>
              <div class="card-body">
                <div class="mb-3" v-for="(template, key) in roleTemplates" :key="key">
                  <button
                    class="btn btn-block"
                    :class="`btn-outline-${template.color} ${selectedRole === key ? 'active' : ''}`"
                    @click="selectRoleTemplate(key)"
                  >
                    <div class="d-flex justify-content-between align-items-center">
                      <div class="text-left">
                        <strong>{{ template.name }}</strong>
                        <br>
                        <small>{{ template.description }}</small>
                      </div>
                      <span class="badge" :class="`bg-${template.color}`">
                        {{ template.permissions.length }} permissions
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Permissions -->
          <div class="col-md-8">
            <div class="card card-primary">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-key mr-2"></i>Permission Settings
                </h3>
                <div class="card-tools">
                  <span v-if="selectedUser" class="badge bg-info mr-2">
                    {{ getSelectedPermissionsCount() }} / {{ getTotalPermissionsCount() }} selected
                  </span>
                  <button
                    v-if="unsavedChanges"
                    class="btn btn-warning btn-sm"
                    @click="savePermissions"
                    :disabled="isSaving"
                  >
                    <i class="fas fa-save mr-1"></i>
                    Save Changes
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div v-if="!selectedUser" class="text-center py-5">
                  <i class="fas fa-user-edit fa-3x text-muted mb-3"></i>
                  <h5 class="text-muted">Pilih user untuk mengatur permission</h5>
                  <p class="text-muted">Klik pada nama user di sebelah kiri untuk mulai mengatur permission</p>
                </div>

                <div v-else>
                  <!-- User Info -->
                  <div class="alert alert-info mb-4">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <i class="fas fa-user-circle mr-2"></i>
                        <strong>{{ selectedUser.nama }}</strong>
                        <br>
                        <small>{{ selectedUser.email }}</small>
                      </div>
                      <div>
                        <span :class="getRoleBadgeClass(selectedUser.role)">
                          {{ selectedUser.role }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Quick Actions -->
                  <div class="mb-3">
                    <button class="btn btn-sm btn-success" @click="selectAll">
                      <i class="fas fa-check-square mr-1"></i> Select All
                    </button>
                    <button class="btn btn-sm btn-danger" @click="deselectAll">
                      <i class="fas fa-times-square mr-1"></i> Deselect All
                    </button>
                  </div>

                  <!-- Permission Groups -->
                  <div
                    v-for="group in permissionGroups"
                    :key="group.name"
                    class="card card-default mb-3"
                  >
                    <div class="card-header">
                      <div class="d-flex justify-content-between align-items-center">
                        <div>
                          <i :class="group.icon + ' mr-2'"></i>
                          <strong>{{ group.name }}</strong>
                        </div>
                        <div class="form-check">
                          <input
                            type="checkbox"
                            class="form-check-input"
                            :checked="isGroupSelected(group)"
                            :indeterminate.prop="isGroupPartial(group)"
                            @change="toggleGroup(group, $event.target.checked)"
                          />
                          <label class="form-check-label text-muted small">
                            {{ isGroupSelected(group) ? 'All Selected' : isGroupPartial(group) ? 'Partial' : 'None' }}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div
                          v-for="permission in group.permissions"
                          :key="permission.key"
                          class="col-md-6 mb-2"
                        >
                          <div class="form-check">
                            <input
                              type="checkbox"
                              class="form-check-input"
                              :id="permission.key"
                              :checked="userPermissions[permission.key]"
                              @change="togglePermission(permission.key)"
                            />
                            <label class="form-check-label" :for="permission.key">
                              {{ permission.label }}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="selectedUser" class="card-footer">
                <button
                  class="btn btn-primary"
                  @click="savePermissions"
                  :disabled="isSaving || !unsavedChanges"
                >
                  <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
                  <i v-else class="fas fa-save mr-2"></i>
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button
                  v-if="unsavedChanges"
                  class="btn btn-secondary ml-2"
                  @click="loadUserPermissions(selectedUser)"
                >
                  <i class="fas fa-undo mr-2"></i>
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.nav-pills .nav-link {
  border-radius: 0;
  border-left: 3px solid transparent;
  transition: all 0.3s;
}

.nav-pills .nav-link.active {
  border-left-color: #007bff;
  background-color: #f8f9fa;
  color: #007bff;
}

.nav-pills .nav-link:hover:not(.active) {
  background-color: #f8f9fa;
  border-left-color: #6c757d;
}

.card {
  transition: all 0.3s;
}

.form-check-input:checked {
  background-color: #007bff;
  border-color: #007bff;
}

/* Custom indeterminate checkbox color */
.form-check-input:indeterminate {
  background-color: #007bff;
  border-color: #007bff;
}
</style>
