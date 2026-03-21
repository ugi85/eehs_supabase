<!-- src/views/DashboardView.vue -->
<template>
  <div class="content-wrapper">
    <section class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1>Dashboard PM & Calibration</h1>
          </div>
          <div class="col-sm-6">
            <!-- <ol class="breadcrumb float-sm-right">
              <li class="breadcrumb-item"><a href="/dashChart">Home</a></li>
              <li class="breadcrumb-item active">Dashboard</li>
            </ol> -->
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <!-- Stats Cards -->
        <div class="row">
          <div class="col-lg-3 col-6">
            <div class="small-box bg-info">
              <div class="inner">
                <h3>{{ totalEquipment || 0 }}</h3>
                <p>Total Peralatan</p>
              </div>
              <div class="icon">
                <i class="fas fa-cogs"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-success">
              <div class="inner">
                <h3>{{ totalKalibrasi || 0 }}</h3>
                <p>Jadwal Kalibrasi</p>
              </div>
              <div class="icon">
                <i class="fas fa-balance-scale"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-warning">
              <div class="inner">
                <h3>{{ totalPM || 0 }}</h3>
                <p>Jadwal PM</p>
              </div>
              <div class="icon">
                <i class="fas fa-tools"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-danger">
              <div class="inner">
                <h3>{{ currentMonthRemaining || 0 }}</h3>
                <p>
                  OverDue - <strong>{{ currentMonth }}</strong>
                </p>


                 <!-- <p> -->
                  <!-- <strong>{{ currentMonthStats.month.substring(0, 3) }}</strong> - OverDue<br> -->
                  <!-- <small>(Kalibrasi: {{ currentMonthStats.kalibrasiCount }}, PM: {{ currentMonthStats.pmCount }})</small> -->
                <!-- </p> -->
              </div>
              <div class="icon">
                <i class="fas fa-tasks"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart Section -->
        <div class="row">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header border-0">
                <h3 class="card-title">
                  <i class="fas fa-chart-line mr-1"></i>
                  Aktivitas Kalibrasi & PM
                </h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="position-relative" style="height: 400px">
                  <canvas ref="chartRef"></canvas>
                  
                  <!-- Loading Overlay -->
                  <div v-if="loading && !hasData" class="chart-overlay">
                    <div class="spinner-border text-primary" role="status">
                      <span class="sr-only">Loading...</span>
                    </div>
                    <p class="mt-2">Memuat data dashboard...</p>
                  </div>
                  
                  <!-- Error Overlay -->
                  <div v-if="error" class="chart-overlay">
                    <i class="fas fa-exclamation-triangle text-danger fa-2x mb-3"></i>
                    <p class="text-danger font-weight-bold">Gagal memuat data</p>
                    <p class="text-muted">{{ error }}</p>
                    <button 
                      @click="retryFetch" 
                      class="btn btn-primary mt-3"
                      :disabled="retrying"
                    >
                      <i class="fas fa-sync-alt mr-1"></i>
                      {{ retrying ? 'Mencoba...' : 'Coba Lagi' }}
                    </button>
                  </div>
                  
                  <!-- No Data Overlay -->
                  <div v-if="!loading && !hasData && !error" class="chart-overlay">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Tidak ada data untuk ditampilkan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pie Chart: Current Month Activity -->
          <div class="col-md-4">
            <div class="card">
              <div class="card-header border-0">
                <h3 class="card-title">
                  <i class="fas fa-chart-pie mr-1"></i>
                  Aktivitas Bulan Ini
                </h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="position-relative" style="height: 360px">
                  <canvas ref="pieChartRef"></canvas>

                  <!-- Loading Overlay -->
                  <div v-if="loading" class="chart-overlay">
                    <div class="spinner-border text-primary" role="status">
                      <span class="sr-only">Loading...</span>
                    </div>
                  </div>

                  <!-- No Data Overlay -->
                  <div v-if="!loading && !hasCurrentMonthData" class="chart-overlay">
                    <i class="fas fa-chart-pie fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Tidak ada aktivitas bulan ini</p>
                  </div>
                </div>
                <div class="mt-3 text-center">
                  <small class="text-muted">{{ currentMonthName }} {{ selectedYear }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Breakdown Tables -->
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-balance-scale text-success mr-1"></i>
                  Jadwal Kalibrasi per Bulan
                </h3>
              </div>
              <div class="card-body table-responsive p-0">
                <table class="table table-hover text-nowrap">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th class="text-center">Jadwal</th>
                      <th class="text-center">Executed</th>
                      <th class="text-center">Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in kalibrasiMonthly" :key="index">
                      <td>{{ item.month }}</td>
                      <td class="text-center">
                        <span class="badge badge-success">{{ item.count || 0 }}</span>
                      </td>
                      <td class="text-center">
                        <span class="badge" :class="item.executed === item.count && item.count > 0 ? 'badge-success' : 'badge-warning'">
                          {{ item.executed || 0 }}/{{ item.count || 0 }}
                        </span>
                      </td>
                      <td class="text-center">
                        <div class="progress progress-xs mb-2">
                          <div 
                            class="progress-bar" 
                            :class="item.executedPercentage === 100 && item.count > 0 ? 'bg-success' : 'bg-info'"
                            :style="{ width: (item.executedPercentage || 0) + '%' }"
                          >
                          </div>
                        </div>
                        <span>{{ item.executedPercentage || 0 }}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <i class="fas fa-tools text-warning mr-1"></i>
                  Jadwal PM per Bulan
                </h3>
              </div>
              <div class="card-body table-responsive p-0">
                <table class="table table-hover text-nowrap">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th class="text-center">Jadwal</th>
                      <th class="text-center">Executed</th>
                      <th class="text-center">Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in pmMonthly" :key="index">
                      <td>{{ item.month }}</td>
                      <td class="text-center">
                        <span class="badge badge-warning">{{ item.count || 0 }}</span>
                      </td>
                      <td class="text-center">
                        <span class="badge" :class="item.executed === item.count && item.count > 0 ? 'badge-success' : 'badge-warning'">
                          {{ item.executed || 0 }}/{{ item.count || 0 }}
                        </span>
                      </td>
                      <td class="text-center">
                        <div class="progress progress-xs mb-2">
                          <div 
                            class="progress-bar" 
                            :class="item.executedPercentage === 100 && item.count > 0 ? 'bg-success' : 'bg-warning'"
                            :style="{ width: (item.executedPercentage || 0) + '%' }"
                          >
                          </div>
                        </div>
                        <span>{{ item.executedPercentage || 0 }}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useDashboard } from '@/composables/useDashboard'

