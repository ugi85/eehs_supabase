// src/api/supabase/logAktivitasApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Helper: Determine if a period is in the past
 * ✅ ENHANCED: With detailed logging for debugging
 */
function isPastPeriod(month, year) {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11
  const currentYear = now.getFullYear()
  
  // ✅ FIX: Simplified logic - compare month/year directly
  const isPast = (year < currentYear) || (year === currentYear && month < currentMonth)
  
  console.log(`[isPastPeriod] Checking: month=${month}, year=${year}, current=${currentMonth}/${currentYear}`)
  console.log(`  -> ${isPast ? 'Past' : 'Current/Future'} (month ${month} ${month < currentMonth ? '<' : '>='} ${currentMonth})`)
  
  return isPast
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
   * GET: Total Schedules (untuk dashboard) - OPTIMIZED VERSION (No Versioning)
   * Fetch data ONCE and reuse for all 12 months instead of 36 queries
   */
  async getTotalSchedules(year = new Date().getFullYear()) {
    try {
      console.log(`[API] getTotalSchedules called for year: ${year}`)

      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

      // ✅ CRITICAL FIX V2: Manual pagination to fetch ALL data
      // Supabase .range() might not work, so we implement proper pagination
      
      const fetchAllRows = async (tableName) => {
        const pageSize = 1000
        let allData = []
        let page = 0
        let hasMore = true
        
        while (hasMore) {
          const start = page * pageSize
          const end = start + pageSize - 1
          
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(start, end)
          
          if (error) throw error
          
          if (data && data.length > 0) {
            allData = [...allData, ...data]
            console.log(`[Fetch] ${tableName}: page ${page + 1}, fetched ${data.length} rows, total so far: ${allData.length}`)
            
            if (data.length < pageSize) {
              hasMore = false // Last page
            } else {
              page++
            }
          } else {
            hasMore = false
          }
        }
        
        console.log(`[Fetch] ${tableName}: COMPLETE - ${allData.length} total rows`)
        return allData
      }
      
      // Fetch all data with pagination
      const [kalibrasiData, alatData, allLogData] = await Promise.all([
        fetchAllRows('kalibrasi'),
        fetchAllRows('daftaralat'),
        fetchAllRows('logaktivitas')
      ])

      console.log('[API] Data fetched:', { 
        kalibrasi: kalibrasiData.length, 
        alat: alatData.length, 
        logs: allLogData.length,
        timestamp: new Date().toISOString(),
        codeVersion: 'v3.0-SUPABASE-LIMIT-FIX',  // ← Critical fix version
        // ✅ PM specific check
        pmLogs: allLogData.filter(l => l.jenis === 'PM').length,
        pmLogsAugust2026: allLogData.filter(l => {
          if (l.jenis !== 'PM') return false
          try {
            const d = new Date(l.execute_date)
            return d.getMonth() === 7 && d.getFullYear() === 2026
          } catch {
            return false
          }
        }).length,
        // Sample 5 PM logs
        sample5PM: allLogData.filter(l => l.jenis === 'PM').slice(0, 5).map(l => ({
          no: l.no,
          execute_date: l.execute_date,
          date_as_string: String(l.execute_date),
          parsed_month: new Date(l.execute_date).getMonth(),
          parsed_year: new Date(l.execute_date).getFullYear()
        }))
      })

      // ✅ Process each month using the SAME fetched data (reuse, not refetch)
      const kalibrasiMonthly = months.map((month, index) => {
        return this.processMonthlyData(month, index, parseInt(year), kalibrasiData, alatData, allLogData)
      })

      const pmMonthly = months.map((month, index) => {
        return this.processPMMonthlyData(month, index, parseInt(year), alatData, allLogData)
      })

      // ✅ DEBUG: August-specific logging
      const augustKal = kalibrasiMonthly.find(m => m.month === 'August')
      const augustPM = pmMonthly.find(m => m.month === 'August')
      
      console.log('[API] August Kalibrasi Debug:', {
        totalScheduled: kalibrasiData.length,
        totalLogsAllMonths: allLogData.filter(l => l.jenis === 'Kalibrasi').length,
        logsInAugust: allLogData.filter(l => {
          if (l.jenis !== 'Kalibrasi' || !l.execute_date) return false
          const dateStr = String(l.execute_date)
          return dateStr.includes('2026-08') || (new Date(l.execute_date).getMonth() === 7 && new Date(l.execute_date).getFullYear() === 2026)
        }).length,
        executed: augustKal?.executed || 0,
        count: augustKal?.count || 0,
        percentage: augustKal?.executedPercentage || 0
      })

      // ✅ TEMPORARY WORKAROUND: Count ALL PM logs that have execute_date in 2026
      // This will help us understand if the issue is date filtering or data issue
      const allPM2026 = (allLogData || []).filter(l => {
        if (l.jenis !== 'PM' || !l.execute_date) return false
        try {
          const dateStr = String(l.execute_date)
          return dateStr.includes('2026') || new Date(l.execute_date).getFullYear() === 2026
        } catch {
          return false
        }
      })

      console.log('[API] August PM Debug:', {
        totalAlatWithPM: alatData.filter(a => a.pm_yn === 'Y').length,
        totalPMLogsAllMonths: allLogData.filter(l => l.jenis === 'PM').length,
        totalPM2026: allPM2026.length,  // ← ALL 2026 PM logs
        logsInAugust: allLogData.filter(l => {
          if (l.jenis !== 'PM' || !l.execute_date) return false
          const dateStr = String(l.execute_date)
          return dateStr.includes('2026-08') || (new Date(l.execute_date).getMonth() === 7 && new Date(l.execute_date).getFullYear() === 2026)
        }).length,
        executed: augustPM?.executed || 0,
        count: augustPM?.count || 0,
        percentage: augustPM?.executedPercentage || 0,
        fullAugustPMData: augustPM,
        // ✅ SAMPLE: First 10 PM logs from 2026
        samplePM2026: allPM2026.slice(0, 10).map(l => ({
          no: l.no,
          execute_date: l.execute_date,
          dateStr: String(l.execute_date),
          month: new Date(l.execute_date).getMonth(),
          is_august: new Date(l.execute_date).getMonth() === 7
        }))
      })

      const result = {
        success: true,
        totalKalibrasi: kalibrasiMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
        totalPM: pmMonthly.reduce((sum, m) => sum + (m.count || 0), 0),
        kalibrasiMonthly,
        pmMonthly
      }

      console.log('[API] getTotalSchedules summary:', {
        totalKalibrasi: result.totalKalibrasi,
        totalPM: result.totalPM,
        augustKal: { executed: augustKal?.executed, count: augustKal?.count, pct: augustKal?.executedPercentage },
        augustPM: { executed: augustPM?.executed, count: augustPM?.count, pct: augustPM?.executedPercentage }
      })

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

    // ✅ Hitung SEMUA log aktivitas kalibrasi di bulan ini
    // FIX: Use string matching as primary method, Date parsing as fallback
    const monthNum = String(index + 1).padStart(2, '0') // '08' for August
    const yearStr = String(year) // '2026'
    
    const allKalibrasiLogsThisMonth = (allLogData || []).filter(item => {
      if (item.jenis !== 'Kalibrasi' || !item.execute_date) return false
      try {
        const dateStr = String(item.execute_date)
        
        // Method 1: String matching for YYYY-MM-DD format (most reliable)
        if (dateStr.includes(`${yearStr}-${monthNum}`)) {
          return true
        }
        
        // Method 2: Date parsing fallback for other formats
        const executeDate = new Date(item.execute_date)
        if (!isNaN(executeDate.getTime())) {
          return executeDate.getMonth() === index && executeDate.getFullYear() === year
        }
        
        return false
      } catch (e) {
        return false
      }
    })
    
    const executed = allKalibrasiLogsThisMonth.length

    // ✅ LOGIC UNTUK COUNT:
    // - Jika bulan sudah lewat (past period): count = executed (show REAL activity)
    // - Jika bulan ini atau masa depan: count = validItems (show SCHEDULED activity)
    // - SAFETY: count tidak boleh lebih kecil dari executed (untuk menghindari over 100%)
    let count = isPast ? executed : validItems.length
    count = Math.max(count, executed) // ✅ FIX: Pastikan count >= executed
    const executedPercentage = count > 0 ? Math.min(100, Math.round((executed / count) * 100)) : 0

    // ✅ DEBUG: Detailed logging untuk August
    if (month === 'August') {
      console.log(`[processMonthlyData] August Kalibrasi Details:`, {
        monthShort,
        index,
        year,
        isPast,
        validItemsCount: validItems.length,
        totalLogsThisMonth: allKalibrasiLogsThisMonth.length,
        executed,
        count,  // ← This is the KEY value!
        executedPercentage,
        logic: isPast ? 'count=executed (PAST)' : 'count=validItems (CURRENT/FUTURE)',
        sampleSchedule: validItems.slice(0, 3).map(v => ({
          no_id: v.no_id,
          cal_id: v.calibration_id,
          due: v.due_date
        })),
        sampleLogs: allKalibrasiLogsThisMonth.slice(0, 3).map(l => ({
          no_id: l.no_id,
          cal_id: l.calibration_id,
          date: l.execute_date
        }))
      })
    }

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

    // ✅ FIX CRITICAL: Hitung SEMUA log aktivitas PM di bulan ini
    // Multiple fallback methods to catch ALL date formats
    const monthNum = String(index + 1).padStart(2, '0') // '08' for August
    const yearStr = String(year) // '2026'
    
    const allPMLogsThisMonth = (allLogData || []).filter(item => {
      if (item.jenis !== 'PM') return false
      if (!item.execute_date) {
        console.warn('[PM Filter] Missing execute_date for log:', item.no)
        return false
      }
      
      try {
        const dateStr = String(item.execute_date).trim()
        
        // ✅ ULTRA-AGGRESSIVE MATCHING - Try EVERYTHING
        
        // Test 1: Direct string includes (most common)
        if (dateStr.includes(`${yearStr}-${monthNum}`)) {
          return true
        }
        
        // Test 2: Alternative separators
        if (dateStr.includes(`${yearStr}/${monthNum}`) || 
            dateStr.includes(`${yearStr}.${monthNum}`)) {
          return true
        }
        
        // Test 3: Regex pattern
        const dateRegex = new RegExp(`${yearStr}[-/.\\s]${monthNum}[-/.\\s]`)
        if (dateRegex.test(dateStr)) {
          return true
        }
        
        // Test 4: Reverse order check (DD-MM-YYYY or MM-DD-YYYY)
        if (dateStr.includes(`${monthNum}-${yearStr}`) || 
            dateStr.includes(`${monthNum}/${yearStr}`)) {
          return true
        }
        
        // Test 5: Date object parsing (last resort)
        try {
          const executeDate = new Date(item.execute_date)
          if (!isNaN(executeDate.getTime())) {
            const parsedMonth = executeDate.getMonth()  // 0-11
            const parsedYear = executeDate.getFullYear()
            
            if (parsedMonth === index && parsedYear === year) {
              return true
            }
          }
        } catch (dateError) {
          console.warn('[PM Filter] Date parse failed:', item.no, item.execute_date)
        }
        
        return false
      } catch (e) {
        console.error('[PM Filter] Unexpected error:', e, item)
        return false
      }
    })
    
    const executed = allPMLogsThisMonth.length
    
    // ✅ CRITICAL DEBUG: Manual check EVERY single PM log for August
    if (month === 'August') {
      const allPMLogs = (allLogData || []).filter(l => l.jenis === 'PM')
      
      console.log('='.repeat(80))
      console.log('[PM DEEP DEBUG] Analyzing ALL PM logs...')
      console.log('='.repeat(80))
      
      // Check each PM log individually
      const augustPMManualCheck = allPMLogs.map((log, idx) => {
        const dateStr = String(log.execute_date || '').trim()
        let dateObj
        try {
          dateObj = new Date(log.execute_date)
        } catch (e) {
          dateObj = null
        }
        
        const checks = {
          no: log.no,
          no_id: log.no_id,
          execute_date_raw: log.execute_date,
          execute_date_string: dateStr,
          string_length: dateStr.length,
          // Test all possible matches
          test_includes_2026_08: dateStr.includes('2026-08'),
          test_includes_08_2026: dateStr.includes('08-2026'),
          test_includes_082026: dateStr.includes('082026'),
          test_startswith_2026: dateStr.startsWith('2026'),
          test_date_parse_month: dateObj ? dateObj.getMonth() : 'PARSE_FAIL',
          test_date_parse_year: dateObj ? dateObj.getFullYear() : 'PARSE_FAIL',
          is_august_2026: (dateObj && dateObj.getMonth() === 7 && dateObj.getFullYear() === 2026),
          // Final verdict
          would_match: dateStr.includes('2026-08') || (dateObj && dateObj.getMonth() === 7 && dateObj.getFullYear() === 2026)
        }
        
        // Only log first 20 for readability
        if (idx < 20) {
          console.log(`PM Log #${idx + 1}:`, checks)
        }
        
        return checks
      })
      
      const augustMatches = augustPMManualCheck.filter(c => c.is_august_2026)
      const totalPM = allPMLogs.length
      
      console.log('='.repeat(80))
      console.log(`[PM SUMMARY] Total PM logs in dataset: ${totalPM}`)
      console.log(`[PM SUMMARY] PM logs that are August 2026: ${augustMatches.length}`)
      console.log(`[PM SUMMARY] PM logs detected by filter: ${allPMLogsThisMonth.length}`)
      console.log(`[PM SUMMARY] MISSING: ${augustMatches.length - allPMLogsThisMonth.length}`)
      console.log('='.repeat(80))
      
      if (augustMatches.length > allPMLogsThisMonth.length) {
        const missing = augustMatches.filter(m => 
          !allPMLogsThisMonth.some(detected => detected.no === m.no)
        )
        console.error('[PM CRITICAL] Missing PM logs:')
        missing.slice(0, 10).forEach(m => {
          console.error('  Missing:', m)
        })
      }
    }

    // ✅ DEBUG: Detailed logging untuk August
    if (month === 'August') {
      // Sample 10 PM logs dari semua data untuk check format
      const allPMLogs = (allLogData || []).filter(l => l.jenis === 'PM')
      
      // Test date filtering untuk semua PM logs
      const testResults = allPMLogs.slice(0, 20).map(l => {
        const dateStr = String(l.execute_date)
        const monthNum = '08'
        const yearStr = '2026'
        
        return {
          no: l.no,
          execute_date: l.execute_date,
          dateStr: dateStr,
          // Test 1: Simple includes
          test1_includes: dateStr.includes(`${yearStr}-${monthNum}`),
          // Test 2: Regex
          test2_regex: new RegExp(`${yearStr}[-/]${monthNum}[-/]`).test(dateStr),
          // Test 3: Date parse
          test3_month: new Date(l.execute_date).getMonth(),
          test3_year: new Date(l.execute_date).getFullYear(),
          test3_match: new Date(l.execute_date).getMonth() === 7 && new Date(l.execute_date).getFullYear() === 2026
        }
      })

      console.log(`[processPMMonthlyData] August PM Details:`, {
        monthShort,
        index,
        year,
        isPast: isPastPeriodCheck,
        totalAlatWithPM: alatData?.filter(d => d.pm_yn === 'Y')?.length || 0,
        scheduledThisMonth: monthData.length,
        totalPMLogsAllData: allPMLogs.length,
        totalLogsThisMonth: allPMLogsThisMonth.length,
        executed,
        testResults,  // ← Detailed test results
        sampleSchedule: monthData.slice(0, 3).map(eq => ({
          no_id: eq.no_id,
          pm_yn: eq.pm_yn,
          '6_monthly': eq['6_monthly'],
          yearly: eq.yearly
        })),
        sampleFilteredLogs: allPMLogsThisMonth.slice(0, 10).map(l => ({
          no: l.no,
          no_id: l.no_id,
          date: l.execute_date
        }))
      })
    }

    // ✅ LOGIC UNTUK COUNT (sama seperti Kalibrasi):
    // - Jika bulan sudah lewat (past): count = executed (tampilkan aktivitas REAL)
    // - Jika bulan sekarang/future: count = monthData.length (tampilkan JADWAL)
    // - SAFETY: count tidak boleh lebih kecil dari executed (untuk menghindari over 100%)
    let count = isPastPeriodCheck ? executed : monthData.length
    count = Math.max(count, executed) // ✅ FIX: Pastikan count >= executed
    const executedPercentage = count > 0 ? Math.min(100, Math.round((executed / count) * 100)) : 0

    // ✅ DEBUG: Final calculation for August
    if (month === 'August') {
      console.log(`[processPMMonthlyData] August FINAL:`, {
        count,
        executed,
        executedPercentage,
        logic: isPastPeriodCheck ? 'count=executed (PAST)' : 'count=monthData (CURRENT/FUTURE)'
      })
    }

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