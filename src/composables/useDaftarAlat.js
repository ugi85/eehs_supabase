// src/composables/useDaftarAlat.js
import { ref, nextTick, onUnmounted } from 'vue'
import { daftarAlatApi } from '@/api'

const CACHE_KEY = 'daftar_alat_cache'
const CACHE_DURATION = 60 * 1000 // 1 menit

export function useDaftarAlat() {
  const tools = ref([])
  const loading = ref(true)
  const isSaving = ref(false)
  const isDeleting = ref(false)
  const statusFilter = ref('active') // 'active' | 'obsolete' | 'all'
  let dataTableInstance = null
  let refreshTimer = null

  // === Init DataTables ===
  const initDataTable = async () => {
    await nextTick()
    if (dataTableInstance) {
      dataTableInstance.clear()
      dataTableInstance.destroy(true)
      dataTableInstance = null
    }
    const table = document.querySelector('.daftar-alat-table')
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
        language: {
          search: '_INPUT_',
          searchPlaceholder: 'Cari data...'
        },
        columnDefs: [{ targets: 1, width: '40px' }]
      })
    }
  }

  // === Fetch dengan cache 1 menit ===
  const fetchList = async (force = false) => {
    loading.value = true
    const now = Date.now()
    const cacheKey = `${CACHE_KEY}_${statusFilter.value}`

    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (now - timestamp < CACHE_DURATION) {
            tools.value = data
            loading.value = false
            return
          }
        }
      } catch (e) { /* cache corrupt */ }
    }

    try {
      const freshData = await daftarAlatApi.fetchList(statusFilter.value)
      tools.value = freshData
      localStorage.setItem(cacheKey, JSON.stringify({ data: freshData, timestamp: now }))
    } catch (error) {
      console.error('Gagal mengambil data alat:', error)
      tools.value = []
    } finally {
      loading.value = false
    }
  }

  // === Ganti filter dan reload ===
  const setStatusFilter = async (filter) => {
    statusFilter.value = filter
    await fetchList(true)
    await initDataTable()
  }

  // === Auto-refresh setiap 1 menit ===
  const startAutoRefresh = () => {
    stopAutoRefresh()
    refreshTimer = setInterval(async () => {
      localStorage.removeItem(`${CACHE_KEY}_${statusFilter.value}`)
      await fetchList(true)
      await initDataTable()
    }, CACHE_DURATION)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onUnmounted(() => stopAutoRefresh())

  // === CREATE / UPDATE ===
  const saveTool = async (tool) => {
    isSaving.value = true
    try {
      const result = await daftarAlatApi.saveTool(tool)
      // Invalidate semua cache filter
      localStorage.removeItem(`${CACHE_KEY}_active`)
      localStorage.removeItem(`${CACHE_KEY}_obsolete`)
      localStorage.removeItem(`${CACHE_KEY}_all`)
      await fetchList(true)
      Swal.fire('Berhasil!', `Alat berhasil ${tool.no ? 'diupdate' : 'ditambahkan'}`, 'success')
      return result
    } catch (error) {
      console.error('Gagal simpan alat:', error)
      Swal.fire('Error!', error.message || 'Gagal menyimpan data alat', 'error')
    } finally {
      isSaving.value = false
    }
  }

  // === DELETE ===
  const deleteTool = async (no, description = '') => {
    const confirm = await Swal.fire({
      title: 'Hapus Alat?',
      text: `Yakin hapus alat "${description || no}"? Data tidak bisa dikembalikan!`,
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
      const result = await daftarAlatApi.deleteTool(no)
      if (!result || !result.success) throw new Error(result?.message || 'Respons tidak valid')
      tools.value = tools.value.filter(t => String(t.no) !== String(no))
      localStorage.removeItem(`${CACHE_KEY}_active`)
      localStorage.removeItem(`${CACHE_KEY}_obsolete`)
      localStorage.removeItem(`${CACHE_KEY}_all`)
      await fetchList(true)
      Swal.fire('Berhasil!', 'Alat berhasil dihapus', 'success')
      return result
    } catch (error) {
      console.error('[ERROR] Gagal menghapus alat:', error)
      Swal.fire('Gagal Menghapus!', error.message || 'Terjadi kesalahan saat menghapus data', 'error')
    } finally {
      isDeleting.value = false
    }
  }

  return {
    tools,
    loading,
    statusFilter,
    fetchList,
    setStatusFilter,
    saveTool,
    deleteTool,
    isSaving,
    isDeleting,
    initDataTable,
    startAutoRefresh,
    stopAutoRefresh
  }
}
