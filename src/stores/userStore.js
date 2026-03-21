// src/stores/userStore.js
import { reactive, readonly } from 'vue'
import permissionService from '@/services/permissionService'
import idleTimerService from '@/services/idleTimerService'

const USER_STORAGE_KEY = 'current_user'
const SESSION_STORAGE_KEY = 'session_timestamp'
const PERMISSIONS_CHANGED_EVENT = 'permissions-changed'
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8 jam dalam milliseconds

// Singleton store dengan reactive state
const state = reactive({
  user: null,
  permissions: []
})

/**
 * Load permissions dari storage untuk user tertentu
 */
const loadPermissionsForUser = (user, forceRefresh = false) => {
  if (!user || !user.id) {
    console.warn('[userStore] loadPermissionsForUser - No user ID')
    return []
  }

  const permissions = permissionService.getUserPermissions(user.id, user.role)
  console.log('[userStore] loadPermissionsForUser - User:', user.nama, '| Role:', user.role, '| Permissions:', permissions)
  return permissions
}

/**
 * Set user yang sedang login
 */
const setUser = (user) => {
  console.log('[userStore] setUser - Setting user:', user)

  state.user = user
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  
  // Simpan timestamp session saat login
  const sessionTimestamp = Date.now()
  localStorage.setItem(SESSION_STORAGE_KEY, sessionTimestamp.toString())

  // Load permissions untuk user ini
  if (user && user.id) {
    state.permissions = loadPermissionsForUser(user)
    console.log('[userStore] setUser - Loaded permissions:', state.permissions)
  } else {
    state.permissions = []
    console.warn('[userStore] setUser - No user ID, permissions set to empty')
  }

  // Start idle timer saat login
  idleTimerService.startIdleTimer()

  console.log('[userStore] setUser - Final state:', { user: state.user, permissions: state.permissions })
}

/**
 * Get user yang sedang login
 */
const getUser = () => {
  return state.user
}

/**
 * Check apakah session sudah expired
 */
const isSessionExpired = () => {
  const sessionTimestamp = localStorage.getItem(SESSION_STORAGE_KEY)
  
  if (!sessionTimestamp) {
    console.log('[userStore] isSessionExpired - No session timestamp, consider expired')
    return true
  }
  
  const now = Date.now()
  const elapsed = now - parseInt(sessionTimestamp)
  const expired = elapsed > SESSION_TIMEOUT
  
  console.log('[userStore] isSessionExpired - Elapsed:', Math.floor(elapsed / 60000), 'min', '| Timeout:', Math.floor(SESSION_TIMEOUT / 60000), 'min', '| Expired:', expired)
  
  return expired
}

/**
 * Clear session data (logout tanpa redirect)
 */
const clearSessionData = () => {
  console.log('[userStore] clearSessionData - Clearing session data')
  
  // Stop idle timer
  idleTimerService.stopIdleTimer()
  
  // Clear state
  state.user = null
  state.permissions = []
  
  // Clear localStorage
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(SESSION_STORAGE_KEY)
  
  console.log('[userStore] clearSessionData - Done')
}

/**
 * Load user dari localStorage saat aplikasi start
 */
const loadUser = () => {
  const stored = localStorage.getItem(USER_STORAGE_KEY)
  console.log('[userStore] loadUser - Stored user:', stored)

  if (stored) {
    try {
      // Check session expiry
      if (isSessionExpired()) {
        console.log('[userStore] loadUser - Session expired, clearing user')
        clearSessionData()
        
        // Show notification
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'info',
            title: 'Session Expired',
            text: 'Sesi login Anda telah berakhir. Silakan login kembali.',
            timer: 2000,
            showConfirmButton: false
          })
        }
        return
      }
      
      state.user = JSON.parse(stored)
      // Load permissions untuk user ini
      if (state.user && state.user.id) {
        state.permissions = loadPermissionsForUser(state.user)
        // Start idle timer jika user sudah login
        idleTimerService.startIdleTimer()
      }
      console.log('[userStore] loadUser - Final state:', { user: state.user, permissions: state.permissions })
    } catch (e) {
      console.error('[userStore] loadUser - Error:', e)
      clearSessionData()
    }
  } else {
    console.log('[userStore] loadUser - No stored user')
  }
}

/**
 * REFRESH permissions untuk user yang sedang login
 * Dipanggil saat ada perubahan permission dari Roles page
 */
const refreshPermissions = () => {
  if (state.user && state.user.id) {
    const newPermissions = loadPermissionsForUser(state.user, true)
    state.permissions = newPermissions
    console.log('[userStore] refreshPermissions - User:', state.user.nama, '| New permissions:', newPermissions)
    
    // Dispatch event untuk notify komponen lain
    window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT, {
      detail: { userId: state.user.id, permissions: newPermissions }
    }))
    
    return newPermissions
  }
  return []
}

/**
 * Clear user (logout)
 */
const clearUser = () => {
  console.log('[userStore] clearUser - Clearing user')
  clearSessionData()
  console.log('[userStore] clearUser - Done')
}

/**
 * Logout dengan redirect
 */
const logout = () => {
  clearUser()

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Logout Berhasil',
      text: 'Anda telah keluar dari sistem',
      timer: 1500,
      showConfirmButton: false
    }).then(() => {
      window.location.href = '/dashChart'
    })
  } else {
    window.location.href = '/dashChart'
  }
}

/**
 * Update permissions untuk user yang sedang login
 */
const updateUserPermissions = (permissions) => {
  if (state.user && state.user.id) {
    state.permissions = permissions
    permissionService.setUserPermissions(state.user.id, permissions)
    console.log('[userStore] updateUserPermissions - User:', state.user.nama, '| New permissions:', permissions)
    
    // Dispatch event untuk notify komponen lain
    window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT, {
      detail: { userId: state.user.id, permissions: permissions }
    }))
  } else {
    console.warn('[userStore] updateUserPermissions - No user to update')
  }
}

// Load user on initialization
loadUser()

// Listen untuk storage changes (dari tab lain)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PERMISSIONS_CHANGED_EVENT && state.user) {
      console.log('[userStore] Storage event detected - refreshing permissions')
      refreshPermissions()
    }
  })
  
  // Listen untuk custom event (dari tab yang sama)
  window.addEventListener(PERMISSIONS_CHANGED_EVENT, (event) => {
    if (state.user && event.detail.userId === state.user.id) {
      console.log('[userStore] Permission change event detected - refreshing')
      state.permissions = event.detail.permissions || []
    }
  })
}

export const userStore = {
  state: readonly(state),
  setUser,
  getUser,
  loadUser,
  clearUser,
  logout,
  updateUserPermissions,
  refreshPermissions,
  isSessionExpired,
  clearSessionData
}
