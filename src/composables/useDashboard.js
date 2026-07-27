// src/composables/useDashboard.js
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { logAktivitasApi } from '@/api'

// === KONFIGURASI CACHE ===
const CACHE_KEY = 'dashboard_data_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit
const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000 // 1 jam

export function useDashboard() {
  const loading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false)
  
  // State untuk data dashboard
  const totalEquipment = ref(0)
  const totalKalibrasi = ref(0)
  const totalPM = ref(0)
  const kalibrasiMonthly = ref([])
  const pmMonthly = ref([])
  const selectedYear = ref(new Date().getFullYear().toString())
  
  let refreshIntervalId = null

  // ✅ CHART DATA - REACTIVE KE DATA BULANAN
  const chartData = computed(() => {
    const labels = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    return {
      labels: labels.map(month => month.substring(0, 3)),
      datasets: [
        {
          label: 'Kalibrasi',
          data: labels.map(month => {
            const item = kalibrasiMonthly.value.find(m => m.month === month)
            return item ? (item.count || 0) : 0
          }),
          borderColor: '#4285F4',
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Preventive Maintenance',
          data: labels.map(month => {
            const item = pmMonthly.value.find(m => m.month === month)
            return item ? (item.count || 0) : 0
          }),
          borderColor: '#34A853',
          backgroundColor: 'rgba(52, 168, 83, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    }
  })

  // ✅ CHART OPTIONS
  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 13 } }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { stepSize: 1 }
      },
      x: { grid: { display: false } }
    }
  }))

  // ✅ FUNGSI: AMBIL DATA DARI CACHE
  const getFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const parsed = JSON.parse(cached)
      const now = Date.now()
      
      if (parsed && now - parsed.timestamp < CACHE_DURATION) {
        console.log('[Dashboard] Using cached data')
        return parsed
      }
      
      localStorage.removeItem(CACHE_KEY)
    } catch (e) {
      console.warn('Cache corrupted, clearing:', e)
      localStorage.removeItem(CACHE_KEY)
    }
    return null
  }

  // ✅ FUNGSI: SIMPAN KE CACHE
  const saveToCache = (data) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ...data, timestamp: Date.now() })
      )
    } catch (e) {
      console.warn('Failed to save cache:', e)
    }
  }

  // ✅ FETCH DENGAN CACHE + BACKGROUND UPDATE
  const fetchDashboardData = async (year = selectedYear.value, useCache = true) => {
    console.log(`[Dashboard] fetchDashboardData called: year=${year}, useCache=${useCache}`)
    
    if (useCache) {
      const cachedData = getFromCache()
      if (cachedData) {
        // Set state dari cache (INSTANT!)
        totalEquipment.value = cachedData.totalEquipment || 0
        totalKalibrasi.value = cachedData.totalKalibrasi || 0
        totalPM.value = cachedData.totalPM || 0
        kalibrasiMonthly.value = cachedData.kalibrasiMonthly || []
        pmMonthly.value = cachedData.pmMonthly || []
        selectedYear.value = cachedData.year || year
        
        // Update di background
        // setTimeout(() => {
        //   refreshDashboardData(year)
        // }, 100)
        
        isInitialized.value = true
        return
      }
    }
    
    // Fetch dari API jika tidak ada cache
    loading.value = true
    error.value = null
    
    try {
      const [equipmentData, schedulesData] = await Promise.all([
        logAktivitasApi.getTotalDaftarAlat(),
        logAktivitasApi.getTotalSchedules(year)
      ])
      
      console.log('[Dashboard] API response:', { equipmentData, schedulesData })

      if (equipmentData?.success === false) {
        throw new Error(equipmentData.error || 'Gagal memuat total peralatan')
      }
      if (schedulesData?.success === false) {
        throw new Error(schedulesData.error || 'Gagal memuat jadwal aktivitas')
      }
      
      totalEquipment.value = equipmentData?.total || 0
      totalKalibrasi.value = schedulesData?.totalKalibrasi || 0
      totalPM.value = schedulesData?.totalPM || 0
      kalibrasiMonthly.value = schedulesData?.kalibrasiMonthly || []
      pmMonthly.value = schedulesData?.pmMonthly || []
      selectedYear.value = year
      
      // Simpan ke cache
      saveToCache({
        totalEquipment: totalEquipment.value,
        totalKalibrasi: totalKalibrasi.value,
        totalPM: totalPM.value,
        kalibrasiMonthly: kalibrasiMonthly.value,
        pmMonthly: pmMonthly.value,
        year
      })
      
      isInitialized.value = true
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      error.value = err.message || 'Gagal memuat data dashboard'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ✅ REFRESH DATA TANPA CACHE (UNTUK BACKGROUND UPDATE)
  const refreshDashboardData = async (year = selectedYear.value) => {
    try {
      const [equipmentData, schedulesData] = await Promise.all([
        logAktivitasApi.getTotalDaftarAlat(),
        logAktivitasApi.getTotalSchedules(year)
      ])

      if (equipmentData?.success === false) {
        throw new Error(equipmentData.error || 'Gagal memuat total peralatan')
      }
      if (schedulesData?.success === false) {
        throw new Error(schedulesData.error || 'Gagal memuat jadwal aktivitas')
      }
      
      totalEquipment.value = equipmentData?.total || 0
      totalKalibrasi.value = schedulesData?.totalKalibrasi || 0
      totalPM.value = schedulesData?.totalPM || 0
      kalibrasiMonthly.value = schedulesData?.kalibrasiMonthly || []
      pmMonthly.value = schedulesData?.pmMonthly || []
      
      // Update cache
      saveToCache({
        totalEquipment: totalEquipment.value,
        totalKalibrasi: totalKalibrasi.value,
        totalPM: totalPM.value,
        kalibrasiMonthly: kalibrasiMonthly.value,
        pmMonthly: pmMonthly.value,
        year
      })
      
      console.log('[Dashboard] Background refresh completed')
    } catch (err) {
      console.warn('[Dashboard] Background refresh failed:', err.message)
    }
  }

  // ✅ AUTO REFRESH SETIAP 1 JAM
  const startAutoRefresh = () => {
    if (refreshIntervalId) return
    
     refreshIntervalId = setInterval(() => {
    // Hanya refresh jika tab aktif
    if (isInitialized.value && document.visibilityState === 'visible') {
      refreshDashboardData(selectedYear.value)
    }
    }, AUTO_REFRESH_INTERVAL)
  }

  // ✅ STOP AUTO REFRESH
  const stopAutoRefresh = () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId)
      refreshIntervalId = null
    }
  }

  // ✅ CLEANUP SAAT COMPOSABLE DIHAPUS
  onUnmounted(() => {
    stopAutoRefresh()
  })

  // ✅ LISTEN FOR DATA VERSION CHANGES
  onMounted(() => {
    const handleDataVersionChange = (event) => {
      console.log('[Dashboard] Data version changed, refreshing...', event.detail)
      // Force refresh without cache
      fetchDashboardData(selectedYear.value, false)
    }

    window.addEventListener('data-version-created', handleDataVersionChange)

    // Cleanup listener on unmount
    onUnmounted(() => {
      window.removeEventListener('data-version-created', handleDataVersionChange)
    })
  })

  // ✅ REFRESH DATA (MANUAL)
  const refreshData = () => {
    fetchDashboardData(selectedYear.value, false)
  }

  // ✅ GANTI TAHUN
  const changeYear = (year) => {
    selectedYear.value = year
    fetchDashboardData(year, false)
  }

  // ✅ BULAN SAAT INI
  const currentMonth = computed(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return monthNames[new Date().getMonth()]
  })

  // ✅ SISA JADWAL BULAN SAAT INI (TOTAL PM + KALIBRASI YANG BELUM DILAKSANAKAN)
  const currentMonthRemaining = computed(() => {
    const currentMonthName = currentMonth.value

    const kalibrasiItem = kalibrasiMonthly.value.find(m => m.month === currentMonthName)
    const pmItem = pmMonthly.value.find(m => m.month === currentMonthName)

    // Hitung sisa dengan Math.max(0, ...) agar tidak negatif
    const kalibrasiRemaining = kalibrasiItem 
      ? Math.max(0, (kalibrasiItem.count || 0) - (kalibrasiItem.executed || 0)) 
      : 0
    const pmRemaining = pmItem 
      ? Math.max(0, (pmItem.count || 0) - (pmItem.executed || 0)) 
      : 0

    // ✅ TOTAL: Sisa PM + Sisa Kalibrasi
    const total = kalibrasiRemaining + pmRemaining
    console.log(`[Dashboard] currentMonthRemaining: ${total} (PM: ${pmRemaining}, Kal: ${kalibrasiRemaining})`)
    
    return total
  })

  // ✅ STATISTIK BULAN SAAT INI (UNTUK PIE CHART)
  const currentMonthStats = computed(() => {
    const currentMonthName = currentMonth.value
    const kalibrasiItem = kalibrasiMonthly.value.find(m => m.month === currentMonthName)
    const pmItem = pmMonthly.value.find(m => m.month === currentMonthName)

    return {
      month: currentMonthName,
      kalibrasiCount: kalibrasiItem?.count || 0,
      kalibrasiExecuted: kalibrasiItem?.executed || 0,
      pmCount: pmItem?.count || 0,
      pmExecuted: pmItem?.executed || 0
    }
  })

  // ✅ HELPER: Hitung persentase dengan batas maksimal 100%
  const calculatePercentage = (executed, count) => {
    if (!count || count === 0) return 0
    const pct = Math.round((executed / count) * 100)
    return Math.min(100, pct) // ✅ Batasi maksimal 100%
  }

  // ✅ COMPUTED: Data tabel dengan persentase yang sudah dibatasi
  const kalibrasiTableData = computed(() => {
    return kalibrasiMonthly.value.map(item => ({
      ...item,
      executedPercentage: calculatePercentage(item.executed, item.count)
    }))
  })

  const pmTableData = computed(() => {
    return pmMonthly.value.map(item => ({
      ...item,
      executedPercentage: calculatePercentage(item.executed, item.count)
    }))
  })

  return {
    // State
    loading,
    error,
    totalEquipment,
    totalKalibrasi,
    totalPM,
    kalibrasiMonthly,
    pmMonthly,
    selectedYear,
    isInitialized,

    // Computed
    chartData,
    chartOptions,
    currentMonth,
    currentMonthRemaining,
    currentMonthStats,
    kalibrasiTableData,    // ✅ Untuk tabel dengan persentase capped
    pmTableData,           // ✅ Untuk tabel dengan persentase capped

    // Methods
    fetchDashboardData,
    refreshData,
    changeYear,
    startAutoRefresh,
    stopAutoRefresh,
    calculatePercentage    // ✅ Export helper jika dibutuhkan di view
  }
}