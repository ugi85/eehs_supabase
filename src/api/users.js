// src/api/users.js
// ✅ ROUTER WRAPPER - Routes between Supabase and Google Sheets
import api from '@/plugins/axios'
import { userApi as supabaseUserApi } from '@/api/supabase/userApi'

function toFormData(data) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params
}

// Helper: Hash password using SHA-256
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// ✅ GET SETTINGS - Dynamic import with async
async function getSettings() {
  const { useSettingsStore } = await import('@/stores/settings')
  return useSettingsStore()
}

// ✅ GET API ENDPOINT
async function getUsersEndpoint() {
  try {
    const settings = await getSettings()
    
    console.log('[users] Current database type:', settings.database.type)
    
    if (settings.isUsingSupabase) {
      return null
    }
    
    const endpoint = settings.api.users || settings.googleAppsScript.users
    console.log('[users] Using endpoint:', endpoint)
    return endpoint
  } catch (error) {
    console.error('[users] Error getting endpoint:', error)
    return null
  }
}

export const userApi = {
  // ✅ READ ALL USERS
  async readUsers() {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    // Coba Supabase jika aktif
    if (settings.isUsingSupabase) {
      try {
        return await supabaseUserApi.readUsers()
    } catch (error) {
        console.warn('[users] Supabase gagal, mencoba failover ke Google Sheets...')
        settings.switchToGoogleSheets()
    }
    }

    const endpoint = await getUsersEndpoint()
    
    try {
      console.log('[users] readUsers - Fetching via POST to endpoint:', endpoint)
      
      // SESUAIKAN: GAS menggunakan 'read' bukan 'list'
      const params = new URLSearchParams()
      params.append('action', 'read')

      const { data } = await api.post(endpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      console.log('[users] readUsers response:', data)
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data user')
      }

      // SESUAIKAN: GAS mengembalikan { success, users: [...] }, bukan { data: [...] }
      const rawUsers = data.users || []
      const mappedData = rawUsers.map(user => ({
        id: user.id,
        nama: user.nama,
        inisial: user.inisial || '',
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
      
      return { success: true, data: mappedData }
    } catch (error) {
      console.error('[users] Error in readUsers:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  // ✅ LOGIN - Support both Supabase and Google Sheets
  async login(email, password) {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseUserApi.login(email, password)
    }
    
    // Google Sheets login flow - SIMPLIFIED & DIRECT
    const endpoint = await getUsersEndpoint()
    
    try {
      console.log('[users] Attempting Google Sheets login with email:', email)
      console.log('[users] Endpoint:', endpoint)
      
      // Send login action DIRECTLY to Google Apps Script
      // Let Google Apps Script handle the password verification
      const params = new URLSearchParams()
      params.append('action', 'login')
      params.append('email', email)
      params.append('password', password)
      
      console.log('[users] Sending login request to Google Apps Script...')
      const response = await api.post(endpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      console.log('[users] Google Apps Script response:', response.data)
      
      const result = response.data
      if (!result?.success) {
        console.log('[users] Login failed:', result?.message)
        return {
          success: false,
          message: result?.message || 'Email atau password salah'
      }
      }
      
      // Google Apps Script returned user data
      const user = result.user
      console.log('[users] Login successful, user:', { id: user.id, nama: user.nama })
      
      // Map user data to app format
      const mappedUser = {
        id: user.id_user || user.id,
        nama: user.nama,
        inisial: user.inisial || '',
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
      
      return {
        success: true,
        message: 'Login berhasil',
        user: mappedUser
    }

    } catch (error) {
      console.error('[users] Login error:', error)
      console.error('[users] Error details:', error.message, error.response?.data)
      return {
        success: false,
        message: 'Terjadi kesalahan saat login: ' + (error.message || 'Unknown error')
      }
    }
  },

  // ✅ GET USER BY ID
  async getUserById(id) {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseUserApi.getUserById(id)
    }
    
    const endpoint = await getUsersEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { action: 'get', id }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data user')
      }
      
      const mappedUser = {
        id: data.user.id_user || data.user.id,
        nama: data.user.nama,
        inisial: data.user.inisial,
        email: data.user.email,
        role: data.user.role,
        createdAt: data.user.createdAt,
        updatedAt: data.user.updatedAt
      }
      
      return { success: true, user: mappedUser }
    } catch (error) {
      console.error('[users] Error in getUserById:', error)
      return { success: false, error: error.message }
    }
  },

  // ✅ CREATE USER - Only Supabase for now
  async createUser(user) {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseUserApi.createUser(user)
    }
    
    throw new Error('Google Sheets API tidak support create user. Gunakan Supabase.')
  },

  // ✅ UPDATE USER - Only Supabase for now
  async updateUser(id, user) {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseUserApi.updateUser(id, user)
    }
    
    throw new Error('Google Sheets API tidak support update user. Gunakan Supabase.')
  },

  // ✅ DELETE USER - Only Supabase for now
  async deleteUser(id) {
    const { useSettingsStore } = await import('@/stores/settings')
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseUserApi.deleteUser(id)
}

    throw new Error('Google Sheets API tidak support delete user. Gunakan Supabase.')
  }
}

