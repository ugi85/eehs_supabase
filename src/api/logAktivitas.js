// src/api/logAktivitas.js
// ✅ ROUTER WRAPPER - Routes between Supabase and Google Sheets
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'
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

// ✅ GET API ENDPOINT
function getLogAktivitasEndpoint() {
  const settings = useSettingsStore()
  return settings.api.logAktivitas
}
  
export const logAktivitasApi = {
  // ✅ DASHBOARD CHARTS - getTotalDaftarAlat
  async getTotalDaftarAlat() {
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

  // ✅ CREATE LOG
  async createLog(log) {
    const settings = useSettingsStore()
    const payload = toFormData({
      action: 'create',
      no_id: log.no_id,
      cal_id: log.cal_id,
      jenis: log.jenis,
      tanggal: log.tanggal,
      petugas: log.petugas,
      keterangan: log.keterangan
    })
    try {
      const { data } = await api.post(settings.api.logAktivitas, payload)
      if (!data.success) {
        throw new Error(data.message || 'Gagal menyimpan log aktivitas')
      }
      return data
    } catch (error) {
      console.error('Error in createLog:', error)
      throw error
    }
  },

  // ✅ UPDATE LOG
  async updateLog(log) {
    const settings = useSettingsStore()
    const payload = toFormData({
      action: 'update',
      no: log.no,
      no_id: log.no_id,
      cal_id: log.cal_id,
      jenis: log.jenis,
      tanggal: log.tanggal,
      petugas: log.petugas,
      keterangan: log.keterangan
    })
    try {
      const { data } = await api.post(settings.api.logAktivitas, payload)
      if (!data.success) {
        throw new Error(data.message || 'Gagal update log aktivitas')
      }
      return data
    } catch (error) {
      console.error('Error in updateLog:', error)
      throw error
    }
  },

  // ✅ DELETE LOG
  async deleteLog(no) {
    const settings = useSettingsStore()
    const payload = toFormData({
      action: 'delete',
      no: String(no)
    })
    try {
      const { data } = await api.post(settings.api.logAktivitas, payload)
      if (!data.success) {
        throw new Error(data.message || 'Gagal hapus log aktivitas')
      }
      return data
    } catch (error) {
      console.error('Error in deleteLog:', error)
      throw error
    }
  },

  // ✅ LIST ALL LOGS
  async listLogs() {
    const settings = useSettingsStore()
    try {
      const { data } = await api.get(settings.api.logAktivitas, {
        params: { action: 'list' }
      })
      return data.success ? data.data || [] : []
    } catch (error) {
      console.error('Error in listLogs:', error)
      throw error
    }
  },

  // ✅ GET LOG BY NO (for detail view)
  async getLogByNo(no) {
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
  },

  async fetchLogs(filters = {}) {
    const settings = useSettingsStore()
    try {
      const { data } = await api.get(settings.api.logAktivitas, {
        params: { action: 'list', ...filters }
      })
      return data.success ? data.data || [] : []
    } catch (error) {
      console.error('[logAktivitasApi] Gagal fetch:', error)
      throw error
    }
  },

  async saveLog(log) {
    const settings = useSettingsStore()
    try {
      const { data } = await api.post(settings.api.logAktivitas, {
        action: 'save',
        ...log
      })
      return data
    } catch (error) {
      console.error('[logAktivitasApi] Gagal save:', error)
      throw error
    }
  },

  async updateBacklog(payload) {
    const settings = useSettingsStore();
    try {
      // Ubah data menjadi URLSearchParams agar mirip form-submit
      const params = new URLSearchParams();
      params.append('action', 'updatebacklog');
      for (const key in payload) {
        params.append(key, payload[key]);
      }

      const { data } = await api.post(settings.api.logAktivitas, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return data;
    } catch (error) {
      console.error('[logAktivitasApi] Gagal update backlog:', error);
      throw error;
    }
  }
}

