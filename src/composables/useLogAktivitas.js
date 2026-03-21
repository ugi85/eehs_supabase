// src/composables/useLogAktivitas.js
import { ref, computed, nextTick } from 'vue' // ✅ HAPUS: watch (tidak digunakan)
import { logAktivitasApi } from '@/api'

export function useLogAktivitas() {

  // ✅ STATE MANAGEMENT
  const loading = ref(false)
  const isSaving = ref(false) 
  const logs = ref([])
  const currentLog = ref(null)
  const showFormDialog = ref(false)
  const formMode = ref('create')
  const selectedMonth = ref('January')
  const selectedYear = ref(new Date().getFullYear().toString())
  const filterType = ref('all')
  const formData = ref({
    no_id: '',
    cal_id: '',
    jenis: '',
    tanggal: '',
    petugas: '',
    keterangan: ''
  })
  const keteranganError = ref(false)

  // ✅ STATE BARU UNTUK DATATABLES
  const dataTableInstance = ref(null)
  const isDataTableInitialized = ref(false)

  // ✅ OPTIONS LENGKAP
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = computed(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 10 }, (_, i) => (currentYear + i).toString())
  })

  const filterOptions = [
    { label: 'Semua', value: 'all' },
    { label: 'PM', value: 'pm' },
    { label: 'Kalibrasi', value: 'kalibrasi' }
  ]

  const jenisOptions = [
    { label: 'PM', value: 'PM' },
    { label: 'Kalibrasi', value: 'Kalibrasi' }
  ]

  // ════════════════════════════════════════════════════════════════
  // ✅ HELPER: FORMAT TANGGAL (DIPERBAIKI - SUPPORT SEMUA FORMAT)
  // ════════════════════════════════════════════════════════════════

  // Konversi ke format input (YYYY-MM-DD) untuk input type="date"
  function formatDateForInput(dateString) {
    if (!dateString || dateString === '-' || dateString === 'Invalid date') return ''

    // Format 1: dd/mm/yyyy atau d/m/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/')
      const day = String(parts[0]).padStart(2, '0')
      const month = String(parts[1]).padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }

    // Format 2: YYYY-MM-DD (sudah benar, pastikan padding)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      const parts = dateString.split('-')
      const year = parts[0]
      const month = String(parts[1]).padStart(2, '0')
      const day = String(parts[2]).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Format 3: ISO String atau format lain
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch (e) {
      console.warn('Error formatting date for input:', dateString, e)
    }

    return '' // Fallback ke string kosong
  }

  // Konversi ke format display (dd/mm/yyyy)
  function formatDateForDisplay(dateString) {
    if (!dateString || dateString === '-' || dateString === 'Invalid date') return '-'

    // Format YYYY-MM-DD (dari input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const parts = dateString.split('-')
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      return `${day}/${month}/${year}`
    }

    // Format dd/mm/yyyy (sudah benar)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/')
      const day = String(parts[0]).padStart(2, '0')
      const month = String(parts[1]).padStart(2, '0')
      const year = parts[2]
      return `${day}/${month}/${year}`
    }

    // Format ISO string atau Date object
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
    } catch (e) {
      console.warn('Error formatting date for display:', dateString, e)
    }

    return dateString || '-'
  }

  // ════════════════════════════════════════════════════════════════
  // ✅ COMPUTED PROPERTIES (DIPERBAIKI DENGAN SAFEGUARD)
  // ════════════════════════════════════════════════════════════════
  
  const filteredLogs = computed(() => {
    if (!Array.isArray(logs.value)) return []
    return logs.value.filter(log => {
      if (filterType.value === 'pm') return log.jenis === 'PM'
      if (filterType.value === 'kalibrasi') return log.jenis === 'Kalibrasi'
      return true
    })
  })

  const completedLogs = computed(() => {
    if (!Array.isArray(logs.value)) return []
    return logs.value
      .filter(log => log.status === 'Selesai' || (log.tanggal && log.petugas))
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
  })

  const allActivityLogs = computed(() => {
    if (!Array.isArray(logs.value)) {
      console.warn('[useLogAktivitas] logs.value is not an array:', logs.value)
      return []
    }
    
    return logs.value.map(log => {
      if (typeof log !== 'object' || log === null) {
        return { ...log, status: 'Belum', formattedDate: '-' }
      }
      
      const status = log.status || (log.tanggal && log.petugas ? 'Selesai' : 'Belum')
      const formattedDate = formatDateForDisplay(log.tanggal)
      
      return {
        ...log,
        status,
        formattedDate,
        description: log.description || log.type_model || '-',
        type_model: log.type_model || '-',
        sn: log.sn || '-'
      }
    })
  })

  const isFormValid = computed(() => {
    return formData.value.keterangan?.trim() !== ''
  })

  // ════════════════════════════════════════════════════════════════
  // ✅ DATATABLES INTEGRATION (DIPERBAIKI)
  // ════════════════════════════════════════════════════════════════
  
  const initDataTable = async (tableSelector = '.jadwal-kalibrasi-table') => {
    await nextTick()
    
    // Destroy instance lama
    if (dataTableInstance.value) {
      try {
        dataTableInstance.value.destroy(true)
      } catch (e) {
        console.warn('Error destroying DataTable:', e)
      }
      dataTableInstance.value = null
      isDataTableInitialized.value = false
    }

    const table = document.querySelector(tableSelector)
    if (!table) {
      console.warn(`Tabel "${tableSelector}" tidak ditemukan`)
      return
    }
    // Safeguard: skip jika tabel benar-benar kosong (tidak ada tbody sama sekali)
    const tbody = table.querySelector('tbody')
    if (!tbody) {
      console.warn('[DataTables] Tabel tidak punya tbody, lewati inisialisasi')
      return
    }

    try {
      // @ts-ignore
      dataTableInstance.value = $(table).DataTable({
        paging: true,
        lengthChange: true,
        searching: true,
        ordering: true,
        info: true,
        autoWidth: false,
        responsive: false,
        scrollX: true,
        lengthMenu: [
          [10, 25, 50, 100, -1],
          [10, 25, 50, 100, "All"]
        ],
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/id.json',
          search: "_INPUT_",
          searchPlaceholder: "Cari data..."
        },
        dom: `
          <'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>
          <'row'<'col-sm-12'tr>>
          <'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>
        `.trim()
      })
      
      isDataTableInitialized.value = true
      console.log('✅ DataTables berhasil diinisialisasi')
    } catch (error) {
      console.error('❌ Gagal menginisialisasi DataTables:', error)
    }
  }

  // Watch untuk re-initialisasi DataTables saat data berubah
  // ❌ DIHAPUS: Tidak menggunakan watch karena menyebabkan conflict
  // Gunakan pemanggilan manual di view setelah data dimuat

  // ════════════════════════════════════════════════════════════════
  // ✅ FETCH & CRUD METHODS (DIPERBAIKI)
  // ════════════════════════════════════════════════════════════════
  

      async function refreshDataTable(tableSelector = '.jadwal-kalibrasi-table') {
      // Tunggu Vue render ulang DOM setelah data berubah
      await nextTick()
      await nextTick()
      initDataTable(tableSelector)
    }

  async function fetchData() {
    loading.value = true
    try {
      let response
      if (filterType.value === 'pm') {
        response = await logAktivitasApi.getPMForPeriod(selectedMonth.value, selectedYear.value)
      } else if (filterType.value === 'kalibrasi') {
        response = await logAktivitasApi.getKalibrasiForPeriod(selectedMonth.value, selectedYear.value)
      } else {
        response = await logAktivitasApi.getAllForPeriod(selectedMonth.value, selectedYear.value)
      }
      logs.value = response.data || []
      console.log(`✅ Berhasil memuat ${logs.value.length} data`)
      return logs.value
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchAllLogs() {
    loading.value = true
    try {
      const allLogs = await logAktivitasApi.listLogs()
      if (!Array.isArray(allLogs)) {
        throw new Error('Response API tidak valid: data bukan array')
      }
      
      logs.value = allLogs.map(log => ({
        ...log,
        status: log.status || (log.tanggal && log.petugas ? 'Selesai' : 'Belum'),
        description: log.description || log.type_model || '-',
        type_model: log.type_model || '-',
        sn: log.sn || '-',
        formattedDate: formatDateForDisplay(log.tanggal)
      }))
      
      console.log(`✅ Berhasil memuat ${logs.value.length} log aktivitas`)
      return logs.value
    } catch (error) {
      console.error('❌ Error fetching all logs:', error)
      logs.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function createLog(logData) {
    isSaving.value = true
    loading.value = true
    try {
      const response = await logAktivitasApi.createLog({
        ...logData,
        petugas: logData.petugas || 'Unknown'
      })
      console.log('✅ Log berhasil disimpan')
      await fetchAllLogs()
      closeFormDialog()
      return response
    } catch (error) {
      console.error('❌ Error creating log:', error)
      throw error
    } finally {
      isSaving.value = false
      loading.value = false
    }
  }

  async function updateLog(logData) {
    isSaving.value = true
    loading.value = true
    try {
      const response = await logAktivitasApi.updateLog(logData)
      console.log('✅ Log berhasil diupdate')
      await fetchAllLogs()
      closeFormDialog()
      return response
    } catch (error) {
      console.error('❌ Error updating log:', error)
      throw error
    } finally {
      isSaving.value = false
      loading.value = false
    }
  }

  async function deleteLog(no) {
    // if (!confirm('Apakah Anda yakin ingin menghapus log ini?')) return false
    loading.value = true
    try {
      await logAktivitasApi.delete(no)
      console.log('✅ Log berhasil dihapus')
      await fetchAllLogs()
      return true
    } catch (error) {
      console.error('❌ Error deleting log:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function getLogByNo(no) {
    try {
      return await logAktivitasApi.getLogByNo(no)
    } catch (error) {
      console.error('❌ Error getting log:', error)
      throw error
    }
  }

  async function getDaftarAlat() {
    try {
      return await logAktivitasApi.getDaftarAlat()
    } catch (error) {
      console.error('❌ Error getting daftar alat:', error)
      throw error
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ✅ FORM DIALOG METHODS (DIPERBAIKI - TANPA DUPLICATE)
  // ════════════════════════════════════════════════════════════════
  
  // ✅ FUNGSI TUNGGAL: openFormDialog (DENGAN KONVERSI TANGGAL)
  function openFormDialog(mode = 'create', log = null) {
    formMode.value = mode
    currentLog.value = log ? { ...log } : null
    
    // Prioritas field: execute_date → tanggal
    let rawDate = ''
    if (log) {
      rawDate = log.execute_date || log.tanggal || ''
    }
    
    // Konversi ke format input (YYYY-MM-DD)
    const formattedDate = formatDateForInput(rawDate)
    
    formData.value = {
      no_id: log?.no_id || '',
      cal_id: log?.cal_id || '',
      jenis: log?.jenis || '',
      tanggal: formattedDate, // ✅ FORMAT YANG BENAR UNTUK INPUT
      petugas: log?.petugas || '',
      keterangan: log?.keterangan || ''
    }
    
    showFormDialog.value = true
    isSaving.value = false
  }

  function closeFormDialog() {
    showFormDialog.value = false
    currentLog.value = null
    formMode.value = 'create'
    keteranganError.value = false
    isSaving.value = false
  }

  async function handleFilterChange() {
    await fetchData()
  }

  // ✅ FUNGSI TUNGGAL: handleSubmit (DENGAN KONVERSI BALIK KE FORMAT API)
  async function handleSubmit() {
    if (!isFormValid.value) {
      keteranganError.value = true
      alert('Keterangan wajib diisi!')
      return
    }
    keteranganError.value = false
    
    // Kirim tanggal dalam format YYYY-MM-DD (ISO) agar Supabase bisa simpan dengan benar
    // formData.tanggal sudah dalam format YYYY-MM-DD dari input type="date"
    const payload = {
      ...formData.value,
      tanggal: formData.value.tanggal  // tetap YYYY-MM-DD, biarkan API handle
    }
    
    isSaving.value = true
    try {
      if (formMode.value === 'create') {
        await createLog(payload)
      } else {
        await updateLog({
          ...payload,
          no: currentLog.value?.no || currentLog.value?.log_no || ''
        })
      }
    } catch (error) {
      console.error('Form submit error:', error)
      isSaving.value = false
      throw error
    }
  }

  // ════════════════════════════════════════════════════════════════
  // ✅ HELPER FUNCTIONS
  // ════════════════════════════════════════════════════════════════
  
  function getStatusBadgeClass(status) {
    if (status === 'Selesai') return 'badge-success'
    if (status === 'Belum') return 'badge-danger'
    return 'badge-secondary'
  }

  function getJenisBadgeClass(jenis) {
    if (jenis === 'PM') return 'badge-info'
    if (jenis === 'Kalibrasi') return 'badge-warning'
    return 'badge-secondary'
  }

  async function init(month = 'January', year = new Date().getFullYear().toString()) {
    selectedMonth.value = month
    selectedYear.value = year
    await fetchData()
  }

  async function initAllActivities() {
    await fetchAllLogs()
  }

  // ════════════════════════════════════════════════════════════════
  // ✅ RETURN STATE & METHODS
  // ════════════════════════════════════════════════════════════════
  
  return {
    // State
    loading,
    isSaving,
    logs,
    currentLog,
    showFormDialog,
    formMode,
    selectedMonth,
    selectedYear,
    filterType,
    formData,
    keteranganError,
    dataTableInstance,
    isDataTableInitialized,
    
    // Computed
    filteredLogs,
    completedLogs,
    allActivityLogs,
    isFormValid,
    
    // Options
    months,
    years,
    filterOptions,
    jenisOptions,
    
    // Methods
    fetchData,
    fetchAllLogs,
    getAllForPeriod: fetchData,
    getLogsByMonthYear: fetchData,
    listLogs: fetchAllLogs,
    getDaftarAlat,
    getLogByNo,
    createLog,
    updateLog,
    deleteLog,
    openFormDialog,      // ✅ HANYA 1 VERSI
    closeFormDialog,
    handleFilterChange,
    handleSubmit,         // ✅ HANYA 1 VERSI
    getStatusBadgeClass,
    getJenisBadgeClass,
    init,
    initAllActivities,
    initDataTable,
    refreshDataTable,
    formatDateForDisplay,
    formatDateForInput   // ✅ EKSPOR UNTUK DEBUGGING
  }
}