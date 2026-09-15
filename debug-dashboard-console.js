/**
 * ============================================================
 * Debug Script: Dashboard Kalibrasi Count Mismatch
 * ============================================================
 * Purpose: Run this in browser console to debug dashboard counts
 * Usage: 
 *   1. Open Dashboard page
 *   2. Open browser console (F12)
 *   3. Copy-paste this entire script
 *   4. Press Enter
 * ============================================================
 */

(async function debugDashboardCounts() {
  console.log('🔍 Starting Dashboard Debug...')
  console.log('=' .repeat(80))
  
  // Helper: Format number
  const fmt = (n) => n?.toLocaleString() || '0'
  
  try {
    // ============================================================
    // 1. CHECK CACHED DATA
    // ============================================================
    console.log('\n📦 STEP 1: Check Cached Data')
    console.log('-'.repeat(80))
    
    const cacheKey = 'dashboard_data_cache'
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached)
        console.log('✅ Cache found:', {
          age_minutes: ((Date.now() - parsedCache.timestamp) / 60000).toFixed(1),
          totalKalibrasi: parsedCache.totalKalibrasi,
          totalPM: parsedCache.totalPM,
          year: parsedCache.year,
          kalibrasiMonthly: parsedCache.kalibrasiMonthly?.length,
          pmMonthly: parsedCache.pmMonthly?.length
        })
        
        // Show monthly breakdown
        if (parsedCache.kalibrasiMonthly) {
          console.table(parsedCache.kalibrasiMonthly.map(m => ({
            Month: m.month,
            Scheduled: m.count,
            Executed: m.executed,
            'Percentage': `${m.executedPercentage}%`
          })))
        }
      } catch (e) {
        console.error('❌ Cache corrupted:', e)
      }
    } else {
      console.log('⚠️ No cache found - data will be fetched from API')
    }
    
    
    // ============================================================
    // 2. FETCH FRESH DATA FROM API
    // ============================================================
    console.log('\n🔄 STEP 2: Fetch Fresh Data from API')
    console.log('-'.repeat(80))
    
    // Import Supabase client
    const { supabase } = await import('/src/config/supabase.js')
    
    // Fetch kalibrasi data
    console.log('Fetching kalibrasi schedules...')
    const { data: kalibrasiData, error: kalError } = await supabase
      .from('kalibrasi')
      .select('*')
    
    if (kalError) {
      console.error('❌ Error fetching kalibrasi:', kalError)
      return
    }
    
    // Fetch daftaralat data
    console.log('Fetching equipment data...')
    const { data: alatData, error: alatError } = await supabase
      .from('daftaralat')
      .select('*')
    
    if (alatError) {
      console.error('❌ Error fetching daftaralat:', alatError)
      return
    }
    
    // Fetch logs
    console.log('Fetching activity logs...')
    const { data: logData, error: logError } = await supabase
      .from('logaktivitas')
      .select('*')
      .eq('jenis', 'Kalibrasi')
    
    if (logError) {
      console.error('❌ Error fetching logs:', logError)
      return
    }
    
    console.log('✅ Data fetched:', {
      kalibrasi_total: fmt(kalibrasiData.length),
      equipment_total: fmt(alatData.length),
      logs_total: fmt(logData.length)
    })
    
    
    // ============================================================
    // 3. ANALYZE DATA
    // ============================================================
    console.log('\n📊 STEP 3: Analyze Data')
    console.log('-'.repeat(80))
    
    // Create status map
    const statusMap = {}
    alatData.forEach(d => {
      statusMap[d.no_id] = d.status
    })
    
    // Count by status
    const activeEquipment = alatData.filter(d => !d.status || d.status !== 'obsolete').length
    const obsoleteEquipment = alatData.filter(d => d.status === 'obsolete').length
    
    console.log('Equipment Status:', {
      active: fmt(activeEquipment),
      obsolete: fmt(obsoleteEquipment),
      total: fmt(alatData.length)
    })
    
    // Analyze kalibrasi by month
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const monthlyBreakdown = months.map(month => {
      const monthShort = month.substring(0, 3).toLowerCase()
      
      // Count schedules for this month
      const schedules = kalibrasiData.filter(item => {
        // Check if due date includes this month
        if (!item.due_date || !item.due_date.toLowerCase().includes(monthShort)) {
          return false
        }
        
        // Check if equipment is active
        if (statusMap[item.no_id] === 'obsolete') {
          return false
        }
        
        return true
      })
      
      // Count logs for this month (2026)
      const logs = logData.filter(log => {
        if (!log.execute_date) return false
        const dateStr = String(log.execute_date)
        const monthNum = String(months.indexOf(month) + 1).padStart(2, '0')
        return dateStr.includes(`2026-${monthNum}`)
      })
      
      return {
        month,
        scheduled: schedules.length,
        executed: logs.length,
        percentage: schedules.length > 0 
          ? Math.round((logs.length / schedules.length) * 100) 
          : 0
      }
    })
    
    console.log('\n📅 Monthly Breakdown:')
    console.table(monthlyBreakdown)
    
    // Calculate totals
    const totalScheduled = monthlyBreakdown.reduce((sum, m) => sum + m.scheduled, 0)
    const totalExecuted = monthlyBreakdown.reduce((sum, m) => sum + m.executed, 0)
    
    console.log('\n📈 Totals:', {
      total_scheduled: fmt(totalScheduled),
      total_executed: fmt(totalExecuted),
      percentage: totalScheduled > 0 
        ? `${Math.round((totalExecuted / totalScheduled) * 100)}%` 
        : '0%'
    })
    
    
    // ============================================================
    // 4. CHECK FOR ISSUES
    // ============================================================
    console.log('\n🔍 STEP 4: Check for Common Issues')
    console.log('-'.repeat(80))
    
    // Issue 1: Duplicate calibration IDs
    const calIdMap = new Map()
    kalibrasiData.forEach(item => {
      if (!item.calibration_id) return
      if (!calIdMap.has(item.calibration_id)) {
        calIdMap.set(item.calibration_id, [])
      }
      calIdMap.get(item.calibration_id).push(item)
    })
    
    const duplicates = []
    calIdMap.forEach((items, calId) => {
      if (items.length > 1) {
        duplicates.push({
          calibration_id: calId,
          count: items.length,
          no_ids: items.map(i => i.no_id).join(', ')
        })
      }
    })
    
    if (duplicates.length > 0) {
      console.warn('⚠️ Found duplicate calibration IDs:', duplicates.length)
      console.table(duplicates.slice(0, 10))
    } else {
      console.log('✅ No duplicate calibration IDs found')
    }
    
    // Issue 2: Unique calibration count vs sum of monthly
    const uniqueCalibrations = new Set(
      kalibrasiData
        .filter(k => k.calibration_id && statusMap[k.no_id] !== 'obsolete')
        .map(k => k.calibration_id)
    )
    
    console.log('\n🔢 Count Comparison:', {
      unique_calibrations: fmt(uniqueCalibrations.size),
      sum_of_monthly: fmt(totalScheduled),
      difference: fmt(totalScheduled - uniqueCalibrations.size),
      status: totalScheduled === uniqueCalibrations.size 
        ? '✅ MATCH' 
        : totalScheduled > uniqueCalibrations.size
          ? '⚠️ OVER-COUNT (likely duplicate counting)'
          : '⚠️ UNDER-COUNT (some schedules missing)'
    })
    
    // Issue 3: Schedules appearing in multiple months
    const calMonthMap = new Map()
    kalibrasiData.forEach(item => {
      if (!item.calibration_id || statusMap[item.no_id] === 'obsolete') return
      
      months.forEach(month => {
        const monthShort = month.substring(0, 3).toLowerCase()
        if (item.due_date && item.due_date.toLowerCase().includes(monthShort)) {
          if (!calMonthMap.has(item.calibration_id)) {
            calMonthMap.set(item.calibration_id, new Set())
          }
          calMonthMap.get(item.calibration_id).add(month)
        }
      })
    })
    
    const multiMonthCals = []
    calMonthMap.forEach((monthSet, calId) => {
      if (monthSet.size > 1) {
        const item = kalibrasiData.find(k => k.calibration_id === calId)
        multiMonthCals.push({
          calibration_id: calId,
          months_count: monthSet.size,
          months: Array.from(monthSet).join(', '),
          due_date: item?.due_date || '-'
        })
      }
    })
    
    if (multiMonthCals.length > 0) {
      console.warn('⚠️ Calibrations scheduled in multiple months:', multiMonthCals.length)
      console.log('This is the ROOT CAUSE of over-counting!')
      console.table(multiMonthCals.slice(0, 10))
    } else {
      console.log('✅ No calibrations found in multiple months')
    }
    
    
    // ============================================================
    // 5. RECOMMENDATIONS
    // ============================================================
    console.log('\n💡 STEP 5: Recommendations')
    console.log('-'.repeat(80))
    
    if (totalScheduled > uniqueCalibrations.size) {
      console.log('🔴 ISSUE DETECTED: Dashboard is over-counting')
      console.log('')
      console.log('Root Cause:')
      console.log('  - Same calibration appears in multiple months')
      console.log('  - Dashboard sums all months (double/triple counting)')
      console.log('')
      console.log('Solutions:')
      console.log('  1. Use unique calibration count instead of sum')
      console.log('  2. Ensure each calibration appears in only ONE month per year')
      console.log('  3. For 6-monthly schedules, create separate calibration IDs')
      console.log('')
      console.log('Suggested Fix in getTotalSchedules():')
      console.log('  Instead of: totalKalibrasi = sum of all monthly counts')
      console.log('  Use: totalKalibrasi = count of unique calibration_ids')
    } else if (totalScheduled < uniqueCalibrations.size) {
      console.log('🟡 ISSUE DETECTED: Dashboard is under-counting')
      console.log('')
      console.log('Possible Causes:')
      console.log('  - Some calibrations have invalid due_date')
      console.log('  - Month parsing logic issue')
      console.log('')
      console.log('Check:')
      console.log('  - Run: kalibrasiData.filter(k => !k.due_date)')
      console.log('  - Verify month abbreviations in due_date field')
    } else {
      console.log('✅ Dashboard count is correct!')
      console.log('No issues detected.')
    }
    
    
    // ============================================================
    // 6. EXPORT DEBUG DATA
    // ============================================================
    console.log('\n💾 STEP 6: Export Debug Data')
    console.log('-'.repeat(80))
    
    window.__DEBUG_DATA__ = {
      kalibrasiData,
      alatData,
      logData,
      statusMap,
      monthlyBreakdown,
      uniqueCalibrations: Array.from(uniqueCalibrations),
      duplicates,
      multiMonthCals,
      summary: {
        unique_calibrations: uniqueCalibrations.size,
        sum_of_monthly: totalScheduled,
        difference: totalScheduled - uniqueCalibrations.size
      }
    }
    
    console.log('✅ Debug data exported to window.__DEBUG_DATA__')
    console.log('')
    console.log('You can now inspect:')
    console.log('  - window.__DEBUG_DATA__.kalibrasiData')
    console.log('  - window.__DEBUG_DATA__.monthlyBreakdown')
    console.log('  - window.__DEBUG_DATA__.multiMonthCals')
    console.log('  - window.__DEBUG_DATA__.summary')
    
  } catch (error) {
    console.error('❌ Error during debug:', error)
    console.error(error.stack)
  }
  
  console.log('')
  console.log('=' .repeat(80))
  console.log('🏁 Debug Complete!')
})()
