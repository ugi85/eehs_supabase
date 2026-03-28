// src/services/permissionService.js
// Permissions diambil dari DB via userApi, bukan dari localStorage
// localStorage hanya digunakan sebagai cache sementara per session

import { supabase } from '@/config/supabase'

// Default permissions per role — fallback jika DB tidak punya data custom
const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: [
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

// In-memory cache per session (bukan localStorage — tidak bisa dimanipulasi user)
const sessionPermissionsCache = new Map()

/**
 * Get permissions untuk user — dari cache session atau default role
 * Custom permissions dari DB di-load saat login via userStore.setUser()
 */
export const getUserPermissions = (userId, userRole) => {
  // Cek in-memory cache dulu
  if (sessionPermissionsCache.has(userId)) {
    return sessionPermissionsCache.get(userId)
  }
  // Fallback ke default role permissions
  return DEFAULT_ROLE_PERMISSIONS[userRole] || []
}

/**
 * Set permissions ke in-memory cache (dipanggil saat login atau update dari DB)
 */
export const setUserPermissions = (userId, permissions) => {
  sessionPermissionsCache.set(userId, permissions)
}

/**
 * Remove permissions dari cache (dipanggil saat logout)
 */
export const removeUserPermissions = (userId) => {
  sessionPermissionsCache.delete(userId)
}

/**
 * Clear semua cache (dipanggil saat logout)
 */
export const clearAllPermissions = () => {
  sessionPermissionsCache.clear()
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
  clearAllPermissions,
  getDefaultPermissionsForRole
}
