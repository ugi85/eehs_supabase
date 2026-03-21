// src/api/supabase/logAktivitasApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Log Aktivitas API - Supabase Integration
 * Table: logaktivitas
 * Columns: no, no_id, calibration_id, jenis, execute_date, pic, keterangan
 */
export const logAktivitasApi = {
  /**
   * GET: Fetch all log aktivitas
   */
  async fetchList(filters = {}) {
    try {
      let query = supabase
        .from('logaktivitas')
        .select('*')
        .order('execute_date', { ascending: false })

      // Apply filters if provided
      if (filters.jenis) {
        query = query.eq('jenis', filters.jenis)
      }
      if (filters.startDate) {
        query = query.gte('execute_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('execute_date', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Get log by ID
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('logaktivitas')
        .select('*')
        .eq('no', id)
        .single()

      if (error) throw error

      return {
        success: true,
        data
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Create log aktivitas
   * Accepts both aliased fields (cal_id, tanggal, petugas) and canonical fields
   */
  async create(log) {
    try {
      // Normalisasi execute_date ke format YYYY-MM-DD
      let executeDate = log.execute_date || log.tanggal || null
      if (executeDate && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(executeDate)) {
        const [d, m, y] = executeDate.split('/')
        executeDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
      }

      const logData = {
        no_id: log.no_id,
        calibration_id: log.calibration_id || log.cal_id || null,
        jenis: log.jenis,
        execute_date: executeDate,
        pic: log.pic || log.petugas || null,
        keterangan: log.keterangan
      }

      const { data, error } = await supabase
        .from('logaktivitas')
        .insert([logData])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Log aktivitas berhasil dibuat',
        data
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * PUT: Update log aktivitas
   * Accepts both aliased fields (cal_id, tanggal, petugas) and canonical fields
   */
  async update(no, log) {
    try {
      // Normalisasi execute_date ke format YYYY-MM-DD
      let executeDate = log.execute_date || log.tanggal || null
      if (executeDate) {
        // Jika format dd/mm/yyyy, konversi ke YYYY-MM-DD
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(executeDate)) {
          const [d, m, y] = executeDate.split('/')
          executeDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
        }
      }

      const logData = {
        no_id: log.no_id,
        calibration_id: log.calibration_id || log.cal_id || null,
        jenis: log.jenis,
        execute_date: executeDate,
        pic: log.pic || log.petugas || null,
        keterangan: log.keterangan
      }

      const { data, error } = await supabase
        .from('logaktivitas')
        .update(logData)
        .eq('no', no)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Log aktivitas berhasil diupdate',
        data
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * DELETE: Delete log aktivitas
   */
  async delete(no) {
    try {
      const { error } = await supabase
        .from('logaktivitas')
        .delete()
        .eq('no', no)

      if (error) throw error

      return {
        success: true,
        message: 'Log aktivitas berhasil dihapus'
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Total Daftar Alat (untuk dashboard) - excludes obsolete
   */
  async getTotalDaftarAlat() {
    try {
      const { count, error } = await supabase
        .from('daftaralat')
        .select('*', { count: 'exact', head: true })
        .or('status.is.null,status.neq.obsolete')

      if (error) throw error

      return {
        success: true,
        total: count || 0
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getTotalDaftarAlat:', error)
      return {
        success: false,
        total: 0
      }
    }
  },

  /**
   * GET: Total Schedules (untuk dashboard)
   */
  async getTotalSchedules(year = new Date().getFullYear()) {
    try {
      // Get all kalibrasi data
      const { data: kalibrasiData, error: kalibrasiError } = await supabase
        .from('kalibrasi')
        .select('*')

      if (kalibrasiError) throw kalibrasiError

      // Get all daftar alat for PM
      const { data: alatData, error: alatError } = await supabase
        .from('daftaralat')
        .select('*')

      if (alatError) throw alatError

      // Get all log aktivitas for executed count
      const { data: logData, error: logError } = await supabase
        .from('logaktivitas')
        .select('*')
        .gte('execute_date', `${year}-01-01`)
        .lte('execute_date', `${year}-12-31`)

      if (logError) throw logError

      // Process kalibrasi monthly
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]

      const kalibrasiMonthly = months.map((month, index) => {
        const monthNum = String(index + 1).padStart(2, '0')
        
        // Count scheduled kalibrasi for this month
        const monthData = (kalibrasiData || []).filter(item => 
          item.due_date && item.due_date.toLowerCase().includes(month.toLowerCase().substring(0, 3))
        )
        
        // Count executed kalibrasi from log
        const executedData = (logData || []).filter(item => 
          item.jenis === 'Kalibrasi' && 
          item.execute_date && 
          item.execute_date.includes(`${year}-${monthNum}`)
        )
        
        const count = monthData.length
        const executed = executedData.length
        const executedPercentage = count > 0 ? Math.round((executed / count) * 100) : 0
        
        return {
          month,
          count,
          executed,
          executedPercentage
        }
      })

      // Process PM monthly (check schedule, 6_monthly, and yearly fields)
      const pmMonthly = months.map((month, index) => {
        const monthNum = String(index + 1).padStart(2, '0')
        const monthShort = month.substring(0, 3).toLowerCase()
        
        // Count scheduled PM for this month - check all relevant fields
        const monthData = (alatData || []).filter(item => {
          if (item.pm_yn !== 'Y') return false
          
          // Check schedule field
          if (item.schedule) {
            const scheduleLower = item.schedule.toLowerCase()
            if (scheduleLower.includes(monthShort)) return true
          }
          
          // Check 6_monthly field (for 6-monthly PM)
          if (item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-') {
            const sixMonthlyLower = item['6_monthly'].toLowerCase()
            if (sixMonthlyLower.includes(monthShort)) return true
          }
          
          // Check yearly field (for yearly PM)
          if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-') {
            const yearlyLower = item.yearly.toLowerCase()
            if (yearlyLower.includes(monthShort)) return true
          }
          
          return false
        })
        
        // Count executed PM from log
        const executedData = (logData || []).filter(item => 
          item.jenis === 'PM' && 
          item.execute_date && 
          item.execute_date.includes(`${year}-${monthNum}`)
        )
        
        const count = monthData.length
        const executed = executedData.length
        const executedPercentage = count > 0 ? Math.round((executed / count) * 100) : 0
        
        return {
          month,
          count,
          executed,
          executedPercentage
        }
      })

      return {
        success: true,
        totalKalibrasi: kalibrasiData?.length || 0,
        totalPM: (alatData || []).filter(item => item.pm_yn === 'Y').length,
        kalibrasiMonthly,
        pmMonthly
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getTotalSchedules:', error)
      return {
        success: false,
        totalKalibrasi: 0,
        totalPM: 0,
        kalibrasiMonthly: [],
        pmMonthly: []
      }
    }
  },

  /**
   * GET: Kalibrasi for specific period (untuk log aktivitas view)
   */
  async getKalibrasiForPeriod(month, year) {
    try {
      console.log('[Log API] getKalibrasiForPeriod:', { month, year })
      
      // Get month number
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      // Get kalibrasi schedules for this month
      const { data: kalibrasiData, error: kalibrasiError } = await supabase
        .from('kalibrasi')
        .select('*')

      if (kalibrasiError) {
        console.error('[Log API] Error fetching kalibrasi:', kalibrasiError)
        throw kalibrasiError
      }

      // Ambil status alat untuk indikator obsolete (tidak difilter, hanya ditandai)
      const { data: alatStatusData } = await supabase
        .from('daftaralat')
        .select('no_id, status')

      const alatStatusMap = {}
      ;(alatStatusData || []).forEach(d => { alatStatusMap[d.no_id] = d.status })

      console.log('[Log API] Total kalibrasi data:', kalibrasiData?.length)

      // Filter by month only — obsolete tetap ditampilkan
      const monthShort = month.substring(0, 3).toLowerCase()
      const filtered = (kalibrasiData || []).filter(item => {
        if (!item.due_date) return false
        return item.due_date.toLowerCase().includes(monthShort)
      })

      console.log('[Log API] Filtered kalibrasi for', month, ':', filtered.length)

      // Get log data for this month
      const { data: logData, error: logError } = await supabase
        .from('logaktivitas')
        .select('*')
        .eq('jenis', 'Kalibrasi')
        .gte('execute_date', `${year}-${monthNum}-01`)
        .lte('execute_date', `${year}-${monthNum}-31`)

      if (logError) {
        console.error('[Log API] Error fetching log:', logError)
        throw logError
      }

      console.log('[Log API] Log data for', month, year, ':', logData?.length)

      // Helper untuk decode dan fix encoding issues
      const fixEncoding = (text) => {
        if (!text) return text
        
        let fixed = String(text)
        
        // Fix degree symbol (°C, °F) - harus dicek dulu sebelum plus-minus
        fixed = fixed
          .replace(/�\s*C/gi, '°C')
          .replace(/�C/gi, '°C')
          .replace(/�\s*F/gi, '°F')
          .replace(/�F/gi, '°F')
          .replace(/\?\s*C/gi, '°C')
          .replace(/\?C/gi, '°C')
          .replace(/\?\s*F/gi, '°F')
          .replace(/\?F/gi, '°F')
        
        // Fix plus-minus symbol (± angka)
        fixed = fixed
          .replace(/�\s*\d/g, (match) => match.replace('�', '±'))
          .replace(/\?\s*\d/g, (match) => match.replace('?', '±'))
        
        // HTML entities
        fixed = fixed
          .replace(/&plusmn;/g, '±')
          .replace(/&#177;/g, '±')
          .replace(/&deg;/g, '°')
          .replace(/&#176;/g, '°')
          .replace(/&micro;/g, 'µ')
          .replace(/&#181;/g, 'µ')
        
        return fixed
      }

      // Merge schedule with log data
      const result = filtered.map(item => {
        const log = (logData || []).find(l => 
          l.no_id === item.no_id || l.calibration_id === item.calibration_id
        )
        
        return {
          // Format field names sesuai yang diharapkan view
          'No.ID': item.no_id,
          'Description': item.description,
          'Calibration Id.': item.calibration_id,
          'Parameter': item.parameter,
          'Process Range': fixEncoding(item.process_range),
          'Reject Error Limit': fixEncoding(item.reject_error_limit),
          'Due Date': item.due_date,
          'Remark': item.remark,
          'Criticality': item.criticality,
          // Log data
          'pic': log?.pic || null,
          'execute_date': log?.execute_date || null,
          'ket': log?.keterangan || null,
          'log_no': log?.no || null,
          'status': log ? 'Selesai' : 'Belum',
          'equipment_status': alatStatusMap[item.no_id] || 'active'
        }
      })

      console.log('[Log API] Final result:', result.length, 'items')
      console.log('[Log API] Sample data:', result[0])

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getKalibrasiForPeriod:', error)
      return {
        success: false,
        data: [],
        error: error.message
      }
    }
  },

  /**
   * GET: PM for specific period (untuk log aktivitas view)
   */
  async getPMForPeriod(month, year) {
    try {
      console.log('[Log API] getPMForPeriod:', { month, year })
      
      // Get month number
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      // Get PM schedules for this month
      const { data: alatData, error: alatError } = await supabase
        .from('daftaralat')
        .select('*')
        .eq('pm_yn', 'Y')

      if (alatError) {
        console.error('[Log API] Error fetching alat:', alatError)
        throw alatError
      }

      console.log('[Log API] Total PM equipment:', alatData?.length)

      // Debug: Log all PM items with their schedule and interval fields
      console.log('[Log API] All PM items:')
      alatData?.forEach(item => {
        console.log({
          no_id: item.no_id,
          schedule: item.schedule,
          '6_monthly': item['6_monthly'],
          yearly: item.yearly,
          pm_yn: item.pm_yn
        })
      })

      // Filter by month - check schedule, 6_monthly, and yearly fields
      const monthShort = month.substring(0, 3).toLowerCase()
      const filtered = (alatData || []).filter(item => {
        // Check schedule field (main field)
        if (item.schedule) {
          const scheduleLower = item.schedule.toLowerCase()
          if (scheduleLower.includes(monthShort)) return true
        }
        
        // Check 6_monthly field (for 6-monthly PM)
        if (item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-') {
          const sixMonthlyLower = item['6_monthly'].toLowerCase()
          if (sixMonthlyLower.includes(monthShort)) return true
        }
        
        // Check yearly field (for yearly PM)
        if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-') {
          const yearlyLower = item.yearly.toLowerCase()
          if (yearlyLower.includes(monthShort)) return true
        }
        
        return false
      })

      console.log('[Log API] Filtered PM for', month, ':', filtered.length)
      console.log('[Log API] Filtered items:', filtered.map(i => ({ 
        no_id: i.no_id, 
        schedule: i.schedule,
        '6_monthly': i['6_monthly'],
        yearly: i.yearly
      })))

      // Get log data for this month
      const { data: logData, error: logError } = await supabase
        .from('logaktivitas')
        .select('*')
        .eq('jenis', 'PM')
        .gte('execute_date', `${year}-${monthNum}-01`)
        .lte('execute_date', `${year}-${monthNum}-31`)

      if (logError) {
        console.error('[Log API] Error fetching log:', logError)
        throw logError
      }

      console.log('[Log API] Log data for PM', month, year, ':', logData?.length)

      // Helper untuk decode dan fix encoding issues
      const fixEncoding = (text) => {
        if (!text) return text
        
        let fixed = String(text)
        
        // Fix degree symbol (°C, °F) - harus dicek dulu sebelum plus-minus
        fixed = fixed
          .replace(/�\s*C/gi, '°C')
          .replace(/�C/gi, '°C')
          .replace(/�\s*F/gi, '°F')
          .replace(/�F/gi, '°F')
          .replace(/\?\s*C/gi, '°C')
          .replace(/\?C/gi, '°C')
          .replace(/\?\s*F/gi, '°F')
          .replace(/\?F/gi, '°F')
        
        // Fix plus-minus symbol (± angka)
        fixed = fixed
          .replace(/�\s*\d/g, (match) => match.replace('�', '±'))
          .replace(/\?\s*\d/g, (match) => match.replace('?', '±'))
        
        // HTML entities
        fixed = fixed
          .replace(/&plusmn;/g, '±')
          .replace(/&#177;/g, '±')
          .replace(/&deg;/g, '°')
          .replace(/&#176;/g, '°')
          .replace(/&micro;/g, 'µ')
          .replace(/&#181;/g, 'µ')
        
        return fixed
      }

      // Merge schedule with log data
      const result = filtered.map(item => {
        const log = (logData || []).find(l => l.no_id === item.no_id)
        
        // Determine PM interval based on which field contains the schedule
        let pmInterval = '-'
        let dueDate = '-'
        
        // Debug log untuk melihat nilai field
        console.log('[Log API] PM Item:', {
          no_id: item.no_id,
          '6_monthly': item['6_monthly'],
          'yearly': item.yearly,
          'schedule': item.schedule
        })
        
        // Check if this month is in yearly field
        if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-' && item.yearly.trim() !== '') {
          const yearlyLower = item.yearly.toLowerCase()
          if (yearlyLower.includes(monthShort)) {
            pmInterval = '12'
            dueDate = item.yearly
            console.log('[Log API] Set interval to 12 for', item.no_id, '(from yearly field)')
          }
        }
        
        // Check if this month is in 6_monthly field
        if (pmInterval === '-' && item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-' && item['6_monthly'].trim() !== '') {
          const sixMonthlyLower = item['6_monthly'].toLowerCase()
          if (sixMonthlyLower.includes(monthShort)) {
            pmInterval = '6'
            dueDate = item['6_monthly']
            console.log('[Log API] Set interval to 6 for', item.no_id, '(from 6_monthly field)')
          }
        }
        
        // Fallback to schedule field if interval not determined yet
        if (pmInterval === '-' && item.schedule) {
          dueDate = item.schedule
          // Try to guess interval from schedule field
          // If schedule contains comma (e.g., "Jan, Jul"), it's likely 6-monthly
          if (item.schedule.includes(',')) {
            pmInterval = '6'
            console.log('[Log API] Set interval to 6 for', item.no_id, '(guessed from schedule with comma)')
          } else {
            pmInterval = '12'
            console.log('[Log API] Set interval to 12 for', item.no_id, '(guessed from schedule without comma)')
          }
        }
        
        return {
          // Format field names sesuai yang diharapkan view
          'No.ID': item.no_id,
          'Description': item.description,
          'Type/Model': item.type_model,
          'SN': item.sn,
          'Location': item.location,
          'Schedule': item.schedule,
          'pm_interval': pmInterval,
          'Due Date': dueDate,
          // Log data
          'pic': log?.pic || null,
          'execute_date': log?.execute_date || null,
          'ket': log?.keterangan || null,
          'log_no': log?.no || null,
          'status': log ? 'Selesai' : 'Belum',
          'equipment_status': item.status || 'active'
        }
      })

      console.log('[Log API] Final PM result:', result.length, 'items')
      console.log('[Log API] Sample PM data:', result[0])

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getPMForPeriod:', error)
      return {
        success: false,
        data: [],
        error: error.message
      }
    }
  },

  /**
   * GET: All activities for specific period
   */
  async getAllForPeriod(month, year) {
    try {
      const [kalibrasi, pm] = await Promise.all([
        this.getKalibrasiForPeriod(month, year),
        this.getPMForPeriod(month, year)
      ])

      return {
        success: true,
        data: [...(kalibrasi.data || []), ...(pm.data || [])]
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getAllForPeriod:', error)
      return {
        success: false,
        data: []
      }
    }
  },

  /**
   * GET: List all logs
   */
  async listLogs() {
    try {
      const { data, error } = await supabase
        .from('logaktivitas')
        .select('*')
        .order('execute_date', { ascending: false })

      if (error) throw error

      // Helper untuk decode dan fix encoding issues
      const fixEncoding = (text) => {
        if (!text) return text
        
        let fixed = String(text)
        
        // Fix degree symbol (°C, °F) - harus dicek dulu sebelum plus-minus
        fixed = fixed
          .replace(/�\s*C/gi, '°C')
          .replace(/�C/gi, '°C')
          .replace(/�\s*F/gi, '°F')
          .replace(/�F/gi, '°F')
          .replace(/\?\s*C/gi, '°C')
          .replace(/\?C/gi, '°C')
          .replace(/\?\s*F/gi, '°F')
          .replace(/\?F/gi, '°F')
        
        // Fix plus-minus symbol (± angka)
        fixed = fixed
          .replace(/�\s*\d/g, (match) => match.replace('�', '±'))
          .replace(/\?\s*\d/g, (match) => match.replace('?', '±'))
        
        // HTML entities
        fixed = fixed
          .replace(/&plusmn;/g, '±')
          .replace(/&#177;/g, '±')
          .replace(/&deg;/g, '°')
          .replace(/&#176;/g, '°')
          .replace(/&micro;/g, 'µ')
          .replace(/&#181;/g, 'µ')
        
        return fixed
      }

      // Fetch data kalibrasi dan daftar alat untuk join
      const { data: kalibrasiData } = await supabase
        .from('kalibrasi')
        .select('no_id, description')

      const { data: alatData } = await supabase
        .from('daftaralat')
        .select('no_id, description, type_model, sn, status')

      // Map field names dan join dengan data terkait
      const mappedData = (data || []).map(item => {
        let description = '-'
        let type_model = '-'
        let sn = '-'

        // Cari description berdasarkan jenis dan no_id
        if (item.jenis === 'Kalibrasi') {
          const kalibrasi = (kalibrasiData || []).find(k => k.no_id === item.no_id)
          if (kalibrasi) {
            description = kalibrasi.description || '-'
          }
        } else if (item.jenis === 'PM') {
          const alat = (alatData || []).find(a => a.no_id === item.no_id)
          if (alat) {
            description = alat.description || '-'
            type_model = alat.type_model || '-'
            sn = alat.sn || '-'
          }
        }

        // Get equipment status for obsolete indicator
        const alat = (alatData || []).find(a => a.no_id === item.no_id)
        const equipmentStatus = alat?.status || 'active'

        return {
          no: item.no,
          no_id: item.no_id,
          cal_id: item.calibration_id,
          jenis: item.jenis,
          tanggal: item.execute_date,
          petugas: item.pic,
          keterangan: fixEncoding(item.keterangan),
          description,
          type_model,
          sn,
          equipment_status: equipmentStatus
        }
      })

      return mappedData
    } catch (error) {
      console.error('[Log Aktivitas API] Error listLogs:', error)
      return []
    }
  },

  /**
   * POST: Create log (alias for create)
   */
  async createLog(log) {
    return this.create(log)
  },

  /**
   * PUT: Update log (alias for update)
   */
  async updateLog(log) {
    return this.update(log.no || log.log_no, log)
  }
}