// Register Chart.js
Chart.register(...registerables)

// ✅ GUNAKAN COMPOSABLE
const {
  loading,
  error,
  totalEquipment,
  totalKalibrasi,
  totalPM,
  kalibrasiMonthly,
  pmMonthly,
  selectedYear,
  isInitialized,
  chartData,
  chartOptions,
  currentMonth,
  currentMonthRemaining,
  currentMonthStats,
  fetchDashboardData,
  startAutoRefresh,
  stopAutoRefresh
} = useDashboard()

const chartRef = ref(null)
const pieChartRef = ref(null)
let chartInstance = null
let pieChartInstance = null
const retrying = ref(false)

// Computed: Nama bulan saat ini
const currentMonthName = computed(() => {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return months[new Date().getMonth()]
})

// Computed: Cek apakah ada data bulan ini
const hasCurrentMonthData = computed(() => {
  const stats = currentMonthStats.value
  return stats && (stats.kalibrasiCount > 0 || stats.pmCount > 0 || 
                   stats.kalibrasiExecuted > 0 || stats.pmExecuted > 0)
})

// Computed: Data untuk Pie Chart
const pieChartData = computed(() => {
  const stats = currentMonthStats.value
  if (!stats) return { labels: [], datasets: [] }

  const labels = []
  const data = []
  const backgroundColor = []

  // Kalibrasi Scheduled (belum dilaksanakan) - Biru (sama dengan chart line)
  if (stats.kalibrasiCount > stats.kalibrasiExecuted) {
    labels.push('Kalibrasi')
    data.push(stats.kalibrasiCount - stats.kalibrasiExecuted)
    backgroundColor.push('#6298ef') // Biru - sama dengan chart line Kalibrasi
  }

  // Kalibrasi Executed (sudah dilaksanakan) - Hijau
  if (stats.kalibrasiExecuted > 0) {
    labels.push('Kalibrasi Done')
    data.push(stats.kalibrasiExecuted)
    backgroundColor.push('#f14777') // Hijau muda
  }

  // PM Scheduled (belum dilaksanakan) - Hijau (sama dengan chart line)
  if (stats.pmCount > stats.pmExecuted) {
    labels.push('PM ')
    data.push(stats.pmCount - stats.pmExecuted)
    backgroundColor.push('#43c566') // Hijau - sama dengan chart line PM
  }

  // PM Executed (sudah dilaksanakan) - Orange
  if (stats.pmExecuted > 0) {
    labels.push('PM Done')
    data.push(stats.pmExecuted)
    backgroundColor.push('#f7d148') // Orange/merah muda
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor,
      borderWidth: 2,
      borderColor: '#fff'
    }]
  }
})

