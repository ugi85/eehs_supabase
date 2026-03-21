// src/api/userApi.js
import { useSettingsStore } from '@/stores/settings'

/**
 * User API - Google Apps Script Integration
 * Supports: create, read, update, delete, getUserById, login
 * Uses fetch with no-cors mode for Google Apps Script compatibility
 */
export const userApi = {
  /**
   * GET: Read all users
   */
  async readUsers() {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      const response = await fetch(`${url}?action=read`, {
        method: 'GET',
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Gagal mengambil data user')
      }

      return result
    } catch (error) {
      console.error('[User API] Error readUsers:', error)
      throw error
    }
  },

  /**
   * GET: Read user by ID
   * @param {string} id - User ID (e.g., 'USR001')
   */
  async getUserById(id) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      const response = await fetch(`${url}?action=getUserById&id=${id}`, {
        method: 'GET',
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Gagal mengambil data user')
      }

      return result
    } catch (error) {
      console.error('[User API] Error getUserById:', error)
      throw error
    }
  },

  /**
   * POST: Create new user
   * @param {Object} user - User data { nama, inisial, email, password, role }
   */
  async createUser(user) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      const payload = {
        action: 'create',
        nama: user.nama,
        inisial: user.inisial,
        email: user.email,
        password: user.password,
        role: user.role
      }

      console.log('[User API] Creating user:', payload)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        mode: 'no-cors',
        body: JSON.stringify(payload)
      })

      console.log('[User API] Create response status:', response.status)

      // With no-cors, we can't read the response, so we assume success
      return {
        success: true,
        message: 'User berhasil dibuat',
        user: { id: 'PENDING', ...user }
      }
    } catch (error) {
      console.error('[User API] Error createUser:', error)
      throw error
    }
  },

  /**
   * POST: Update existing user
   * @param {Object} user - User data { id, nama, inisial, email, password?, role }
   */
  async updateUser(user) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      const payload = {
        action: 'update',
        id: user.id,
        nama: user.nama,
        inisial: user.inisial,
        email: user.email,
        role: user.role
      }

      // Only include password if provided (for optional update)
      if (user.password) {
        payload.password = user.password
      }

      console.log('[User API] Updating user:', payload)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        mode: 'no-cors',
        body: JSON.stringify(payload)
      })

      console.log('[User API] Update response status:', response.status)

      // With no-cors, we can't read the response, so we assume success
      return {
        success: true,
        message: 'User berhasil diupdate',
        user: user
      }
    } catch (error) {
      console.error('[User API] Error updateUser:', error)
      throw error
    }
  },

  /**
   * POST: Delete user by ID
   * @param {string} id - User ID to delete
   */
  async deleteUser(id) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      const payload = {
        action: 'delete',
        id: id
      }

      console.log('[User API] Deleting user:', id)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        mode: 'no-cors',
        body: JSON.stringify(payload)
      })

      console.log('[User API] Delete response status:', response.status)

      // With no-cors, we can't read the response, so we assume success
      return {
        success: true,
        message: 'User berhasil dihapus'
      }
    } catch (error) {
      console.error('[User API] Error deleteUser:', error)
      throw error
    }
  },

  /**
   * POST: Login user
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async login(email, password) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      // Gunakan URLSearchParams untuk GAS compatibility
      const body = new URLSearchParams()
      body.append('action', 'login')
      body.append('email', email)
      body.append('password', password)

      console.log('[User API] Login attempt:', { email, password: '***' })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: body
      })

      console.log('[User API] Login response status:', response.status)

      // Try to read response
      const result = await response.json()
      console.log('[User API] Login result:', result)

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Email atau password salah'
        }
      }

      return {
        success: true,
        message: 'Login berhasil',
        user: result.user || null
      }
    } catch (error) {
      console.error('[User API] Error login:', error)
      return {
        success: false,
        message: 'Email atau password salah'
      }
    }
  },

  /**
   * POST: Change password
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(oldPassword, newPassword) {
    const settings = useSettingsStore()
    const url = settings.api.users

    try {
      // Gunakan URLSearchParams untuk GAS compatibility (sama seperti login)
      const body = new URLSearchParams()
      body.append('action', 'changePassword')
      body.append('oldPassword', oldPassword)
      body.append('newPassword', newPassword)

      console.log('[User API] Changing password...', { oldPassword: '***', newPassword: '***' })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: body
      })

      console.log('[User API] Change password response status:', response.status)

      // Read response dari backend
      const result = await response.json()
      console.log('[User API] Change password result:', result)

      if (!result || !result.success) {
        return {
          success: false,
          message: result?.message || 'Gagal mengubah password. Pastikan backend mendukung changePassword.'
        }
      }

      return {
        success: true,
        message: 'Password berhasil diubah'
      }
    } catch (error) {
      console.error('[User API] Error changePassword:', error)
      return {
        success: false,
        message: 'Gagal mengubah password. Error: ' + error.message
      }
    }
  }
}
