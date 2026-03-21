<!-- src/components/charts/MonthlyCalibration.vue -->
<template>
  <div class="chart-container">
    <canvas ref="chartCanvas" id="monthly-calibration-chart"></canvas>
    <div v-if="loading" class="text-center py-4">
              <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
              <p class="mt-2">Loading chart...</p>
            </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const chartCanvas = ref(null)
const loading = ref(true)

// === Konfigurasi Cache ===
const CACHE_KEY = 'monthly_chart_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

// Fungsi untuk mengambil data dari API
const fetchMonthlyReports = async () => {
  try {
    const pmResponse = await fetch('https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec?action=reportpmyearly')
    const pmData = await pmResponse.json()

    const calibResponse = await fetch('https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec?action=reportcalibrationbymonth')
    const calibData = await calibResponse.json()

    const pm6Response = await fetch('https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec?action=reportpm6monthly')
    const pm6Data = await pm6Response.json()

    if (!pmData.success || !calibData.success || !pm6Data.success) {
      console.error("API Error:", pmData.error || calibData.error || pm6Data.error)
      return null
    }

    return {
      pm: pmData.data,
      calib: calibData.data,
      pm6: pm6Data.data
    }
  } catch (error) {
    console.error("Fetch Error:", error)
    return null
  }
}


const initChart = async () => {
  const now = Date.now()
  let cachedData = null

  // Coba baca dari cache
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed && now - parsed.timestamp < CACHE_DURATION) {
        cachedData = parsed
      }
    } catch (e) {
      console.warn('Cache chart corrupted, ignoring')
    }
  }

  if (cachedData) {
    // Tampilkan langsung dari cache
    renderChart(cachedData.pm, cachedData.calib, cachedData.pm6)
    loading.value = false

    // Update di background
    fetchMonthlyReports().then(freshData => {
      if (freshData) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ...freshData, timestamp: Date.now() })
        )
        // Opsional: refresh chart dengan data baru
        // renderChart(freshData.pm, freshData.calib)
      }
    }).catch(console.error)
  } else {
    // Ambil dari API
    const data = await fetchMonthlyReports()
    loading.value = false

    if (data) {
      renderChart(data.pm, data.calib, data.pm6)
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ...data, timestamp: now })
      )
    } else {
      console.error("Gagal mengambil data untuk chart.")
    }
  }
}

const renderChart = (pmDataObj, calibDataObj, pm6DataObj) => {
  if (!chartCanvas.value) return

  const ctx = chartCanvas.value.getContext('2d')

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const pmData = months.map(month => pmDataObj[month] || 0)
  const calibData = months.map(month => calibDataObj[month] || 0)
  const pm6Data = months.map(month => pm6DataObj[month] || 0)

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'PM (Yearly)',
          data: pmData,
          backgroundColor: 'rgba(12, 116, 186, 0.6)',
          borderColor: 'rgba(8, 89, 144, 1)',
          borderWidth: 1
        },     
        {
          label: 'PM (6 Monthly)',
          data: pm6Data,
          backgroundColor: 'rgba(30, 133, 133, 0.6)',
          borderColor: 'rgba(19, 99, 99, 1)',
          borderWidth: 1
        },
        {
          label: 'Kalibrasi',
          data: calibData,
          backgroundColor: 'rgba(253, 56, 99, 0.6)',
          borderColor: 'rgba(246, 43, 87, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Jumlah' }
        },
        x: {
          title: { display: true, text: 'Bulan' }
        }
      },
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: ' PM & Kalibrasi' }
      }
    }
  })
}



onMounted(() => {
  initChart()
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 300px;
  position: relative;
  background: #fcfcfcff;
  border: 1px solid #deeaf6ff;
  overflow: hidden;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: #666;
}
</style>