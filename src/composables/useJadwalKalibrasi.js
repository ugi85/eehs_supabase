// src/composables/useJadwalKalibrasi.js
import { ref, nextTick, onUnmounted } from 'vue'
import { jadwalKalibrasiApi } from '@/api'
import { useLogAktivitas } from '@/composables/useLogAktivitas'
import { useDataChangeTrigger } from './useDataChangeTrigger'

const CACHE_KEY = 'jadwal_kalibrasi_cache'
const CACHE_DURATION = 1 * 60 * 1000 // 1 menit

export function useJadwalKalibrasi() {
  const refJadwal = ref([])
  const loading = ref(true)
  const isSaving = ref(false)
  const isDeleting = ref(false)
  let dataTableInstance = null
  let refreshTimer = null

  const { onKalibrasiChange } = useDataChangeTrigger()

  // === Init DataTables ===
  const initDataTable = async () => {
    await nextTick()
    const table = document.querySelector('.jadwal-kalibrasi-table')

    // Hancurkan instance lama dengan cara yang benar
    if (dataTableInstance) {
      dataTableInstance.destroy()
      dataTableInstance = null
    }

    if (table) {
      dataTableInstance = $(table).DataTable({
        paging: true,
        lengthChange: true,
        searching: true,
        ordering: true,
        info: true,
        autoWidth: false,
        responsive: false,
        scrollX: true,
        scrollCollapse: true,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']], // 🔥 Diperbaiki: tidak otomatis all, default 10
        language: { search: '_INPUT_', searchPlaceholder: 'Cari data...' },
        order: [[1, 'asc']], // Sesuaikan dengan kolom "No"
        columnDefs: [
          { orderable: false, targets: [0, 11] } // 🔥 Diperbaiki: index kolom aksi sekarang jadi 11 (karena status/notes dihapus)
        ]
      })
    }
  }

  // === Fetch dengan Cache ===
  const fetchList = async (force = false, silent = false) => {
    if (!silent) loading.value = true

    const cached = localStorage.getItem(CACHE_KEY)
    const now = Date.now()

    if (!force && cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (now - timestamp < CACHE_DURATION) {
          refJadwal.value = data
          loading.value = false
          // 🔥 Jangan panggil initDataTable() di sini saat load dari cache
          return
        }
      } catch (e) { /* cache corrupt */ }
    }

    try {
      const result = await jadwalKalibrasiApi.fetchList()
      const newData = Array.isArray(result) ? result : (result.data || [])

        refJadwal.value = newData
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, timestamp: now }))

      // Selalu re-init setelah data baru di-fetch agar sinkron dengan DOM Vue
      if (!silent) await initDataTable() // 🔥 Hanya re-init jika bukan silent (auto-refresh)
    } catch (error) {
      console.error('Gagal mengambil data jadwal:', error)
    } finally {
      loading.value = false
    }
  }

  // === CREATE / UPDATE ===
  const saveJadwal = async (jadwal) => {
    isSaving.value = true
    try {
      const isUpdate = !!jadwal.no
      // Gunakan fungsi saveJadwal dari jadwalKalibrasiApi
      const result = await jadwalKalibrasiApi.saveJadwal(jadwal)
      if (!result.success) throw new Error(result.message || 'Gagal menyimpan jadwal')

      localStorage.removeItem(CACHE_KEY)
      await fetchList(true)
      await initDataTable()
      Swal.fire('Berhasil!', `Jadwal berhasil ${isUpdate ? 'diupdate' : 'ditambahkan'}`, 'success')
      return result
    } catch (error) {
        Swal.fire('Error!', error.message || 'Gagal menyimpan data jadwal', 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // === DELETE ===
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
      // Gunakan fungsi deleteJadwal dari jadwalKalibrasiApi
      const result = await jadwalKalibrasiApi.deleteJadwal(no)
      if (!result || !result.success) throw new Error(result?.message || 'Respons tidak valid')

      refJadwal.value = refJadwal.value.filter(j => String(j.no) !== String(no))
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true)
      await initDataTable()
      Swal.fire('Berhasil!', 'Jadwal berhasil dihapus', 'success')
      return result
    } catch (error) {
      Swal.fire('Gagal Menghapus!', error.message || 'Terjadi kesalahan', 'error')
    } finally {
      isDeleting.value = false
  }
  }

  // === BULK DELETE (silent, no per-item popup) ===
  const bulkDeleteJadwal = async (ids = []) => {
    isDeleting.value = true
    try {
      const result = await jadwalKalibrasiApi.bulkDelete(ids)

      localStorage.removeItem(CACHE_KEY)
      await fetchList(true)
      await initDataTable()

      return result
    } catch (error) {
      console.error('[ERROR] Gagal bulk delete jadwal:', error)
      throw error
    } finally {
      isDeleting.value = false
    }
  }

  // === Auto-refresh setiap 1 menit (silent — tidak tampilkan loading, tidak reinit DataTable) ===
  const startAutoRefresh = () => {
    stopAutoRefresh()
    refreshTimer = setInterval(async () => {
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true, true) // silent — data update di background
      // JANGAN PANGGIL initDataTable() di sini agar tidak flicker
    }, CACHE_DURATION)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }

  onUnmounted(() => stopAutoRefresh())

  const { createLog } = useLogAktivitas()

  const saveLogActivity = async (rowData) => {
    if (!rowData.pic || !rowData.execute_date) throw new Error('PIC dan Execute Date wajib diisi')
    const jenis = rowData.pm_overall === 'Y' ? 'PM' : 'Kalibrasi'
    const tanggalString = typeof rowData.execute_date === 'string'
      ? rowData.execute_date
      : rowData.execute_date.toISOString().split('T')[0]
    await createLog({ no_id: rowData.no_id, jenis, tanggal: tanggalString, petugas: rowData.pic, keterangan: rowData.ket || '' })
    rowData.status = 'Selesai'
  }

  return {
    refJadwal, loading, isSaving, isDeleting,
    fetchList, saveJadwal, deleteJadwal, bulkDeleteJadwal, saveLogActivity,
    initDataTable, startAutoRefresh, stopAutoRefresh
  }
}

