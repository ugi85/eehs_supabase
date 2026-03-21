// src/composables/usePermissions.js
import { userStore } from '@/stores/userStore'
import { computed } from 'vue'

// Default permissions untuk setiap role
const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: [
    // Full access ke semua fitur
    'dashboard:view', 'dashboard:edit', 'charts:view',
    'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit', 'daftarAlat:delete',
    'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit', 'jadwalKalibrasi:delete',
    'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit', 'logAktivitas:delete',
    'user:view', 'user:create', 'user:edit', 'user:delete',
    'config:view', 'config:edit',
    'report:view', 'report:print', 'report:export',
    'roles:view', 'roles:edit'
  ],
  admin: [
    'dashboard:view', 'dashboard:edit', 'charts:view',
    'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit', 'daftarAlat:delete',
    'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit', 'jadwalKalibrasi:delete',
    'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit', 'logAktivitas:delete',
    'user:view', 'user:create', 'user:edit', 'user:delete',
    'config:view', 'config:edit',
    'report:view', 'report:print', 'report:export'
  ],
  user: [
    'dashboard:view', 'dashboard:edit', 'charts:view',
    'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit',
    'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit',
    'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit',
    'report:view', 'report:print', 'report:export'
  ]
}

// Permissions untuk PUBLIC (tanpa login) - hanya view
const PUBLIC_PERMISSIONS = [
  'dashboard:view',
  'charts:view',
  'daftarAlat:view',
  'jadwalKalibrasi:view',
  'logAktivitas:view'
]

// Role hierarchy - superadmin > admin > user
const ROLE_HIERARCHY = {
  superadmin: ['superadmin', 'admin', 'user'],
  admin: ['admin', 'user'],
  user: ['user']
}

export function usePermissions() {
  // Computed untuk user yang sedang login
  const user = computed(() => userStore.state.user)
  
  // Computed untuk permissions user
  const permissions = computed(() => userStore.state.permissions || [])
  
  // Computed untuk cek apakah user sudah login
  const isLoggedIn = computed(() => !!userStore.state.user)

  /**
   * Cek apakah user punya permission tertentu
   * PUBLIC bisa akses view permissions, LOGIN bisa akses semua sesuai role
   */
  const can = (permission) => {
    // Jika TIDAK login, cek apakah ini public permission (view only)
    if (!userStore.state.user) {
      const isPublicPermission = PUBLIC_PERMISSIONS.includes(permission)
      console.log('[usePermissions] can("' + permission + '") - PUBLIC:', isPublicPermission)
      return isPublicPermission
    }

    // Jika LOGIN dan ada custom permissions, gunakan itu
    if (userStore.state.permissions && userStore.state.permissions.length > 0) {
      const hasPermission = userStore.state.permissions.includes(permission)
      console.log('[usePermissions] can("' + permission + '") - CUSTOM:', hasPermission)
      return hasPermission
    }

    // Jika LOGIN tapi tidak ada custom permissions, gunakan role-based
    const userRole = userStore.state.user.role
    
    // Cek role hierarchy - jika role lebih tinggi, otomatis dapat permission
    const allowedRoles = ROLE_HIERARCHY[userRole] || [userRole]
    
    // Cek di DEFAULT_ROLE_PERMISSIONS untuk setiap role yang diizinkan
    for (const role of allowedRoles) {
      const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || []
      if (rolePermissions.includes(permission)) {
        console.log('[usePermissions] can("' + permission + '") - ROLE (' + userRole + ' → ' + role + '): true')
        return true
      }
    }
    
    console.log('[usePermissions] can("' + permission + '") - ROLE (' + userRole + '): false')
    return false
  }

  /**
   * Get semua permissions user
   */
  const getPermissions = () => {
    return userStore.state.permissions || []
  }

  return {
    // Computed properties (reactive)
    user,
    permissions,
    isLoggedIn,
    
    // Methods
    can,
    getPermissions,
    setUser: userStore.setUser,
    logout: userStore.logout
  }
}
