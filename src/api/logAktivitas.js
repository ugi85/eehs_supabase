// src/api/logAktivitas.js
// ✅ ROUTER WRAPPER - Routes between Supabase and Google Sheets
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'
import { logAktivitasApi as supabaseLogAktivitasApi } from '@/api/supabase/logAktivitasApi'

// ✅ SET TIMEOUT GLOBAL 30 DETIK
api.defaults.timeout = 30000

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
function getLogAktivitasEndpoint() {
  const settings = useSettingsStore()
  
  // ✅ DEBUG: Log current database type
  console.log('[logAktivitas] Current database type:', settings.database.type)
  
  if (settings.isUsingSupabase) {
    return null  // Will use Supabase API
  }
  
  // Use Google Apps Script endpoint
  const endpoint = settings.api.logAktivitas || settings.googleAppsScript.logAktivitas
  console.log('[logAktivitas] Using endpoint:', endpoint)
  return endpoint
}

export const logAktivitasApi = {
  // ✅ DASHBOARD CHARTS - getTotalDaftarAlat
  async getTotalDaftarAlat() {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getTotalDaftarAlat()
    }
    
    try {
      const endpoint = getLogAktivitasEndpoint()
      const { data } = await api.get(endpoint, {
        params: { action: 'getdaftarshalat' }
      })
      
      return {
        success: data?.success ?? true,
        total: data?.data?.length ?? 0,
        data: data?.data ?? []
      }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getTotalDaftarAlat:', error)
      return { success: false, total: 0, error: error.message, data: [] }
    }
  },

  // ✅ DASHBOARD CHARTS - getKalibrasiScheduleByMonth
  async getKalibrasiScheduleByMonth(year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getKalibrasiScheduleByMonth(year)
    }
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    try {
      const promises = months.map(month =>
        this.getKalibrasiForPeriod(month, year)
          .then(response => ({ month, items: response?.data || [] }))
          .catch(err => {
            console.warn(`[logAktivitasApi] Error fetching kalibrasi ${month} ${year}:`, err.message)
            return { month, items: [] }
          })
      )

      const results = await Promise.all(promises)

      const scheduleData = results.map(({ month, items }) => {
        const count = items.length
        const executed = items.filter(item => item.status === 'Selesai').length
        const executedPercentage = count > 0 ? Math.round((executed / count) * 100) : 0
        return { month, count, executed, executedPercentage, label: month.substring(0, 3) }
      })

      return { success: true, year, data: scheduleData }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getKalibrasiScheduleByMonth:', error)
      return { success: false, year, data: [], error: error.message }
    }
  },

  // ✅ DASHBOARD CHARTS - getPMScheduleByMonth
  async getPMScheduleByMonth(year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getPMScheduleByMonth(year)
    }
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    try {
      const promises = months.map(month =>
        this.getPMForPeriod(month, year)
          .then(response => ({ month, items: response?.data || [] }))
          .catch(err => {
            console.warn(`[logAktivitasApi] Error fetching PM ${month} ${year}:`, err.message)
            return { month, items: [] }
          })
      )

      const results = await Promise.all(promises)

      const scheduleData = results.map(({ month, items }) => {
        const count = items.length
        const executed = items.filter(item => item.status === 'Selesai').length
        const executedPercentage = count > 0 ? Math.round((executed / count) * 100) : 0
        return { month, count, executed, executedPercentage, label: month.substring(0, 3) }
      })

      return { success: true, year, data: scheduleData }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getPMScheduleByMonth:', error)
      return { success: false, year, data: [], error: error.message }
    }
  },

  // ✅ DASHBOARD CHARTS - getTotalSchedules
  async getTotalSchedules(year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getTotalSchedules(year)
    }
    
    try {
      console.log('[logAktivitasApi] getTotalSchedules called with year:', year)
      
      const [kalibrasiResult, pmResult] = await Promise.all([
        this.getKalibrasiScheduleByMonth(year),
        this.getPMScheduleByMonth(year)
      ])
      
      console.log('[logAktivitasApi] Results:', { kalibrasiResult, pmResult })
      
      const totalKalibrasi = kalibrasiResult.data?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
      const totalPM = pmResult.data?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
      
      return {
        success: true,
        year,
        totalKalibrasi,
        totalPM,
        totalAktivitas: totalKalibrasi + totalPM,
        kalibrasiMonthly: kalibrasiResult.data || [],
        pmMonthly: pmResult.data || []
      }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getTotalSchedules:', error)
      return {
        success: false,
        year,
        totalKalibrasi: 0,
        totalPM: 0,
        totalAktivitas: 0,
        kalibrasiMonthly: [],
        pmMonthly: [],
        error: error.message
      }
    }
  },

  // ✅ GET KALIBRASI FOR PERIOD
  async getKalibrasiForPeriod(month, year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getKalibrasiForPeriod(month, year)
    }
    
    const endpoint = getLogAktivitasEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { 
          action: 'getkalibrasiforperiod', 
          month: String(month), 
          year: String(year) 
        }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data kalibrasi')
      }
      
      return { success: true, data: data?.data || [] }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getKalibrasiForPeriod:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  // ✅ GET PM FOR PERIOD
  async getPMForPeriod(month, year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getPMForPeriod(month, year)
    }
    
    const endpoint = getLogAktivitasEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { 
          action: 'getpmforperiod', 
          month: String(month), 
          year: String(year) 
        }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data PM')
      }
      
      return { success: true, data: data?.data || [] }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getPMForPeriod:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  // ✅ GET ALL FOR PERIOD (PM + KALIBRASI)
  async getAllForPeriod(month, year) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getAllForPeriod(month, year)
    }
    
    const endpoint = getLogAktivitasEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { 
          action: 'getallforperiod', 
          month: String(month), 
          year: String(year) 
        }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil data periode')
      }
      
      return { success: true, data: data?.data || [] }
    } catch (error) {
      console.error('[logAktivitasApi] Error in getAllForPeriod:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  // ✅ LIST ALL LOGS
  async listLogs() {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.listLogs()
    }
    
    const endpoint = getLogAktivitasEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { action: 'list' }
      })
      
      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengambil semua log')
      }
      
      return data?.data || []
    } catch (error) {
      console.error('[logAktivitasApi] Error in listLogs:', error)
      return []
    }
  },

  // ✅ GET LOG BY NO (for detail view)
  async getLogByNo(no) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      return await supabaseLogAktivitasApi.getLogByNo?.(no) || null
    }
    
    const endpoint = getLogAktivitasEndpoint()
    
    try {
      const { data } = await api.get(endpoint, {
        params: { action: 'get', no: String(no) }
      })
      
      if (!data?.success) {
        return null
      }
      
      return data?.item || null
    } catch (error) {
      console.error('[logAktivitasApi] Error in getLogByNo:', error)
      return null
    }
  }
}
