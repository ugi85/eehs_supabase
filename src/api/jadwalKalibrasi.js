// src/api/jadwalKalibrasi.js
// ✅ ROUTER WRAPPER - Routes between Supabase and Google Sheets
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'
import { jadwalKalibrasiApi as supabaseJadwalKalibrasiApi } from '@/api/supabase/jadwalKalibrasiApi'

function toFormData(data) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params
}

// ✅ GET API ENDPOINT - dengan fallback ke Google Apps Script
function getJadwalKalibrasiEndpoint() {
  const settings = useSettingsStore()
  
  console.log('[jadwalKalibrasi] Current database type:', settings.database.type)
  
  if (settings.isUsingSupabase) {
    return null  // Will use Supabase API
  }
  
  // Use Google Apps Script endpoint
  const endpoint = settings.api.jadwalKalibrasi || settings.googleAppsScript.jadwalKalibrasi
  console.log('[jadwalKalibrasi] Using endpoint:', endpoint)
  return endpoint
}

export const jadwalKalibrasiApi = {
  // ✅ FETCH LIST
  async fetchList() {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseJadwalKalibrasiApi.fetchList()
    }
    
    const endpoint = getJadwalKalibrasiEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { action: 'list' }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data jadwal kalibrasi')
      }
      
      return { success: true, data: data?.data || [] }
    } catch (error) {
      console.error('[jadwalKalibrasi] Error in fetchList:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  // ✅ GET BY ID
  async getById(id) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseJadwalKalibrasiApi.getById(id)
    }
    
    const endpoint = getJadwalKalibrasiEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { action: 'get', id }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data jadwal kalibrasi')
      }
      
      return { success: true, data: data?.item || null }
    } catch (error) {
      console.error('[jadwalKalibrasi] Error in getById:', error)
      return { success: false, error: error.message }
    }
  },

  // ✅ CREATE - Only Supabase for now
  async create(jadwal) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseJadwalKalibrasiApi.create(jadwal)
    }
    
    // Google Sheets doesn't support write yet
    throw new Error('Google Sheets API tidak support create. Gunakan Supabase.')
  },

  // ✅ UPDATE - Only Supabase for now
  async update(id, jadwal) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseJadwalKalibrasiApi.update(id, jadwal)
    }
    
    // Google Sheets doesn't support write yet
    throw new Error('Google Sheets API tidak support update. Gunakan Supabase.')
  },

  // ✅ DELETE - Only Supabase for now
  async delete(id) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseJadwalKalibrasiApi.delete(id)
    }
    
    // Google Sheets doesn't support delete yet
    throw new Error('Google Sheets API tidak support delete. Gunakan Supabase.')
  }
}
