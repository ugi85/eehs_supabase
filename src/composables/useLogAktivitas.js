// src/composables/useLogAktivitas.js
import { ref, computed, nextTick } from 'vue'
import { logAktivitasApi } from '@/api'

export function useLogAktivitas() {

  // STATE
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
    keterangan: '',
    backlog_status: null,
    backlog_notes: ''
  })
  const keteranganError = ref(false)

  // DataTable untuk allAktivitas — dikelola di view (bukan composable)
  const backlogFilter = ref('all')
  const displayedLogs = ref([])

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

  // ── Format helpers ────────────────────────────────────────────────────────

  function formatDateForInput(dateString) {
    if (!dateString || dateString === '-' || dateString === 'Invalid date') return ''
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [d, m, y] = dateString.split('/')
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-')
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    }
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      }
    } catch (e) {}
    return ''
  }

  function formatDateForDisplay(dateString) {
    if (!dateString || dateString === '-' || dateString === 'Invalid date') return '-'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-')
      return `${d}/${m}/${y}`
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [d, m, y] = dateString.split('/')
      return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
    }
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`
      }
    } catch (e) {}
    return dateString || '-'
  }

  // ── Computed ──────────────────────────────────────────────────────────────

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
    if (!Array.isArray(logs.value)) return []
    return logs.value.map(log => {
      if (typeof log !== 'object' || log === null) return { ...log, status: 'Belum', formattedDate: '-' }
      return {
        ...log,
        status: log.status || (log.tanggal && log.petugas ? 'Selesai' : 'Belum'),
        formattedDate: formatDateForDisplay(log.tanggal),
        description: log.description || log.type_model || '-',
        type_model: log.type_model || '-',
        sn: log.sn || '-'
      }
    })
  })

  const backlogCounts = computed(() => ({
    pending:   allActivityLogs.value.filter(l => l.backlog_status === 'pending').length,
    completed: allActivityLogs.value.filter(l => l.backlog_status === 'completed').length,
  }))

  const isFormValid = computed(() => formData.value.keterangan?.trim() !== '')

  // ── DataTable (pola identik dengan useDaftarAlat) ─────────────────────────

  // DataTable dikelola di view, bukan di composable
  const initDataTable = null // placeholder agar tidak break existing imports

  // Filter + update displayedLogs saja — DataTable dikelola sepenuhnya di view
  const setBacklogFilter = (filter) => {
    backlogFilter.value = filter
    const all = allActivityLogs.value
    if (filter === 'pending')        displayedLogs.value = all.filter(l => l.backlog_status === 'pending')
    else if (filter === 'completed') displayedLogs.value = all.filter(l => l.backlog_status === 'completed')
    else if (filter === 'none')      displayedLogs.value = all.filter(l => !l.backlog_status)
    else                             displayedLogs.value = [...all]
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

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
      return logs.value
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchAllLogs(silent = false) {
    if (!silent) loading.value = true
    try {
      const allLogs = await logAktivitasApi.listLogs()
      if (!Array.isArray(allLogs)) throw new Error('Response API tidak valid: data bukan array')
      logs.value = allLogs.map(log => ({
        ...log,
        status: log.status || (log.tanggal && log.petugas ? 'Selesai' : 'Belum'),
        description: log.description || log.type_model || '-',
        type_model: log.type_model || '-',
        sn: log.sn || '-',
        formattedDate: formatDateForDisplay(log.tanggal)
      }))
      return logs.value
    } catch (error) {
      logs.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function createLog(logData) {
    isSaving.value = true
    loading.value = true
    try {
      const response = await logAktivitasApi.createLog({ ...logData, petugas: logData.petugas || 'Unknown' })
      await fetchAllLogs()
      closeFormDialog()
      return response
    } catch (error) {
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
      await fetchAllLogs()
      closeFormDialog()
      return response
    } catch (error) {
      throw error
    } finally {
      isSaving.value = false
      loading.value = false
    }
  }

  async function deleteLog(no) {
    loading.value = true
    try {
      await logAktivitasApi.delete(no)
      await fetchAllLogs()
      return true
    } catch (error) {
      return false
    } finally {
      loading.value = false
    }
  }

  async function bulkDeleteLogs(ids = []) {
    loading.value = true
    try {
      const result = await logAktivitasApi.bulkDelete(ids)
      await fetchAllLogs(true)
      return result
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  async function getLogByNo(no) {
    return await logAktivitasApi.getLogByNo(no)
  }

  async function getDaftarAlat() {
    return await logAktivitasApi.getDaftarAlat()
  }

  // ── Form dialog ───────────────────────────────────────────────────────────

  function openFormDialog(mode = 'create', log = null) {
    formMode.value = mode
    currentLog.value = log ? { ...log } : null
    const rawDate = log ? (log.execute_date || log.tanggal || '') : ''
    formData.value = {
      no_id: log?.no_id || '',
      cal_id: log?.cal_id || '',
      jenis: log?.jenis || '',
      tanggal: formatDateForInput(rawDate),
      petugas: log?.petugas || '',
      keterangan: log?.keterangan || '',
      backlog_status: log?.backlog_status || null,
      backlog_notes: log?.backlog_notes || ''
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

  async function handleSubmit() {
    if (!isFormValid.value) {
      keteranganError.value = true
      alert('Keterangan wajib diisi!')
      return
    }
    keteranganError.value = false
    const payload = { ...formData.value }
    isSaving.value = true
    try {
      if (formMode.value === 'create') {
        await createLog(payload)
      } else {
        await updateLog({ ...payload, no: currentLog.value?.no || currentLog.value?.log_no || '' })
      }
    } catch (error) {
      isSaving.value = false
      throw error
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
    await fetchAllLogs() // initial load — tampilkan loading
    displayedLogs.value = [...allActivityLogs.value]
    // DataTable di-init oleh view setelah mount
  }

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    loading, isSaving, logs, currentLog, showFormDialog, formMode,
    selectedMonth, selectedYear, filterType, formData, keteranganError,
    filteredLogs, completedLogs, allActivityLogs, isFormValid,
    backlogFilter, displayedLogs, backlogCounts,
    months, years, filterOptions, jenisOptions,
    fetchData, fetchAllLogs,
    getAllForPeriod: fetchData,
    getLogsByMonthYear: fetchData,
    listLogs: fetchAllLogs,
    getDaftarAlat, getLogByNo,
    createLog, updateLog, deleteLog, bulkDeleteLogs,
    openFormDialog, closeFormDialog,
    handleFilterChange, handleSubmit,
    getStatusBadgeClass, getJenisBadgeClass,
    init, initAllActivities,
    initDataTable, setBacklogFilter,
    formatDateForDisplay, formatDateForInput
  }
}