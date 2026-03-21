// src/services/permissionService.js

const PERMISSIONS_STORAGE_KEY = 'user_permissions_map'

// Default permissions untuk setiap role
const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    // Dashboard & Monitoring
    'dashboard:view', 'dashboard:edit', 'charts:view',
    // Daftar Alat
    'daftarAlat:view', 'daftarAlat:create', 'daftarAlat:edit', 'daftarAlat:delete',
    // Jadwal Kalibrasi
    'jadwalKalibrasi:view', 'jadwalKalibrasi:create', 'jadwalKalibrasi:edit', 'jadwalKalibrasi:delete',
    // Log Aktivitas
    'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit', 'logAktivitas:delete',
    // User Management
    'user:view', 'user:create', 'user:edit', 'user:delete',
    // Konfigurasi Sistem
    'config:view', 'config:edit',
    // Reports & Print
    'report:view', 'report:print', 'report:export'
  ],
  user: [
    'dashboard:view', 'dashboard:edit', 'charts:view',
    'daftarAlat:view',
    'jadwalKalibrasi:view',
    'logAktivitas:view', 'logAktivitas:create', 'logAktivitas:edit',
    'report:view', 'report:print', 'report:export'
  ],
  viewer: [
    'dashboard:view', 'charts:view',
    'daftarAlat:view',
    'jadwalKalibrasi:view',
    'logAktivitas:view',
    'report:view'
  ]
}

/**
 * Get permissions untuk user tertentu
 */
export const getUserPermissions = (userId, userRole) => {
  console.log('[PermissionService] getUserPermissions - User ID:', userId, '| Role:', userRole)
  
  const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
  console.log('[PermissionService] getUserPermissions - Raw stored data:', stored)
  
  if (stored) {
    try {
      const permissionsMap = JSON.parse(stored)
      console.log('[PermissionService] getUserPermissions - Parsed map:', permissionsMap)
      
      // Jika ada custom permissions untuk user ini
      if (permissionsMap && permissionsMap[userId]) {
        const customPerms = permissionsMap[userId]
        console.log('[PermissionService] getUserPermissions - ✅ CUSTOM permissions for', userId, ':', customPerms)
        return customPerms
      } else {
        console.log('[PermissionService] getUserPermissions - No custom permissions for', userId)
      }
    } catch (e) {
      console.error('[PermissionService] getUserPermissions - Error parsing:', e)
    }
  }
  
  // Return default permissions berdasarkan role
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userRole] || []
  console.log('[PermissionService] getUserPermissions - ⚠️ DEFAULT permissions for', userRole, ':', defaultPerms)
  return defaultPerms
}

/**
 * Set custom permissions untuk user tertentu
 */
export const setUserPermissions = (userId, permissions) => {
  console.log('[PermissionService] setUserPermissions - User ID:', userId, '| Permissions:', permissions)
  
  const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
  let permissionsMap = {}
  
  if (stored) {
    try {
      permissionsMap = JSON.parse(stored)
      console.log('[PermissionService] setUserPermissions - Existing map:', permissionsMap)
    } catch (e) {
      console.error('[PermissionService] setUserPermissions - Error parsing existing:', e)
      permissionsMap = {}
    }
  }
  
  // Set permissions untuk user ini
  permissionsMap[userId] = permissions
  console.log('[PermissionService] setUserPermissions - New map:', permissionsMap)
  
  // Simpan ke localStorage
  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionsMap))
  
  // Verify immediately
  const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
  console.log('[PermissionService] setUserPermissions - Saved to storage:', saved)
  
  if (saved) {
    try {
      const verify = JSON.parse(saved)
      console.log('[PermissionService] setUserPermissions - ✅ Verified saved for', userId, ':', verify[userId])
    } catch (e) {
      console.error('[PermissionService] setUserPermissions - Error verifying:', e)
    }
  }
}

/**
 * Remove custom permissions untuk user
 */
export const removeUserPermissions = (userId) => {
  console.log('[PermissionService] removeUserPermissions - User ID:', userId)
  
  const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
  if (stored) {
    try {
      const permissionsMap = JSON.parse(stored)
      if (permissionsMap[userId]) {
        console.log('[PermissionService] removeUserPermissions - Removing permissions for', userId)
        delete permissionsMap[userId]
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionsMap))
        console.log('[PermissionService] removeUserPermissions - Done')
      } else {
        console.log('[PermissionService] removeUserPermissions - No permissions found for', userId)
      }
    } catch (e) {
      console.error('[PermissionService] removeUserPermissions - Error:', e)
    }
  } else {
    console.log('[PermissionService] removeUserPermissions - No stored permissions')
  }
}

/**
 * Get all stored permissions
 */
export const getAllPermissions = () => {
  const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('[PermissionService] getAllPermissions - Error:', e)
    }
  }
  return {}
}

/**
 * Clear all custom permissions
 */
export const clearAllPermissions = () => {
  console.log('[PermissionService] clearAllPermissions')
  localStorage.removeItem(PERMISSIONS_STORAGE_KEY)
}

/**
 * Get default permissions untuk role
 */
export const getDefaultPermissionsForRole = (role) => {
  return DEFAULT_ROLE_PERMISSIONS[role] || []
}

export default {
  getUserPermissions,
  setUserPermissions,
  removeUserPermissions,
  getAllPermissions,
  clearAllPermissions,
  getDefaultPermissionsForRole
}
