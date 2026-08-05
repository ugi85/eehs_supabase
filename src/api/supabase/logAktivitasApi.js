// src/api/supabase/logAktivitasApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Helper: Determine if a period is in the past
 */
function isPastPeriod(month, year) {
  const now = new Date()
  const selectedDate = new Date(year, month + 1, 0)
  return selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Helper: Filter logs by exact month/year match
 */
function filterLogsByMonth(logs, jenis, monthIndex, year) {
  const monthNum = String(monthIndex + 1).padStart(2, '0')
  return (logs || []).filter(item => {
    if (item.jenis !== jenis || !item.execute_date) return false
    const logDate = new Date(item.execute_date)
    return logDate.getMonth() === monthIndex &&
           logDate.getFullYear() === year &&
           item.execute_date.includes(`${year}-${monthNum}`)
  })
}

/**
 * ✅ HELPER: Fix Encoding (Aman & Tidak Merusak Teks Asli)
 * Hanya memperbaiki karakter yang rusak (Mojibake) dan HTML Entities.
 */
const fixEncoding = (text) => {
  if (!text) return text
  let fixed = String(text)

  // 1. Decode HTML Entities
  fixed = fixed
    .replace(/&plusmn;/g, '±')
    .replace(/&#177;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&#176;/g, '°')
    .replace(/&micro;/g, 'µ')
    .replace(/&#181;/g, 'µ')

  // 2. Fix Mojibake (UTF-8 yang terbaca sebagai Latin1/Windows-1252)
  // Karakter ± (UTF-8: C2 B1) sering rusak menjadi Â± atau Ã‚Â±
  fixed = fixed.replace(/Â±/g, '±')
  fixed = fixed.replace(/Ã‚Â±/g, '±')
  
  // Karakter ° (UTF-8: C2 B0) sering rusak menjadi Â° atau Ã‚Â°
  fixed = fixed.replace(/Â°/g, '°')
  fixed = fixed.replace(/Ã‚Â°/g, '°')

  return fixed
}

/**
 * Log Aktivitas API - Supabase Integration
 */
export const logAktivitasApi = {
  async fetchList(filters = {}) {
    try {
      let query = supabase.from('logaktivitas').select('*').order('execute_date', { ascending: false })
      if (filters.jenis) query = query.eq('jenis', filters.jenis)
      if (filters.startDate) query = query.gte('execute_date', filters.startDate)
      if (filters.endDate) query = query.lte('execute_date', filters.endDate)

      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase.from('logaktivitas').select('*').eq('no', id).single()
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async create(log) {
    try {
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

      const { data, error } = await supabase.from('logaktivitas').insert([logData]).select().single()
      if (error) throw error
      return { success: true, message: 'Log aktivitas berhasil dibuat', data }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async update(no, log) {
    try {
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
        backlog_status: log.backlog_status !== undefined ? log.backlog_status : null,
        backlog_notes: log.backlog_notes !== undefined ? log.backlog_notes : null
      }

      const { data, error } = await supabase.from('logaktivitas').update(logData).eq('no', no).select().single()
      if (error) throw error
      return { success: true, message: 'Log aktivitas berhasil diupdate', data }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async delete(no) {
    try {
      const { error } = await supabase.from('logaktivitas').delete().eq('no', no)
      if (error) throw error
      return { success: true, message: 'Log aktivitas berhasil dihapus' }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async bulkDelete(ids = [], chunkSize = 200) {
    try {
      const normalizedIds = [...new Set((ids || []).map(id => Number(id)).filter(id => Number.isFinite(id)))]
      if (normalizedIds.length === 0) return { success: true, totalRequested: 0, deletedCount: 0, failedChunks: [] }

      let deletedCount = 0
      const failedChunks = []

      for (let i = 0; i < normalizedIds.length; i += chunkSize) {
        const chunkIds = normalizedIds.slice(i, i + chunkSize)
        const { error, count } = await supabase.from('logaktivitas').delete({ count: 'exact' }).in('no', chunkIds)
        if (error) {
          failedChunks.push({ startIndex: i, size: chunkIds.length, error: error.message })
          continue
        }
        deletedCount += (count ?? chunkIds.length)
      }
      return { success: failedChunks.length === 0, totalRequested: normalizedIds.length, deletedCount, failedChunks }
    } catch (error) {
      console.error('[Log Aktivitas API] Error bulkDelete:', error)
      throw new Error(error.message || 'Gagal menghapus log aktivitas secara massal')
    }
  },

  async getTotalDaftarAlat() {
    try {
      const { count, error } = await supabase.from('daftaralat').select('*', { count: 'exact', head: true }).or('status.is.null,status.neq.obsolete')
      if (error) throw error
      return { success: true, total: count || 0 }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getTotalDaftarAlat:', error)
      return { success: false, total: 0 }
    }
  },
  /**
   * GET: Total Schedules (untuk dashboard) - VERSI FINAL FIX dengan Versioning
   */
  async getTotalSchedules(year = new Date().getFullYear()) {
    try {
      console.log(`[API] getTotalSchedules called for year: ${year}`)

      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

      // ✅ VERSIONING: Get appropriate version for each month
      const versionPromises = months.map((_, index) => this.getVersionForPeriod(index, parseInt(year)))
      const monthVersions = await Promise.all(versionPromises)

      console.log('[API] Month versions:', monthVersions)

      // ✅ Fetch data with versioning - each month uses its appropriate version
      const fetchPromises = months.map((_, index) => {
        const versionId = monthVersions[index]
        return Promise.all([
          this.getDataForVersion('kalibrasi', versionId),
          this.getDataForVersion('daftaralat', versionId),
          this.getDataForVersion('logaktivitas', versionId)
        ])
      })

      const allData = await Promise.all(fetchPromises)

      // Process each month with its versioned data
      const kalibrasiMonthly = months.map((month, index) => {
        const [kalibrasiData, alatData, allLogData] = allData[index]
        return this.processMonthlyData(month, index, parseInt(year), kalibrasiData, alatData, allLogData)
      })

      const pmMonthly = months.map((month, index) => {
        const [kalibrasiData, alatData, allLogData] = allData[index]
        return this.processPMMonthlyData(month, index, parseInt(year), alatData, allLogData)
      })

      const result = {
        success: true,
        totalKalibrasi: kalibrasiMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
        totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
        kalibrasiMonthly,
        pmMonthly
      }

      console.log('[API] getTotalSchedules result:', result)
      return result

    } catch (error) {
      console.error('[Log Aktivitas API] CRITICAL ERROR getTotalSchedules:', error)
      return {
        success: false,
        totalKalibrasi: 0,
        totalPM: 0,
        kalibrasiMonthly: [],
        pmMonthly: [],
        error: error.message
      }
    }
  },

  // ✅ Helper: Get version for specific period
  async getVersionForPeriod(month, year) {
    const targetDate = new Date(year, month)
    const now = new Date()

    // If target period is in the past, find the version that was active at end of that month
    if (targetDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
      const periodEnd = new Date(year, month + 1, 0) // Last day of target month

      try {
        const { data, error } = await supabase
          .from('data_versions')
          .select('*')
          .lte('snapshot_date', periodEnd)
          .order('snapshot_date', { ascending: false })
          .limit(1)

        if (error) throw error
        return data?.[0]?.version_id || null
      } catch (error) {
        console.warn('[Log Aktivitas API] getVersionForPeriod failed, using latest version:', error.message)
        return null
      }
    }

    // For current month, use latest version (null = latest)
    return null
  },

  // ✅ Helper: Get data for specific version
  async getDataForVersion(table, versionId = null) {
    let query = supabase.from(table).select('*')

    if (versionId) {
      query = query.eq('version_id', versionId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  // ✅ Helper: Process monthly kalibrasi data
  processMonthlyData(month, index, year, kalibrasiData, alatData, allLogData) {
    const monthShort = month.substring(0, 3).toLowerCase()
    const isPast = isPastPeriod(index, year)

    // Build maps
    const statusMap = {}
    ;(alatData || []).forEach(d => { statusMap[d.no_id] = d.status })

    const lastExecMap = {}
    ;(allLogData || []).filter(l => l.jenis === 'Kalibrasi').forEach(l => {
      if (l.calibration_id && !lastExecMap[l.calibration_id]) {
        lastExecMap[l.calibration_id] = l.execute_date
      }
    })

    const parseIntervalMonths = (intField) => {
      if (!intField) return 12
      const str = String(intField).trim().toLowerCase()
      const m1 = str.match(/^(\d+)\s*year/); if (m1) return parseInt(m1[1]) * 12
      const m2 = str.match(/^(\d+)\s*month/); if (m2) return parseInt(m2[1])
      if (str.includes('year')) return 12
      const num = parseInt(str); if (!isNaN(num) && num > 0) return num
      return 12
    }

    // Filter valid items untuk bulan ini
    const validItems = (kalibrasiData || []).filter(item => {
      if (!item.due_date || !item.due_date.toLowerCase().includes(monthShort)) return false
      if (statusMap[item.no_id] === 'obsolete') return false

      const intervalMonths = parseIntervalMonths(item.int)
      if (intervalMonths <= 12) return true // Yearly: selalu tampil

      // Multi-yearly logic
      const intervalYears = Math.round(intervalMonths / 12)
      const lastExec = lastExecMap[item.calibration_id]

      if (!lastExec) return true // Belum pernah: tampil

      const lastYear = new Date(lastExec).getFullYear()
      const yearsDiff = year - lastYear

      return yearsDiff > 0 && yearsDiff % intervalYears === 0
    })

    // ✅ FIX: executed hanya hitung log yang calibration_id-nya ada di validItems
    const executed = (allLogData || []).filter(item => {
      if (item.jenis !== 'Kalibrasi' || !item.execute_date) return false
      try {
        const executeDate = new Date(item.execute_date)
        if (executeDate.getMonth() !== index || executeDate.getFullYear() !== year) return false

        // ✅ Hanya hitung jika calibration_id match dengan validItems
        return validItems.some(v => v.calibration_id === item.calibration_id || v.no_id === item.no_id)
      } catch (e) {
        return false
      }
    }).length

    const count = isPast ? executed : validItems.length
    const executedPercentage = count > 0 ? Math.min(100, Math.round((executed / count) * 100)) : 0

    return { month, count, executed, executedPercentage }
  },

  // ✅ Helper: Process monthly PM data
  processPMMonthlyData(month, index, year, alatData, allLogData) {
    const monthShort = month.substring(0, 3).toLowerCase()
    const isPastPeriodCheck = isPastPeriod(index, year)

    // Filter equipment dengan jadwal PM untuk bulan ini
    const monthData = (alatData || []).filter(item => {
      if (item.pm_yn !== 'Y') return false
      if (item.status === 'obsolete') return false
      if (item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-') {
        if (item['6_monthly'].toLowerCase().includes(monthShort)) return true
      }
      if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-') {
        if (item.yearly.toLowerCase().includes(monthShort)) return true
      }
      return false
    })

    // ✅ FIX: Hitung executed HANYA untuk equipment yang ada di monthData
    const executed = (allLogData || []).filter(item => {
      if (item.jenis !== 'PM' || !item.execute_date) return false
      try {
        const executeDate = new Date(item.execute_date)
        if (executeDate.getMonth() !== index || executeDate.getFullYear() !== year) return false

        // ✅ Hanya hitung jika no_id ada di monthData (equipment yang dijadwalkan)
        return monthData.some(eq => eq.no_id === item.no_id)
      } catch (e) {
        return false
      }
    }).length

    const count = isPastPeriodCheck ? executed : monthData.length
    const executedPercentage = count > 0 ? Math.min(100, Math.round((executed / count) * 100)) : 0

    return {
      month,
      count,
      executed,
      executedPercentage
    }
  },

  async getKalibrasiForPeriod(month, year) {
    try {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      const { data: kalibrasiData, error: kalibrasiError } = await supabase.from('kalibrasi').select('*').order('no_id', { ascending: true })
      if (kalibrasiError) throw kalibrasiError

      // ✅ FIX: Fetch logData dulu sebelum filter
      const { data: logData, error: logError } = await supabase.from('logaktivitas').select('*').eq('jenis', 'Kalibrasi').gte('execute_date', `${year}-${monthNum}-01`).lte('execute_date', `${year}-${monthNum}-31`)
      if (logError) throw logError

      const { data: alatStatusData } = await supabase.from('daftaralat').select('no_id, status, created_at, updated_at, created_by, updated_by')
      const alatMap = {}
      const alatStatusMap = {}
      ;(alatStatusData || []).forEach(d => {
        alatStatusMap[d.no_id] = d.status
        alatMap[d.no_id] = d
      })

      const now = new Date()
      const selectedDate = new Date(parseInt(year), monthIndex + 1, 0)
      const isPastPeriod = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)

      const parseIntervalMonths = (intField) => {
        if (!intField) return 12
        const str = String(intField).trim().toLowerCase()
        const multiYearMatch = str.match(/^(\d+)\s*year/)
        if (multiYearMatch) return parseInt(multiYearMatch[1]) * 12
        const multiMonthMatch = str.match(/^(\d+)\s*month/)
        if (multiMonthMatch) return parseInt(multiMonthMatch[1])
        if (str.includes('year')) return 12
        const num = parseInt(str)
        if (!isNaN(num) && num > 0) return num
        return 12
      }

      const monthShort = month.substring(0, 3).toLowerCase()
      const selectedYear_int = parseInt(year)

      const { data: allKalLog } = await supabase.from('logaktivitas').select('calibration_id, execute_date').eq('jenis', 'Kalibrasi').order('execute_date', { ascending: false })
      const lastExecMap = {}
      ;(allKalLog || []).forEach(l => {
        if (l.calibration_id && !lastExecMap[l.calibration_id]) lastExecMap[l.calibration_id] = l.execute_date
      })

      const filtered = (kalibrasiData || []).filter(item => {
        if (alatStatusMap[item.no_id] === 'obsolete') return false
        if (!item.due_date) return false
        if (!item.due_date.toLowerCase().includes(monthShort)) return false

        const intervalMonths = parseIntervalMonths(item.int)
        if (intervalMonths <= 12) return true

        const hasLogThisPeriod = (logData || []).some(l => 
          l.calibration_id === item.calibration_id && l.jenis === 'Kalibrasi' && l.execute_date && l.execute_date.includes(`${year}-${monthNum}`)
        )
        if (hasLogThisPeriod) return true

        const intervalYears = Math.round(intervalMonths / 12)
        const lastExec = lastExecMap[item.calibration_id]
        if (!lastExec) return true

        const lastYear = new Date(lastExec).getFullYear()
        const yearsDiff = selectedYear_int - lastYear
        return yearsDiff >= intervalYears && yearsDiff % intervalYears === 0
      })

      const { data: kalibrasiAudit, error: kalError } = await supabase.from('kalibrasi').select('no_id, calibration_id, created_at, updated_at, created_by, updated_by')
      let kalibrasiAuditMap = {}
      if (!kalError) {
        ;(kalibrasiAudit || []).forEach(kal => { kalibrasiAuditMap[kal.calibration_id] = kal })
      }

      const result = filtered.map(item => {
        const log = (logData || []).find(l => l.calibration_id === item.calibration_id) || (item.calibration_id ? null : (logData || []).find(l => l.no_id === item.no_id))
        const kalibrasiAudit = item.calibration_id ? kalibrasiAuditMap[item.calibration_id] : null
        const alatAudit = alatMap[item.no_id] || {}

        return {
          'No.ID': item.no_id,
          'Description': item.description,
          'Calibration Id.': item.calibration_id,
          'Parameter': item.parameter,
          'Process Range': fixEncoding(item.process_range), // ✅ Menggunakan helper aman
          'Reject Error Limit': fixEncoding(item.reject_error_limit), // ✅ Menggunakan helper aman
          'Due Date': item.due_date,
          'Remark': item.remark,
          'Criticality': item.criticality,
          'pic': log?.pic || null,
          'execute_date': log?.execute_date || null,
          'ket': log?.keterangan || null,
          'log_no': log?.no || null,
          'status': log ? 'Selesai' : 'Belum',
          'equipment_status': alatStatusMap[item.no_id] || 'active',
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

      return { success: true, data: result }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getKalibrasiForPeriod:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  async getPMForPeriod(month, year) {
    try {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = months.indexOf(month)
      const monthNum = String(monthIndex + 1).padStart(2, '0')

      const { data: alatData, error: alatError } = await supabase
        .from('daftaralat')
        .select('*')
        .eq('pm_yn', 'Y')
        .or('status.is.null,status.neq.obsolete')
        .order('no_id', { ascending: true })
      if (alatError) throw alatError

      const now = new Date()
      const selectedDate = new Date(parseInt(year), monthIndex + 1, 0)
      const isPastPeriod = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1)
      const monthShort = month.substring(0, 3).toLowerCase()

      const filtered = (alatData || []).filter(item => {
        if (item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-') {
          if (item['6_monthly'].toLowerCase().includes(monthShort)) return true
        }
        if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-') {
          if (item.yearly.toLowerCase().includes(monthShort)) return true
        }
        return false
      })

      const { data: logData, error: logError } = await supabase.from('logaktivitas').select('*').eq('jenis', 'PM').gte('execute_date', `${year}-${monthNum}-01`).lte('execute_date', `${year}-${monthNum}-31`)
      if (logError) throw logError

      const result = filtered.map(item => {
        const log = (logData || []).find(l => l.no_id === item.no_id)
        let pmInterval = '-'
        let dueDate = '-'

        if (item.yearly && item.yearly !== 'NA' && item.yearly !== '-' && item.yearly.trim() !== '') {
          if (item.yearly.toLowerCase().includes(monthShort)) { pmInterval = '12'; dueDate = item.yearly }
        }
        if (pmInterval === '-' && item['6_monthly'] && item['6_monthly'] !== 'NA' && item['6_monthly'] !== '-' && item['6_monthly'].trim() !== '') {
          if (item['6_monthly'].toLowerCase().includes(monthShort)) { pmInterval = '6'; dueDate = item['6_monthly'] }
        }

        return {
          'No.ID': item.no_id,
          'Description': item.description,
          'Type/Model': item.type_model,
          'SN': item.sn,
          'Location': item.location,
          'Schedule': item.schedule,
          'pm_interval': pmInterval,
          'Due Date': dueDate,
          'pic': log?.pic || null,
          'execute_date': log?.execute_date || null,
          'ket': log?.keterangan || null,
          'log_no': log?.no || null,
          'status': log ? 'Selesai' : 'Belum',
          'equipment_status': item.status || 'active',
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

      return { success: true, data: result }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getPMForPeriod:', error)
      return { success: false, data: [], error: error.message }
    }
  },

  async getAllForPeriod(month, year) {
    try {
      const [kalibrasi, pm] = await Promise.all([this.getKalibrasiForPeriod(month, year), this.getPMForPeriod(month, year)])
      return { success: true, data: [...(kalibrasi.data || []), ...(pm.data || [])] }
    } catch (error) {
      console.error('[Log Aktivitas API] Error getAllForPeriod:', error)
      return { success: false, data: [] }
    }
  },

  async listLogs() {
    try {
      const { data, error } = await supabase.from('logaktivitas').select('*').order('no', { ascending: false })
      if (error) throw error

      const { data: kalibrasiData } = await supabase.from('kalibrasi').select('no_id, description')
      const { data: alatData } = await supabase.from('daftaralat').select('no_id, description, type_model, sn, status')

      const mappedData = (data || []).map(item => {
        let description = '-'
        let type_model = '-'
        let sn = '-'

        if (item.jenis === 'Kalibrasi') {
          const kalibrasi = (kalibrasiData || []).find(k => k.no_id === item.no_id)
          if (kalibrasi) description = kalibrasi.description || '-'
        } else if (item.jenis === 'PM') {
          const alat = (alatData || []).find(a => a.no_id === item.no_id)
          if (alat) { description = alat.description || '-'; type_model = alat.type_model || '-'; sn = alat.sn || '-' }
        }

        const alat = (alatData || []).find(a => a.no_id === item.no_id)
        const equipmentStatus = alat?.status || 'active'

        return {
          no: item.no,
          no_id: item.no_id,
          cal_id: item.calibration_id,
          jenis: item.jenis,
          tanggal: item.execute_date,
          petugas: item.pic,
          keterangan: fixEncoding(item.keterangan), // ✅ Menggunakan helper aman
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

  async updateBacklog(no, backlog_status, backlog_notes, updatedBy = null) {
    try {
      const { data: current } = await supabase.from('logaktivitas').select('*').eq('no', no).single()
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
      try { updateData.backlog_history = existingHistory } catch (e) { /* skip */ }

      const { data, error } = await supabase.from('logaktivitas').update(updateData).eq('no', no).select().single()
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  async getPendingBacklogs() {
    try {
      const { data, error } = await supabase.from('logaktivitas').select('*').eq('backlog_status', 'pending').order('execute_date', { ascending: false })
      if (error) throw error
      const { data: alatData } = await supabase.from('daftaralat').select('no_id, description, status')
      return (data || []).map(item => {
        const alat = (alatData || []).find(a => a.no_id === item.no_id)
        return {
          no: item.no, no_id: item.no_id, cal_id: item.calibration_id, jenis: item.jenis,
          tanggal: item.execute_date, petugas: item.pic, keterangan: item.keterangan,
          backlog_status: item.backlog_status, backlog_notes: item.backlog_notes,
          description: alat?.description || '-', equipment_status: alat?.status || 'active'
        }
      })
    } catch (error) {
      console.error('[Log Aktivitas API] Error getPendingBacklogs:', error)
      return []
    }
  },

  async createLog(log) { return this.create(log) },
  async updateLog(log) { return this.update(log.no || log.log_no, log) }
}