// Computed: Opsi Pie Chart
const pieChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 10,
        font: {
          size: 11
        }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
          return `${label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}))

// Computed: Cek apakah ada data
const hasData = computed(() => {
  return (kalibrasiMonthly.value.length > 0 || pmMonthly.value.length > 0) &&
         (totalKalibrasi.value > 0 || totalPM.value > 0)
})

// ✅ INISIALISASI CHART - DIPERBAIKI
const initChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  if (chartRef.value && hasData.value) {
    // ✅ FIX: Tambahkan "data:" sebelum chartData.value
    chartInstance = new Chart(chartRef.value, {
      type: 'line',
      data: chartData.value,  // ← INI YANG DIPERBAIKI
      options: chartOptions.value
    })
  }
}

// ✅ INISIALISASI PIE CHART
const initPieChart = () => {
  if (pieChartInstance) {
    pieChartInstance.destroy()
  }

  if (pieChartRef.value && hasCurrentMonthData.value) {
    pieChartInstance = new Chart(pieChartRef.value, {
      type: 'pie',
      data: pieChartData.value,
      options: pieChartOptions.value
    })
  }
}

// ✅ WATCH UNTUK UPDATE CHART SAAT DATA BERUBAH
watch([kalibrasiMonthly, pmMonthly], () => {
  if (!loading.value && chartRef.value) {
    if (chartInstance) {
      // Update existing chart
      chartInstance.data = chartData.value
      chartInstance.update('active')
    } else {
      // Initialize chart for the first time
      initChart()
    }
  }
})

// ✅ WATCH UNTUK UPDATE PIE CHART SAAT DATA BERUBAH
watch([currentMonthStats], () => {
  if (!loading.value && pieChartRef.value) {
    if (pieChartInstance) {
      // Update existing pie chart
      pieChartInstance.data = pieChartData.value
      pieChartInstance.update('active')
    } else {
      // Initialize pie chart for the first time
      initPieChart()
    }
  }
})

// ✅ RETRY FETCH
const retryFetch = async () => {
  if (retrying.value) return
  
  retrying.value = true
  try {
    await fetchDashboardData(selectedYear.value, false)
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  // ✅ INISIALISASI DENGAN CACHE
  fetchDashboardData('2026')
  
  // ✅ MULAI AUTO-REFRESH
  startAutoRefresh()
})

onUnmounted(() => {
  // ✅ STOP AUTO-REFRESH
  stopAutoRefresh()

  // ✅ DESTROY CHART
  if (chartInstance) {
    chartInstance.destroy()
  }
  if (pieChartInstance) {
    pieChartInstance.destroy()
  }
})
</script>

<style scoped>
.small-box {
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.small-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 0.75rem 1.5rem rgba(0,0,0,0.2);
}

.card {
  box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.05);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.progress {
  height: 6px;
  margin-bottom: 0;
}

.progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  padding: 0.1rem;
  font-size: 0.75rem;
  font-weight: bold;
}

/* Overlay untuk Chart */
.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-body {
    padding: 0.5rem;
  }
  
  .chart-overlay p {
    font-size: 0.9rem;
  }
  
  .small-box {
    margin-bottom: 1rem;
  }
}
</style>