// src/composables/useJadwalKalibrasi.js
import { ref, nextTick, watch, onUnmounted } from 'vue'
import { jadwalKalibrasiApi } from '@/api'
import {useLogAktivitas} from '@/composables/useLogAktivitas'

// === Konfigurasi Cache ===
const CACHE_KEY = 'jadwal_kalibrasi_cache'
const CACHE_DURATION = 1 * 60 * 1000 // 1 menit

export function useJadwalKalibrasi() {
  const refJadwal = ref([])
  const loading = ref(true)
  const isSaving = ref(false)
  const isDeleting = ref(false)
  let dataTableInstance = null
  let refreshTimer = null

  // === Inisialisasi DataTables ===
  const initDataTable = async () => {
    await nextTick()
    if (dataTableInstance) {
      dataTableInstance.clear()
      dataTableInstance.destroy(true) // true = bersihkan wrapper
      dataTableInstance = null
    }

    const table = document.querySelector('.jadwal-kalibrasi-table')
    if (table) {
      // @ts-ignore
      dataTableInstance = $(table).DataTable({
        paging: true,
        lengthChange: true, 
        searching: true,
        ordering: true,
        info: true, 
        autoWidth: false, // ✅ Ubah jadi false saat scrollX=true
        responsive: false,
        scrollX: true,
        lengthMenu: [
          [10, 25, 50, 100, -1],    // nilai -1 = "All"
          [10, 25, 50, 100, "All"]  // label yang ditampilkan
        ],
        language: {
          // url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/id.json',
          search: "_INPUT_",
          searchPlaceholder: "Cari data..."
        },
      })
    }
  }

  watch(
    refJadwal,
    () => {
      initDataTable()
    },
    { deep: true }
  )

  // === Fetch dengan Cache + Background Revalidate ===
  const fetchList = async (force = false) => {
    loading.value = true

    const cached = localStorage.getItem(CACHE_KEY)
    const now = Date.now()

    if (!force && cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (now - timestamp < CACHE_DURATION) {
          refJadwal.value = data
          loading.value = false
          return
        }
      } catch (e) {
        console.warn('Cache corrupted, ignoring:', e)
      }
    }

    try {
      const result = await jadwalKalibrasiApi.fetchList()
      refJadwal.value = result.success ? result.data : []
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: refJadwal.value, timestamp: now })
      )
    } catch (error) {
      console.error('Gagal mengambil data jadwal:', error)
      refJadwal.value = []
    } finally {
      loading.value = false
    }
  }

  // === CREATE / UPDATE: Simpan jadwal ===
  const saveJadwal = async (jadwal) => {
    isSaving.value = true
    try {
      let result
      if (jadwal.no) {
        // Update existing
        result = await jadwalKalibrasiApi.update(jadwal.no, jadwal)
      } else {
        // Create new
        result = await jadwalKalibrasiApi.create(jadwal)
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Gagal menyimpan jadwal')
      }
      
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true) // ✅ fetchList handle initDataTable
      Swal.fire('Berhasil!', `Jadwal berhasil ${jadwal.no ? 'diupdate' : 'ditambahkan'}`, 'success')
      return result
    } catch (error) {
      console.error('Gagal simpan jadwal:', error)
      Swal.fire('Error!', error.message || 'Gagal menyimpan data jadwal', 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // === DELETE: Hapus jadwal ===
  const deleteJadwal = async (no, description = '') => {
    const confirm = await Swal.fire({
      title: 'Hapus Jadwal?',
      text: `Yakin hapus jadwal "${description || no}"? Data tidak bisa dikembalikan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (!confirm.isConfirmed) return

    isDeleting.value = true
    try {
      const result = await jadwalKalibrasiApi.delete(no)
      if (!result || !result.success) {
        throw new Error(result?.message || 'Respons tidak valid dari server')
      }

      // Optimistic update
      refJadwal.value = refJadwal.value.filter(j => String(j.no) !== String(no))
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true) // ✅ fetchList handle initDataTable
      
      Swal.fire('Berhasil!', 'Jadwal berhasil dihapus', 'success')
      return result
    } catch (error) {
      console.error('[ERROR] Gagal menghapus jadwal:', error)
      // ... penanganan error ...
      Swal.fire('Gagal Menghapus!', error.message || 'Terjadi kesalahan', 'error')
    } finally {
      isDeleting.value = false
    }
  }

  // === Auto-refresh setiap 1 menit ===
  const startAutoRefresh = () => {
    stopAutoRefresh()
    refreshTimer = setInterval(async () => {
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true)
    }, CACHE_DURATION)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(() => stopAutoRefresh())

  // DI DALAM FUNGSI useJadwalKalibrasi()
const { createLog } = useLogAktivitas()

// TAMBAHKAN FUNGSI INI
const saveLogActivity = async (rowData) => {
  if (!rowData.pic || !rowData.execute_date) {
    throw new Error('PIC dan Execute Date wajib diisi')
  }
  
  // Tentukan jenis berdasarkan data
  const jenis = rowData.pm_overall === 'Y' ? 'PM' : 'Kalibrasi'
  
  // Konversi tanggal ke string format YYYY-MM-DD jika belum string
  const tanggalString = typeof rowData.execute_date === 'string' 
    ? rowData.execute_date 
    : rowData.execute_date.toISOString().split('T')[0]
  
  const logData = {
    no_id: rowData.no_id,
    jenis: jenis,
    tanggal: tanggalString,
    petugas: rowData.pic,
    keterangan: rowData.ket || ''
  }
  
  await createLog(logData)
  
  // Update status di UI
  rowData.status = 'Selesai'
  rowData.log = {
    petugas: rowData.pic,
    tanggal: rowData.execute_date,
    keterangan: rowData.ket
  }
}

  return {
    refJadwal,
    loading,
    fetchList,
    saveJadwal,
    deleteJadwal,
    isSaving,
    isDeleting,
    saveLogActivity,
    initDataTable,
    startAutoRefresh,
    stopAutoRefresh
  }
}