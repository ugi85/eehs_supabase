// src/api/supabase/logAktivitasApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Helper: Determine if a period is in the past
 * @param {number} month - Month index (0-11)
 * @param {number} year - Year
 * @returns {boolean} True if period is in the past
 */
function isPastPeriod(month, year) {
  const now = new Date()
  const selectedDate = new Date(year, month + 1, 0) // Last day of the month
  return selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Helper: Filter logs by exact month/year match
 * @param {Array} logs - Array of log objects
 * @param {string} jenis - 'Kalibrasi' or 'PM'
 * @param {number} monthIndex - Month index (0-11)
 * @param {number} year - Year
 * @returns {Array} Filtered logs
 */
function filterLogsByMonth(logs, jenis, monthIndex, year) {
  const monthNum = String(monthIndex + 1).padStart(2, '0')

  return (logs || []).filter(item => {
    if (item.jenis !== jenis || !item.execute_date) return false

    // Check if execute_date matches the expected month/year
    const logDate = new Date(item.execute_date)
    return logDate.getMonth() === monthIndex &&
           logDate.getFullYear() === year &&
           item.execute_date.includes(`${year}-${monthNum}`)
  })
}

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
        keterangan: log.keterangan,
        backlog_status: log.backlog_status || null,
        backlog_notes: log.backlog_notes || null
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
        keterangan: log.keterangan,
        backlog_status: log.backlog_status !== undefined ? log.backlog_status : null,
        backlog_notes: log.backlog_notes !== undefined ? log.backlog_notes : null
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
   * DELETE: Bulk delete log aktivitas by no (supports large payload via chunking)
   */
  async bulkDelete(ids = [], chunkSize = 200) {
    try {
      const normalizedIds = [...new Set((ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id)))]

      if (normalizedIds.length === 0) {
        return {
          success: true,
          totalRequested: 0,
          deletedCount: 0,
          failedChunks: []
        }
      }

      let deletedCount = 0
      const failedChunks = []

      for (let i = 0; i < normalizedIds.length; i += chunkSize) {
        const chunkIds = normalizedIds.slice(i, i + chunkSize)

        const { error, count } = await supabase
          .from('logaktivitas')
          .delete({ count: 'exact' })
          .in('no', chunkIds)

        if (error) {
          failedChunks.push({
            startIndex: i,
            size: chunkIds.length,
            error: error.message
          })
          continue
        }

        deletedCount += (count ?? chunkIds.length)
      }

      return {
        success: failedChunks.length === 0,
        totalRequested: normalizedIds.length,
        deletedCount,
        failedChunks
      }
    } catch (error) {
      console.error('[Log Aktivitas API] Error bulkDelete:', error)
      throw new Error(error.message || 'Gagal menghapus log aktivitas secara massal')
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

      const now = new Date()
      const kalibrasiMonthly = months.map((month, index) => {
        const monthNum = String(index + 1).padStart(2, '0')
        const isPast = isPastPeriod(index, parseInt(year))

        // Count scheduled kalibrasi for this month
        const monthData = (kalibrasiData || []).filter(item =>
          item.due_date && item.due_date.toLowerCase().includes(month.toLowerCase().substring(0, 3))
        )

        // Count executed kalibrasi using helper
        const executedData = filterLogsByMonth(logData, 'Kalibrasi', index, parseInt(year))
        const executed = executedData.length

        // Untuk bulan yang sudah lewat: count = executed (hanya tampilkan yang sudah dikerjakan)
        // Untuk bulan sekarang/mendatang: count = jadwal yang ada
        const count = isPast ? executed : monthData.length
        const executedPercentage = count > 0 ? Math.round((executed / count) * 100) : 0

        return {
          month,
          count,
          executed,
          executedPercentage
        }
      })

      // Process PM monthly (aligned with getPMForPeriod logic)
      const pmMonthly = months.map((month, index) => {
        const monthNum = String(index + 1).padStart(2, '0')
        const monthShort = month.substring(0, 3).toLowerCase()
        const selectedDate = new Date(parseInt(year), index + 1, 0)
        const isPastPeriod = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)

        // Count scheduled PM for this month
        // Rule disamakan dengan getPMForPeriod:
        // - hanya pakai 6_monthly & yearly (schedule bukan PM schedule)
        // - obsolete hanya di-skip untuk periode sekarang/mendatang
        const monthData = (alatData || []).filter(item => {
          if (item.pm_yn !== 'Y') return false
          if (!isPastPeriod && item.status === 'obsolete') return false

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

        // Count executed PM from log - hanya yang benar-benar dieksekusi di bulan ini
        const executedData = (logData || []).filter(item => {
          if (item.jenis !== 'PM' || !item.execute_date) return false

          // Cek apakah execute_date sesuai dengan bulan/tahun yang dipilih
          if (!item.execute_date.includes(`${year}-${monthNum}`)) return false

          // Pastikan log benar-benar milik bulan ini
          const logDate = new Date(item.execute_date)
          return logDate.getMonth() === index && logDate.getFullYear() === parseInt(year)
        })

        const executed = executedData.length

        // Untuk bulan yang sudah lewat: count = executed (hanya tampilkan yang sudah dikerjakan)
        // Untuk bulan sekarang/mendatang: count = jadwal yang ada
        const count = isPastPeriod ? executed : monthData.length
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
        totalKalibrasi: (kalibrasiData || []).length,
        totalPM: pmMonthly.reduce((sum, m) => sum + m.count, 0),
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
      
      // Get month number
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      // Get kalibrasi schedules for this month
      const { data: kalibrasiData, error: kalibrasiError } = await supabase
        .from('kalibrasi')
        .select('*')
        .order('no_id', { ascending: true })

      if (kalibrasiError) {
        console.error('[Log API] Error fetching kalibrasi:', kalibrasiError)
        throw kalibrasiError
      }

      // Ambil status alat + audit trail columns untuk fallback
      const { data: alatStatusData } = await supabase
        .from('daftaralat')
        .select('no_id, status, created_at, updated_at, created_by, updated_by')

      const alatMap = {}
      const alatStatusMap = {}
      ;(alatStatusData || []).forEach(d => {
        alatStatusMap[d.no_id] = d.status
        alatMap[d.no_id] = d
      })

      // Tentukan apakah periode ini sudah lewat
      const now = new Date()
      const selectedDate = new Date(parseInt(year), monthIndex + 1, 0) // akhir bulan yang dipilih
      const isPastPeriod = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)

      // Helper: parse interval field ke angka bulan
      // Contoh: "12" → 12, "24" → 24, "Yearly" → 12, "2 Yearly" → 24, "6" → 6
      const parseIntervalMonths = (intField) => {
        if (!intField) return 12 // default yearly
        const str = String(intField).trim().toLowerCase()
        // Angka langsung
        const num = parseInt(str)
        if (!isNaN(num) && num > 0) return num
        // "2 yearly" → 24, "3 yearly" → 36, dst
        const multiYearMatch = str.match(/^(\d+)\s*year/)
        if (multiYearMatch) return parseInt(multiYearMatch[1]) * 12
        // "yearly" → 12
        if (str.includes('year')) return 12
        // "6 monthly" → 6
        const multiMonthMatch = str.match(/^(\d+)\s*month/)
        if (multiMonthMatch) return parseInt(multiMonthMatch[1])
        return 12
      }

      // Filter by month + interval year check
      const monthShort = month.substring(0, 3).toLowerCase()
      const selectedYear_int = parseInt(year)

      const filtered = (kalibrasiData || []).filter(item => {
        if (!isPastPeriod && alatStatusMap[item.no_id] === 'obsolete') return false
        if (!item.due_date) return false
        if (!item.due_date.toLowerCase().includes(monthShort)) return false

        // Cek interval — jika > 12 bulan, hitung apakah tahun ini adalah tahun kalibrasi
        const intervalMonths = parseIntervalMonths(item.int)
        if (intervalMonths <= 12) return true // yearly atau lebih sering → selalu tampil

        // Untuk interval > 12 bulan:
        const intervalYears = Math.round(intervalMonths / 12)
        const lastExec = lastExecMap[item.calibration_id]

        if (!lastExec) {
          // Belum pernah dikalibrasi → tampilkan (pertama kali)
          // Gunakan due_date bulan sebagai acuan: tampil di tahun yang sesuai interval dari sekarang
          // Jika belum ada history, tampilkan di tahun pertama yang due_date-nya cocok
          return true
        }

        // Sudah pernah dikalibrasi → hitung apakah sudah waktunya
        const lastYear = new Date(lastExec).getFullYear()
        const yearsDiff = selectedYear_int - lastYear
        // Tampil jika selisih tahun adalah kelipatan interval
        return yearsDiff > 0 && yearsDiff % intervalYears === 0
      })

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

      // Fetch last execution per calibration_id untuk interval check
      const { data: allKalLog } = await supabase
        .from('logaktivitas')
        .select('calibration_id, execute_date')
        .eq('jenis', 'Kalibrasi')
        .order('execute_date', { ascending: false })

      // Map: calibration_id → last execute_date
      const lastExecMap = {}
      ;(allKalLog || []).forEach(l => {
        if (l.calibration_id && !lastExecMap[l.calibration_id]) {
          lastExecMap[l.calibration_id] = l.execute_date
        }
      })

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

      // Fetch kalibrasi data for audit trail (jika tabel kalibrasi sudah punya kolom audit)
      let kalibrasiAuditMap = {}
      try {
        const { data: kalibrasiAudit, error: kalError } = await supabase
          .from('kalibrasi')
          .select('no_id, calibration_id, created_at, updated_at, created_by, updated_by')

        if (!kalError) {
          kalibrasiAuditMap = {}
          ;(kalibrasiAudit || []).forEach(kal => {
            kalibrasiAuditMap[kal.calibration_id] = kal
          })
        }
      } catch (kalError) {
        console.warn('[Log API] Warning: kalibrasi table may not have audit columns:', kalError.message)
      }

      // Merge schedule with log data
      const result = filtered.map(item => {
        // Prioritaskan match by calibration_id (lebih spesifik), fallback ke no_id
        const log = (logData || []).find(l => l.calibration_id === item.calibration_id)
          || (item.calibration_id ? null : (logData || []).find(l => l.no_id === item.no_id))

        // Audit trail: prioritas dari kalibrasi table, fallback dari daftaralat
        const kalibrasiAudit = item.calibration_id ? kalibrasiAuditMap[item.calibration_id] : null
        const alatAudit = alatMap[item.no_id] || {}

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
          'equipment_status': alatStatusMap[item.no_id] || 'active',
          // Audit trail fields - prioritas: kalibrasi > daftaralat
          'created_at': kalibrasiAudit?.created_at || alatAudit.created_at || null,
          'updated_at': kalibrasiAudit?.updated_at || alatAudit.updated_at || null,
          'created_by': kalibrasiAudit?.created_by || alatAudit.created_by || null,
          'updated_by': kalibrasiAudit?.updated_by || alatAudit.updated_by || null,
          'backlog_status': log?.backlog_status || null,
          'backlog_notes': log?.backlog_notes || null,
          'backlog_updated_at': log?.backlog_updated_at || null,
          'backlog_updated_by': log?.backlog_updated_by || null,
          'backlog_history': log?.backlog_history || []
        }
      })

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
      
      // Get month number
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      // Get PM schedules for this month — exclude obsolete hanya untuk periode sekarang/mendatang
      const { data: alatData, error: alatError } = await supabase
        .from('daftaralat')
        .select('*')
        .eq('pm_yn', 'Y')
        .order('no_id', { ascending: true })

      if (alatError) {
        console.error('[Log API] Error fetching alat:', alatError)
        throw alatError
      }

      // Tentukan apakah periode ini sudah lewat
      const now = new Date()
      const selectedDate = new Date(parseInt(year), monthIndex + 1, 0)
      const isPastPeriod = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)

      // Filter by month - check schedule, 6_monthly, and yearly fields
      // Periode lampau: tampilkan semua termasuk obsolete (history)
      // Periode sekarang/mendatang: skip obsolete
      const monthShort = month.substring(0, 3).toLowerCase()
      const filtered = (alatData || []).filter(item => {
        if (!isPastPeriod && item.status === 'obsolete') return false
        // Hanya cek 6_monthly dan yearly — schedule adalah Calibration Schedule, bukan PM schedule
        
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

        // Check if this month is in yearly field
        if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-' && item.yearly.trim() !== '') {
          const yearlyLower = item.yearly.toLowerCase()
          if (yearlyLower.includes(monthShort)) {
            pmInterval = '12'
            dueDate = item.yearly
          }
        }

        // Check if this month is in 6_monthly field
        if (pmInterval === '-' && item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-' && item['6_monthly'].trim() !== '') {
          const sixMonthlyLower = item['6_monthly'].toLowerCase()
          if (sixMonthlyLower.includes(monthShort)) {
            pmInterval = '6'
            dueDate = item['6_monthly']
          }
        }

        // Jika tidak ada field yang cocok dengan bulan ini, skip baris ini
        // (item.schedule adalah Calibration Schedule, bukan PM schedule — jangan dipakai sebagai fallback)

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
          'equipment_status': item.status || 'active',
          // Audit trail fields - prioritas: dari logaktivitas, fallback dari daftaralat
          'created_at': log?.created_at || item.created_at || null,
          'updated_at': log?.updated_at || item.updated_at || null,
          'created_by': log?.created_by || item.created_by || null,
          'updated_by': log?.updated_by || item.updated_by || null,
          'backlog_status': log?.backlog_status || null,
          'backlog_notes': log?.backlog_notes || null,
          'backlog_updated_at': log?.backlog_updated_at || null,
          'backlog_updated_by': log?.backlog_updated_by || null,
          'backlog_history': log?.backlog_history || []
        }
      })

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
        // Urutkan berdasarkan data terbaru yang TERINPUT (auto increment no)
        // agar log yang baru ditambahkan tampil di baris paling atas.
        .order('no', { ascending: false })

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
          equipment_status: equipmentStatus,
          backlog_status: item.backlog_status || null,
          backlog_notes: item.backlog_notes || null,
          backlog_updated_at: item.backlog_updated_at || null,
          backlog_updated_by: item.backlog_updated_by || null,
          backlog_history: item.backlog_history || []
        }
      })

      return mappedData
    } catch (error) {
      console.error('[Log Aktivitas API] Error listLogs:', error)
      return []
    }
  },

  /**
   * PATCH: Update backlog status — append history ke backlog_history
   */
  async updateBacklog(no, backlog_status, backlog_notes, updatedBy = null) {
    try {
      // Ambil data backlog saat ini untuk append history
      const { data: current } = await supabase
        .from('logaktivitas')
        .select('*')
        .eq('no', no)
        .single()

      // Append entry lama ke history (jika ada status sebelumnya)
      const existingHistory = current?.backlog_history || []
      if (current?.backlog_status) {
        existingHistory.push({
          status: current.backlog_status,
          notes: current.backlog_notes || '',
          changed_at: current.backlog_updated_at || new Date().toISOString(),
          changed_by: current.backlog_updated_by || '-'
        })
      }

      const updateData = {
        backlog_status,
        backlog_notes,
        backlog_updated_at: new Date().toISOString(),
        backlog_updated_by: updatedBy || null
      }

      // Hanya tambah backlog_history jika kolom sudah ada (tidak error)
      try {
        updateData.backlog_history = existingHistory
      } catch (e) { /* kolom belum ada, skip */ }

      const { data, error } = await supabase
        .from('logaktivitas')
        .update(updateData)
        .eq('no', no)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Fetch all pending backlogs
   */
  async getPendingBacklogs() {
    try {
      const { data, error } = await supabase
        .from('logaktivitas')
        .select('*')
        .eq('backlog_status', 'pending')
        .order('execute_date', { ascending: false })

      if (error) throw error

      const { data: alatData } = await supabase
        .from('daftaralat')
        .select('no_id, description, status')

      return (data || []).map(item => {
        const alat = (alatData || []).find(a => a.no_id === item.no_id)
        return {
          no: item.no,
          no_id: item.no_id,
          cal_id: item.calibration_id,
          jenis: item.jenis,
          tanggal: item.execute_date,
          petugas: item.pic,
          keterangan: item.keterangan,
          backlog_status: item.backlog_status,
          backlog_notes: item.backlog_notes,
          description: alat?.description || '-',
          equipment_status: alat?.status || 'active'
        }
      })
    } catch (error) {
      console.error('[Log Aktivitas API] Error getPendingBacklogs:', error)
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





