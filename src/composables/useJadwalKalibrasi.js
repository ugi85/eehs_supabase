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
    if (dataTableInstance) {
      dataTableInstance.clear()
      dataTableInstance.destroy(true)
      dataTableInstance = null
    }
    const table = document.querySelector('.jadwal-kalibrasi-table')
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
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
        language: { search: '_INPUT_', searchPlaceholder: 'Cari data...' },
        // Default sorting: kolom pertama (No) ascending, sesuai urutan dari API
        order: [[0, 'asc']],
        // Kolom checkbox (index 0) tidak bisa di-sort
        columnDefs: [
          { orderable: false, targets: [0] } // Checkbox column
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
          return
        }
      } catch (e) { /* cache corrupt */ }
    }

    try {
      const result = await jadwalKalibrasiApi.fetchList()
      refJadwal.value = result.success ? result.data : []
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: refJadwal.value, timestamp: now }))
    } catch (error) {
      console.error('Gagal mengambil data jadwal:', error)
      refJadwal.value = []
    } finally {
      loading.value = false
    }
  }

  // === CREATE / UPDATE ===
  const saveJadwal = async (jadwal) => {
    isSaving.value = true
    try {
      const isUpdate = !!jadwal.no
      let result
      if (jadwal.no) {
        result = await jadwalKalibrasiApi.update(jadwal.no, jadwal)
      } else {
        result = await jadwalKalibrasiApi.create(jadwal)
      }
      if (!result.success) throw new Error(result.message || 'Gagal menyimpan jadwal')

      // ✅ Trigger versioning on data change
      const action = isUpdate ? 'update' : 'insert'
      await onKalibrasiChange(action, jadwal)

      localStorage.removeItem(CACHE_KEY)
      await fetchList(true)
      await initDataTable()
      Swal.fire('Berhasil!', `Jadwal berhasil ${isUpdate ? 'diupdate' : 'ditambahkan'}`, 'success')
      return result
    } catch (error) {
      if (error.isDuplicate) {
        Swal.fire({ icon: 'warning', title: 'ID Sudah Ada!', text: error.message })
      } else {
        Swal.fire('Error!', error.message || 'Gagal menyimpan data jadwal', 'error')
      }
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
      // Get jadwal data before deletion for versioning trigger
      const jadwalToDelete = refJadwal.value.find(j => String(j.no) === String(no)) || { no_id: no, description }

      const result = await jadwalKalibrasiApi.delete(no)
      if (!result || !result.success) throw new Error(result?.message || 'Respons tidak valid')

      // ✅ Trigger versioning on data change
      await onKalibrasiChange('delete', jadwalToDelete)

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

  // === Auto-refresh (silent — tidak reinit DataTable) ===
  const startAutoRefresh = () => {
    stopAutoRefresh()
    refreshTimer = setInterval(async () => {
      localStorage.removeItem(CACHE_KEY)
      await fetchList(true, true) // silent — DataTable tetap, data update di background
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
