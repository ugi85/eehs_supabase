<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useDaftarAlat } from '@/composables/useDaftarAlat'
import { useFrontendConfig } from '@/composables/useConfig'
import { usePermissions } from '@/composables/usePermissions'
import { useExcelImport } from '@/composables/useExcelImport'
import { daftarAlatApi } from '@/api'
import { printService } from '@/services/printService'

const { tools, loading, fetchList, saveTool, isSaving, deleteTool, bulkDeleteTools, statusFilter, setStatusFilter, initDataTable } = useDaftarAlat()
const { config } = useFrontendConfig()
const permission = usePermissions()

// === FILTER STATE ===
const isFilterExpanded = ref(false) // Default tertutup saat halaman dibuka
const selectedMonth = ref('')
const selectedScheduleType = ref('all') // 'all' | 'pm' | 'calib'
const filterPM = ref('all') // 'all' | 'Y' | 'N'
const filterCalib = ref('all') // 'all' | 'Y' | 'N'

const toggleFilter = () => {
  isFilterExpanded.value = !isFilterExpanded.value
}

// Daftar pilihan bulan
const monthOptions = [
  { value: 'January', label: 'Januari' },
  { value: 'February', label: 'Februari' },
  { value: 'March', label: 'Maret' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'Mei' },
  { value: 'June', label: 'Juni' },
  { value: 'July', label: 'Juli' },
  { value: 'August', label: 'Agustus' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'Oktober' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'Desember' }
]

// Helper untuk memeriksa apakah field jadwal cocok dengan bulan target
const matchMonthField = (fieldValue, targetMonth) => {
  if (!fieldValue || fieldValue === 'NA' || fieldValue === '-') return false
  const fieldStr = String(fieldValue).toLowerCase()
  const mShort = targetMonth.substring(0, 3).toLowerCase()
  const mFull = targetMonth.toLowerCase()
  return fieldStr.includes(mShort) || fieldStr.includes(mFull)
}

// Helper untuk mencocokkan jadwal alat dengan bulan & tipe jadwal
const matchesSchedule = (tool, targetMonth) => {
  const hasPm6 = matchMonthField(tool.pm_6monthly, targetMonth)
  const hasPmYearly = matchMonthField(tool.pm_yearly, targetMonth)
  const hasCalib = matchMonthField(tool.calib_schedule, targetMonth)

  if (selectedScheduleType.value === 'pm') {
    return hasPm6 || hasPmYearly
  } else if (selectedScheduleType.value === 'calib') {
    return hasCalib
  } else {
    return hasPm6 || hasPmYearly || hasCalib
  }
}

// Data alat setelah difilter
const filteredTools = computed(() => {
  let list = tools.value || []

  // 1. Filter Bulan Jadwal (PM / Kalibrasi)
  if (selectedMonth.value) {
    list = list.filter(tool => matchesSchedule(tool, selectedMonth.value))
  }

  // 2. Filter Memerlukan PM (Y/N)
  if (filterPM.value === 'Y') {
    list = list.filter(tool => String(tool.pm_overall || '').toUpperCase() === 'Y')
  } else if (filterPM.value === 'N') {
    list = list.filter(tool => String(tool.pm_overall || '').toUpperCase() !== 'Y')
  }

  // 3. Filter Memerlukan Kalibrasi (Y/N)
  if (filterCalib.value === 'Y') {
    list = list.filter(tool => String(tool.calib_yesno || '').toUpperCase() === 'Y')
  } else if (filterCalib.value === 'N') {
    list = list.filter(tool => String(tool.calib_yesno || '').toUpperCase() !== 'Y')
  }

  return list
})

// Hitung berapa filter yang sedang aktif
const activeFilterCount = computed(() => {
  let count = 0
  if (selectedMonth.value) count++
  if (selectedMonth.value && selectedScheduleType.value !== 'all') count++
  if (filterPM.value !== 'all') count++
  if (filterCalib.value !== 'all') count++
  return count
})

// Reset semua filter ke default
const resetFilters = () => {
  selectedMonth.value = ''
  selectedScheduleType.value = 'all'
  filterPM.value = 'all'
  filterCalib.value = 'all'
}

// Unique key untuk re-render tabel saat filter berubah
const tableRenderKey = computed(() => {
  return `${statusFilter.value}_${selectedMonth.value}_${selectedScheduleType.value}_${filterPM.value}_${filterCalib.value}_${bulkDeleteMode.value}`
})

// Watch filter changes to reinitialize DataTables
watch([selectedMonth, selectedScheduleType, filterPM, filterCalib], async () => {
  await nextTick()
  await initDataTable()
}, { flush: 'post' })

const {
  importing,
  importErrors,
  importPreview,
  showPreview,
  importMode,
  hasBlockingErrors,
  downloadDaftarAlatTemplate,
  exportDaftarAlat,
  parseImportFile,
  resetImport
} = useExcelImport()

// Import modal state
const showImportModal = ref(false)
const importFileRef = ref(null)

const openImportModal = () => {
  resetImport()
  importMode.value = 'upsert'
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
  resetImport()
  if (importFileRef.value) importFileRef.value.value = ''
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  await parseImportFile(file, 'daftarAlat')
}

const confirmImport = async () => {
  const hasRealErrors = importErrors.value.some(e => !String(e).startsWith('⚠️'))
  if (!importPreview.value.length || hasRealErrors) return
  importing.value = true

  try {
    const results = await daftarAlatApi.upsertBatch(importPreview.value, importMode.value)
    const insertedItems = results.filter(r => r.success && r.action === 'inserted')
    const updatedItems = results.filter(r => r.success && r.action === 'updated')
    const inserted = insertedItems.length
    const updated = updatedItems.length
    const skipped = results.filter(r => r.success && r.action === 'skipped').length
    const failed = results.filter(r => !r.success)

    closeImportModal()
    await fetchList(true)
    await nextTick()
    await initDataTable()
    window.dispatchEvent(new CustomEvent('dashboard:needs-refresh', {
      detail: { source: 'daftaralat-import' }
    }))

    // Navigasi ke halaman terakhir DataTable agar data baru terlihat
    if (inserted > 0) {
      await nextTick()
      try {
        const table = document.querySelector('.daftar-alat-table')
        if (table && $.fn.DataTable.isDataTable(table)) {
          const dt = $(table).DataTable()
          const info = dt.page.info()
          if (info && info.pages > 0) dt.page(info.pages - 1).draw('page')
        }
      } catch (e) { /* DataTable belum siap, skip navigasi */ }
    }

    const parts = []
    if (inserted) parts.push(`${inserted} data baru ditambahkan`)
    if (updated) parts.push(`${updated} data diperbarui`)
    if (skipped) parts.push(`${skipped} data tidak berubah (dilewati)`)
    const msg = parts.join(', ') + '.'

    // Tampilkan daftar No.ID yang baru diinsert jika ada
    const insertedList = insertedItems.slice(0, 10).map(r => r.no_id).join(', ')
    const insertedDetail = inserted > 0 ? `\n\nData baru: ${insertedList}${inserted > 10 ? ` ... (+${inserted - 10} lainnya)` : ''}` : ''
    const updatedList = updatedItems.slice(0, 10).map(r => r.no_id).join(', ')
    const updatedDetail = updated > 0 ? `\nData diperbarui: ${updatedList}${updated > 10 ? ` ... (+${updated - 10} lainnya)` : ''}` : ''
    const detail = `${insertedDetail}${updatedDetail}`

    if (failed.length) {
      const errList = failed.slice(0, 5).map(f => `${f.no_id}: ${f.error}`).join('\n')
      Swal.fire('Import Selesai', `${msg}${detail}\n\nGagal (${failed.length}):\n${errList}`, 'warning')
    } else {
      Swal.fire({ icon: 'success', title: 'Import Berhasil!', html: `${msg}${detail.replace(/\n/g, '<br>')}` })
    }
  } catch (err) {
    Swal.fire('Error!', err.message || 'Gagal import data', 'error')
  } finally {
    importing.value = false
  }
}

// Print Daftar Alat
const handlePrint = () => {
  printService.printDaftarAlat(filteredTools.value)
}

const isLoggedIn = computed(() => permission.isLoggedIn.value)
const isAdmin = computed(() => ['admin', 'superadmin'].includes(permission.user.value?.role))

// Computed untuk permission checks — semua berbasis isAdmin
const canCreate = computed(() => isAdmin.value)
const canEdit = computed(() => isAdmin.value)
const canDelete = computed(() => isAdmin.value)

// ✅ State untuk bulk delete
const selectedTools = ref([])
const bulkDeleteMode = ref(false)

// ✅ Toggle bulk delete mode
const toggleBulkDeleteMode = () => {
  bulkDeleteMode.value = !bulkDeleteMode.value
  if (!bulkDeleteMode.value) {
    selectedTools.value = []
  }
}

// ✅ Check if tool is selected
const isToolSelected = (no) => {
  return selectedTools.value.includes(no)
}

// ✅ Toggle single tool selection
const toggleToolSelection = (no) => {
  const index = selectedTools.value.indexOf(no)
  if (index === -1) {
    selectedTools.value.push(no)
  } else {
    selectedTools.value.splice(index, 1)
  }
}

// ✅ Toggle select all
const toggleSelectAll = () => {
  if (selectedTools.value.length === filteredTools.value.length) {
    selectedTools.value = []
  } else {
    selectedTools.value = filteredTools.value.map(tool => tool.no)
  }
}

// ✅ Check if all tools are selected
const isAllSelected = computed(() => {
  return filteredTools.value.length > 0 && selectedTools.value.length === filteredTools.value.length
})

// ✅ Bulk delete handler
const handleBulkDelete = async () => {
  if (selectedTools.value.length === 0) {
    Swal.fire('Peringatan!', 'Pilih minimal 1 alat untuk dihapus', 'warning')
    return
  }

  try {
    const result = await Swal.fire({
      title: 'Hapus Daftar Alat?',
      html: `Yakin hapus <strong>${selectedTools.value.length}</strong> alat?<br><small class="text-muted">Data tidak bisa dikembalikan!</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const deletedCount = selectedTools.value.length
      
      // Show loading
      Swal.fire({
        title: 'Menghapus...',
        text: 'Sedang menghapus data, mohon tunggu',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Bulk delete (single flow, supports large data via chunking)
      const resultBulk = await bulkDeleteTools(selectedTools.value)

      // Reset
      selectedTools.value = []
      bulkDeleteMode.value = false

      // Refresh data dan reinit DataTable agar kolom checkbox tersembunyi kembali
      await fetchList(true)
      await nextTick()
      await initDataTable()

      if (resultBulk?.failedChunks?.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Bulk Delete Selesai Sebagian',
          html: `Berhasil menghapus <strong>${resultBulk.deletedCount}</strong> dari <strong>${deletedCount}</strong> alat.<br><small class="text-muted">Beberapa chunk gagal, silakan ulangi untuk sisa data.</small>`
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `${resultBulk?.deletedCount ?? deletedCount} alat berhasil dihapus.`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    }
  } catch (error) {
    console.error('Error saat bulk delete:', error)
    Swal.fire('Error!', error.message || 'Gagal menghapus alat', 'error')
  }
}

// Template untuk field form
const getEmptyTool = () => ({
  no: '',
  no_id: '',
  description: '',
  type_model: '',
  sn: '',
  year: '',
  area: '',
  crit_product: '',
  crit_process: '',
  crit_safety: '',
  crit_env: '',
  pm_overall: '',
  pm_6monthly: '',
  pm_yearly: '',
  pm_internal_external: '',
  calib_yesno: '',
  calib_schedule: '',
  location: '',
  status: 'active',
  status_pm: '',
  status_calibration: ''
})

// State untuk modal
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingTool = ref(getEmptyTool())

// Computed untuk judul modal
const modalTitle = computed(() =>
  isEditMode.value ? 'Edit Daftar Alat ' : 'Tambah Alat Baru'
)

// Computed untuk text tombol simpan
const saveButtonText = computed(() =>
  isEditMode.value ? 'Simpan Perubahan' : 'Tambah Alat'
)

// ✅ DYNAMIC REFERENCE
const documentRefEquipment = computed(() => {
  return config.value.documentRefEquipment
})

// Refresh data
const refresh = () => fetchList()

// Buka modal TAMBAH
const openCreateModal = () => {
  editingTool.value = getEmptyTool()
  isEditMode.value = false
  isModalOpen.value = true
}

// Buka modal EDIT
const openEditModal = (tool) => {
  editingTool.value = {
    no: tool.no || '',
    no_id: tool.no_id || '',
    description: tool.description || '',
    type_model: tool.type_model || '',
    sn: tool.sn || '',
    year: tool.year || '',
    area: tool.area || '',
    crit_product: tool.crit_product || '',
    crit_process: tool.crit_process || '',
    crit_safety: tool.crit_safety || '',
    crit_env: tool.crit_env || '',
    pm_overall: tool.pm_overall || '',
    pm_6monthly: tool.pm_6monthly || '',
    pm_yearly: tool.pm_yearly || '',
    pm_internal_external: tool.pm_internal_external || '',
    calib_yesno: tool.calib_yesno || '',
    calib_schedule: tool.calib_schedule || '',
    location: tool.location || '',
    status: tool.status || 'active',
    status_pm: tool.status_pm || '',
    status_calibration: tool.status_calibration || ''
  }
  isEditMode.value = true
  isModalOpen.value = true
}

// Tutup modal
const closeModal = () => {
  isModalOpen.value = false
  editingTool.value = getEmptyTool()
  isEditMode.value = false
}

// Simpan (Create/Update)
const saveEditingTool = async () => {
  try {
    await saveTool(editingTool.value)
    closeModal()
  } catch (error) {
    console.error('Gagal menyimpan:', error)
  }
}

// Hapus
const handleDelete = (no) => {
  deleteTool(no)
}

// Format audit trail info untuk tooltip
const formatAuditInfo = (tool) => {
  const parts = []

  if (tool.created_at) {
    const date = new Date(tool.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Dibuat: ${date}`)
    if (tool.created_by) parts.push(`oleh ${tool.created_by}`)
  }

  if (tool.updated_at && tool.updated_at !== tool.created_at) {
    const date = new Date(tool.updated_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Update: ${date}`)
    if (tool.updated_by) parts.push(`oleh ${tool.updated_by}`)
  }

  return parts.join('\n') || 'Tidak ada informasi audit'
}

onMounted(async () => {
  await fetchList()
  await nextTick()
  await initDataTable()
})
</script>

<template>
  <div class="content-wrapper">
<!-- Header dengan Tombol Tambah & Print -->
<section class="content-header">
  <div class="container-fluid">
    
    <!-- Baris 1: Judul + Filter Status + Tombol Aksi (Print/Tambah) -->
    <div class="d-flex justify-content-between align-items-center mb-2 header-row">
      
      <!-- Kiri: Judul -->
      <div>
        <h1 class="page-title mb-0">Daftar Alat & Perawatan</h1>
        <small class="page-subtitle">No Reff: {{ documentRefEquipment }}</small>
      </div>

      <!-- Kanan: Status Toggle (Aktif/Obsolete/Semua) + Print + Tambah -->
      <div class="d-flex align-items-center flex-wrap gap-2">
        <!-- Filter toggle status alat (Aktif, Obsolete, Semua) -->
        <div class="btn-group btn-group-sm" role="group" aria-label="Status Alat">
          <button
            type="button"
            class="btn"
            :class="statusFilter === 'active' ? 'btn-success' : 'btn-outline-success'"
            @click="setStatusFilter('active')"
          >Aktif</button>
          <button
            type="button"
            class="btn"
            :class="statusFilter === 'obsolete' ? 'btn-secondary' : 'btn-outline-secondary'"
            @click="setStatusFilter('obsolete')"
          >Obsolete</button>
          <button
            type="button"
            class="btn"
            :class="statusFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'"
            @click="setStatusFilter('all')"
          >Semua</button>
        </div>

        <!-- Pemisah visual / jarak pembeda group -->
        <div class="header-divider d-none d-sm-block"></div>

        <!-- Tombol Print (diberi jarak agar jadi pembeda group) -->
        <button 
          class="btn btn-outline-info btn-sm d-flex align-items-center ml-1" 
          @click="handlePrint" 
          title="Print daftar alat"
        >
          <i class="fas fa-print"></i>
          <span class="btn-label-mobile ml-1">Print</span>
        </button>
        
        <!-- Tombol Tambah: hanya admin -->
        <button v-if="canCreate" class="btn btn-info btn-sm d-flex align-items-center" @click="openCreateModal">
          <i class="fas fa-plus mr-1"></i><span class="btn-label-mobile">Tambah Alat</span>
        </button>
      </div>
    </div>

    <!-- Baris 2: Export/Import (hanya untuk admin) -->
    <div class="header-actions d-flex justify-content-end align-items-center flex-wrap gap-2" v-if="isAdmin">
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-success" @click="exportDaftarAlat(filteredTools)" title="Export ke Excel">
          <i class="fas fa-file-excel"></i><span class="btn-label-mobile ml-1">Export</span>
        </button>
        <button class="btn btn-outline-secondary" @click="downloadDaftarAlatTemplate" title="Download template">
          <i class="fas fa-download"></i><span class="btn-label-mobile ml-1">Template</span>
        </button>
        <button class="btn btn-outline-primary" @click="openImportModal" title="Import dari Excel">
          <i class="fas fa-file-upload"></i><span class="btn-label-mobile ml-1">Import</span>
        </button>
      </div>
    </div>
    
  </div>
</section>

    <section class="content">
      <div class="container-fluid">

        <!-- PANEL CARD FILTER -->
        <div class="card card-outline card-info mb-3 filter-panel shadow-sm no-print" :class="{ 'collapsed-card': !isFilterExpanded }">
          <div class="card-header py-2 d-flex justify-content-between align-items-center cursor-pointer" @click="toggleFilter" title="Klik untuk membuka / menutup filter">
            <h3 class="card-title font-weight-bold d-flex align-items-center mb-0" style="font-size: 0.95rem;">
              <i class="fas fa-filter text-info mr-2"></i>
              <span>Filter Data Alat</span>
              <span v-if="activeFilterCount > 0" class="badge badge-info ml-2">
                {{ activeFilterCount }} Filter Aktif
              </span>
              <span class="badge badge-light border ml-2 text-muted">
                Menampilkan <strong>{{ filteredTools.length }}</strong> dari <strong>{{ tools.length }}</strong> alat
              </span>
            </h3>
            <div class="card-tools d-flex align-items-center" @click.stop>
              <button 
                v-if="activeFilterCount > 0" 
                class="btn btn-xs btn-outline-danger mr-2" 
                @click="resetFilters" 
                title="Reset semua filter"
              >
                <i class="fas fa-undo mr-1"></i>Reset Filter
              </button>
              <button 
                type="button" 
                class="btn btn-tool" 
                @click="toggleFilter"
                :title="isFilterExpanded ? 'Tutup Filter' : 'Buka Filter'"
              >
                <i :class="isFilterExpanded ? 'fas fa-minus' : 'fas fa-plus'"></i>
              </button>
            </div>
          </div>
          <div v-show="isFilterExpanded" class="card-body py-3">
            <div class="row">
              <!-- 1. Filter Bulan Jadwal -->
              <div class="col-lg-3 col-md-6 col-sm-12 mb-2">
                <label class="form-label text-muted small font-weight-bold mb-1">
                  <i class="fas fa-calendar-alt text-info mr-1"></i>Bulan Jadwal:
                </label>
                <select v-model="selectedMonth" class="form-control form-control-sm custom-select">
                  <option value="">-- Semua Bulan --</option>
                  <option v-for="m in monthOptions" :key="m.value" :value="m.value">
                    {{ m.label }} ({{ m.value }})
                  </option>
                </select>
              </div>

              <!-- 2. Tipe Jadwal (Aktif bila bulan dipilih) -->
              <div class="col-lg-3 col-md-6 col-sm-12 mb-2">
                <label class="form-label text-muted small font-weight-bold mb-1">
                  <i class="fas fa-tasks text-info mr-1"></i>Tipe Jadwal Bulan:
                </label>
                <select 
                  v-model="selectedScheduleType" 
                  class="form-control form-control-sm custom-select"
                  :disabled="!selectedMonth"
                >
                  <option value="all">Semua (PM & Kalibrasi)</option>
                  <option value="pm">Hanya Jadwal PM</option>
                  <option value="calib">Hanya Jadwal Kalibrasi</option>
                </select>
              </div>

              <!-- 3. Filter Memerlukan PM -->
              <div class="col-lg-3 col-md-6 col-sm-12 mb-2">
                <label class="form-label text-muted small font-weight-bold mb-1">
                  <i class="fas fa-tools text-warning mr-1"></i>Perawatan PM:
                </label>
                <select v-model="filterPM" class="form-control form-control-sm custom-select">
                  <option value="all">Semua</option>
                  <option value="Y">Hanya Ada PM (Y)</option>
                  <option value="N">Tanpa PM (N)</option>
                </select>
              </div>

              <!-- 4. Filter Memerlukan Kalibrasi -->
              <div class="col-lg-3 col-md-6 col-sm-12 mb-2">
                <label class="form-label text-muted small font-weight-bold mb-1">
                  <i class="fas fa-balance-scale text-success mr-1"></i>Kalibrasi:
                </label>
                <select v-model="filterCalib" class="form-control form-control-sm custom-select">
                  <option value="all">Semua</option>
                  <option value="Y">Hanya Ada Kalibrasi (Y)</option>
                  <option value="N">Tanpa Kalibrasi (N)</option>
                </select>
              </div>
            </div>

            <!-- Chips / Tag Filter Aktif -->
            <div v-if="activeFilterCount > 0" class="filter-chips d-flex align-items-center flex-wrap gap-2 mt-2 pt-2 border-top">
              <small class="text-muted font-weight-bold mr-2"><i class="fas fa-tags mr-1"></i>Filter Aktif:</small>
              <span v-if="selectedMonth" class="badge badge-info p-1 px-2 cursor-pointer" @click="selectedMonth = ''" title="Hapus filter bulan">
                Bulan: {{ selectedMonth }} <i class="fas fa-times ml-1"></i>
              </span>
              <span v-if="selectedMonth && selectedScheduleType !== 'all'" class="badge badge-secondary p-1 px-2 cursor-pointer" @click="selectedScheduleType = 'all'" title="Reset tipe jadwal">
                Tipe: {{ selectedScheduleType === 'pm' ? 'Jadwal PM' : 'Jadwal Kalibrasi' }} <i class="fas fa-times ml-1"></i>
              </span>
              <span v-if="filterPM !== 'all'" class="badge badge-warning p-1 px-2 cursor-pointer" @click="filterPM = 'all'" title="Hapus filter PM">
                PM: {{ filterPM === 'Y' ? 'Ada PM (Y)' : 'Tanpa PM (N)' }} <i class="fas fa-times ml-1"></i>
              </span>
              <span v-if="filterCalib !== 'all'" class="badge badge-success p-1 px-2 cursor-pointer" @click="filterCalib = 'all'" title="Hapus filter Kalibrasi">
                Kalibrasi: {{ filterCalib === 'Y' ? 'Ada Kalibrasi (Y)' : 'Tanpa Kalibrasi (N)' }} <i class="fas fa-times ml-1"></i>
              </span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
              <p class="mt-2">Memuat data...</p>
            </div>

            <div v-else :class="{ 'bulk-delete-active': bulkDeleteMode }">
              <!-- Bulk delete buttons - sejajar dengan DataTables controls -->
              <div class="bulk-delete-wrapper no-print" v-if="isLoggedIn && canDelete">
                <!-- Tombol Hapus Banyak - di tengah -->
                <button
                  class="btn btn-outline-danger btn-sm bulk-delete-toggle-btn"
                  :class="{ 'active': bulkDeleteMode }"
                  @click="toggleBulkDeleteMode"
                  title="Mode hapus banyak"
                >
                  <i class="fas fa-trash-alt mr-1"></i>
                  {{ bulkDeleteMode ? 'Cancel' : 'Delete' }}
                </button>
                <!-- Tombol Hapus X Alat - di kanan dekat search -->
                <button
                  v-if="bulkDeleteMode && selectedTools.length > 0"
                  class="btn btn-danger btn-sm bulk-delete-action-btn"
                  @click="handleBulkDelete"
                  title="Hapus alat yang dipilih"
                >
                  <i class="fas fa-trash mr-1"></i>Delete {{ selectedTools.length }} Alat
                </button>
              </div>

              <!-- Wrapper dengan key agar DataTables diinisialisasi ulang bersih saat filter berubah -->
              <div :key="tableRenderKey" class="table-responsive">
                <table class="table table-bordered table-hover daftar-alat-table">
                  <thead>
                    <tr>
                      <th rowspan="2" class="align-middle checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @click.stop="toggleSelectAll"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </th>
                    <th rowspan="2" class="align-middle no-column">No</th>
                    <th rowspan="2" class="align-middle">No. ID</th>
                    <th rowspan="2" class="align-middle">Description</th>
                    <th rowspan="2" class="align-middle">Type/Model</th>
                    <th rowspan="2" class="align-middle">SN</th>
                    <th rowspan="2" class="align-middle">Year</th>
                    <th colspan="4" class="text-center">Criticality (Y/N)</th>
                    <th colspan="4" class="text-center">PM</th>
                    <th colspan="2" class="text-center">Calibration</th>
                    <th rowspan="2" class="align-middle">Area</th>
                    <th rowspan="2" class="align-middle">Location</th>
                    <!-- <th colspan="2" class="text-center">Status</th> -->
                    <th rowspan="2" class="align-middle text-center">Aksi</th>
                  </tr>
                  <tr>
                    <th>Product</th>
                    <th>Process</th>
                    <th>Safety</th>
                    <th>Environment</th>
                    <th>Y/N</th>
                    <th>6 Monthly</th>
                    <th>Yearly</th>
                    <th>Internal/<br>External</th>
                    <th>Y/N</th>
                    <th>Schedule</th>
                    <!-- <th>PM</th>
                    <th>Calibration</th> -->
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(tool, index) in filteredTools" :key="tool.no" :class="{'table-secondary': tool.status === 'obsolete'}">
                    <td class="text-center checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isToolSelected(tool.no)"
                        @click.stop="toggleToolSelection(tool.no)"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </td>
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ tool.no_id || '—' }}
                      <span v-if="tool.status === 'obsolete'" class="badge badge-secondary ml-1">obsolete</span>
                      <!-- Audit trail tooltip -->
                      <span v-if="tool.created_at || tool.updated_at" class="ml-1" style="cursor: help;" :title="formatAuditInfo(tool)">
                        <i class="fas fa-info-circle text-muted" style="font-size: 0.75rem;"></i>
                      </span>
                    </td>
                    <td>{{ tool.description || '—' }}</td>
                    <td>{{ tool.type_model || '—' }}</td>
                    <td>{{ tool.sn || '—' }}</td>
                    <td>{{ tool.year || '—' }}</td>
                    <td class="text-center">{{ tool.crit_product || '—' }}</td>
                    <td class="text-center">{{ tool.crit_process || '—' }}</td>
                    <td class="text-center">{{ tool.crit_safety || '—' }}</td>
                    <td class="text-center">{{ tool.crit_env || '—' }}</td>
                    <td>{{ tool.pm_overall || '—' }}</td>
                    <td>{{ tool.pm_6monthly || '—' }}</td>
                    <td>{{ tool.pm_yearly || '—' }}</td>
                    <td>{{ tool.pm_internal_external || '—' }}</td>
                    <td>{{ tool.calib_yesno || '—' }}</td>
                    <td>{{ tool.calib_schedule?.trim() || '—' }}</td>
                    <td>{{ tool.area || '—' }}</td>
                    <td>{{ tool.location || '—' }}</td>
                    <!-- <td>
                      <span v-if="tool.status_pm === 'Selesai'" class="badge badge-success">Selesai</span>
                      <span v-else-if="tool.status_pm" class="badge badge-warning">{{ tool.status_pm }}</span>
                    </td> -->
                    <!-- <td>
                      <span v-if="tool.status_calibration === 'Selesai'" class="badge badge-success">Selesai</span>
                      <span v-else-if="tool.status_calibration" class="badge badge-warning">{{ tool.status_calibration }}</span>
                    </td> -->
                    <td class="text-center">
                      <button v-if="canEdit" class="btn btn-warning btn-sm mr-1" @click="openEditModal(tool)">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button v-if="canDelete" class="btn btn-danger btn-sm" @click="handleDelete(tool.no)">
                        <i class="fas fa-trash"></i>
                      </button>
                      <span v-if="!canEdit && !canDelete" class="text-muted">
                        <i class="fas fa-lock mr-1"></i>
                      </span>
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

    <!-- Modal Import Excel -->
    <div
      v-if="showImportModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block; background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-file-upload mr-2"></i>Import Daftar Alat</h5>
            <button type="button" class="close" @click="closeImportModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle mr-1"></i>
              Upload file Excel (.xlsx) sesuai format template. Kolom <strong>No.ID</strong> wajib diisi.
              <a href="#" class="ml-2" @click.prevent="downloadDaftarAlatTemplate">
                <i class="fas fa-download mr-1"></i>Download Template
              </a>
            </div>

            <!-- Mode Import -->
            <div class="form-group">
              <label class="font-weight-bold">Mode Import</label>
              <div class="d-flex">
                <div class="custom-control custom-radio mr-4">
                  <input type="radio" id="mode-upsert" class="custom-control-input" value="upsert" v-model="importMode" />
                  <label class="custom-control-label" for="mode-upsert">
                    Tambah + Update <small class="text-muted">(data baru ditambah, data berubah diupdate, data sama dilewati)</small>
                  </label>
                </div>
                <div class="custom-control custom-radio">
                  <input type="radio" id="mode-insert" class="custom-control-input" value="insert_only" v-model="importMode" />
                  <label class="custom-control-label" for="mode-insert">
                    Hanya Data Baru <small class="text-muted">(data yang sudah ada tidak disentuh)</small>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Pilih File Excel</label>
              <input
                ref="importFileRef"
                type="file"
                accept=".xlsx,.xls"
                class="form-control-file"
                @change="handleFileChange"
                :disabled="importing"
              />
            </div>

            <!-- Error list -->
            <div v-if="importErrors.length" class="alert alert-danger">
              <strong>Ditemukan error:</strong>
              <ul class="mb-0 mt-1">
                <li v-for="(err, i) in importErrors" :key="i">{{ err }}</li>
              </ul>
            </div>

            <!-- Preview table -->
            <div v-if="showPreview && importPreview.length" class="mt-3">
              <p class="font-weight-bold">Preview <span class="badge badge-primary">{{ importPreview.length }} baris</span></p>
              <div style="max-height: 300px; overflow-y: auto;">
                <table class="table table-sm table-bordered">
                  <thead class="thead-light">
                    <tr>
                      <th>No.ID</th>
                      <th>Description</th>
                      <th>Type/Model</th>
                      <th>PM Y/N</th>
                      <th>Cal Y/N</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in importPreview" :key="i">
                      <td>{{ row.no_id || '-' }}</td>
                      <td>{{ row.description || '-' }}</td>
                      <td>{{ row.type_model || '-' }}</td>
                      <td class="text-center">{{ row.pm_overall || '-' }}</td>
                      <td class="text-center">{{ row.calib_yesno || '-' }}</td>
                      <td>{{ row.location || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeImportModal" :disabled="importing">Batal</button>
            <button
              class="btn btn-primary"
              @click="confirmImport"
              :disabled="importing || !importPreview.length || hasBlockingErrors"
            >
              <span v-if="importing">
                <span class="spinner-border spinner-border-sm mr-1"></span>Mengimport...
              </span>
              <span v-else><i class="fas fa-check mr-1"></i>Import {{ importPreview.length }} Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Create/Edit -->
    <div  
      v-if="isModalOpen"
      class="modal fade show" 
      tabindex="-1"
      style="display: block; background-color: rgba(0, 0, 0, 0.5);"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalTitle }}</h5>
            <button 
              type="button" 
              class="close" 
              @click="closeModal"
              :disabled="isSaving"
            >
              &times;
            </button>
          </div>
          <div class="modal-body">
            <!-- Basic Information -->
            <div class="row">
              <div class="col-md-6">
                <div v-if="editingTool.no" class="form-group">
                  <label>No.</label>
                  <input v-model="editingTool.no" type="text" class="form-control" readonly />
                </div>
                <div class="form-group">
                  <label>No. ID</label>
                  <input v-model="editingTool.no_id" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input v-model="editingTool.description" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Type/Model</label>
                  <input v-model="editingTool.type_model" type="text" class="form-control" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>SN</label>
                  <input v-model="editingTool.sn" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Year</label>
                  <input v-model="editingTool.year" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Area</label>
                  <input v-model="editingTool.area" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Location</label>
                  <input v-model="editingTool.location" type="text" class="form-control" />
                </div>
                <div v-if="isEditMode" class="form-group">
                  <label>Status Alat</label>
                  <select
                    v-model="editingTool.status"
                    class="form-control font-weight-bold"
                    :class="{
                      'border-success text-success': editingTool.status === 'active',
                      'border-secondary text-secondary': editingTool.status === 'obsolete'
                    }"
                    :style="editingTool.status === 'active'
                      ? 'background-color:#f0fff4; border-width:2px;'
                      : 'background-color:#f5f5f5; border-width:2px;'"
                  >
                    <option value="active" style="color:#28a745; font-weight:600;">✓ Aktif</option>
                    <option value="obsolete" style="color:#6c757d; font-weight:600;">✕ Obsolete</option>
                  </select>
                  <small class="mt-1 d-block">
                    <span v-if="editingTool.status === 'active'" class="text-success">
                      <i class="fas fa-check-circle mr-1"></i>Alat aktif dan dapat digunakan
                    </span>
                    <span v-else class="text-secondary">
                      <i class="fas fa-ban mr-1"></i>Alat tidak aktif / sudah tidak digunakan
                    </span>
                  </small>
                </div>
              </div>
            </div>

            <!-- Criticality -->
            <div class="row">
              <div class="col-12">
                <h6 class="font-weight-bold mb-3 mt-3 text-secondary">
                  <small>CRITICALITY</small>
                </h6>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Product (Y/N)</label>
                  <input v-model="editingTool.crit_product" type="text" class="form-control" maxlength="1" />
                </div>
                <div class="form-group">
                  <label>Safety (Y/N)</label>
                  <input v-model="editingTool.crit_safety" type="text" class="form-control" maxlength="1" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Process (Y/N)</label>
                  <input v-model="editingTool.crit_process" type="text" class="form-control" maxlength="1" />
                </div>
                <div class="form-group">
                  <label>Environment (Y/N)</label>
                  <input v-model="editingTool.crit_env" type="text" class="form-control" maxlength="1" />
                </div>
              </div>
            </div>

            <!-- Preventive Maintenance -->
            <div class="row">
              <div class="col-12">
                <h6 class="font-weight-bold mb-3 mt-3 text-secondary">
                  <small>PREVENTIVE MAINTENANCE</small>
                </h6>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Overall (Y/N)</label>
                  <input v-model="editingTool.pm_overall" type="text" class="form-control" maxlength="1" />
                </div>
                <div class="form-group">
                  <label>Yearly</label>
                  <input v-model="editingTool.pm_yearly" type="text" class="form-control" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>6 Monthly</label>
                  <input v-model="editingTool.pm_6monthly" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Internal/External</label>
                  <input v-model="editingTool.pm_internal_external" type="text" class="form-control" />
                </div>
              </div>
            </div>

            <!-- Calibration -->
            <div class="row">
              <div class="col-12">
                <h6 class="font-weight-bold mb-3 mt-3 text-secondary">
                  <small>CALIBRATION</small>
                </h6>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Required (Y/N)</label>
                  <input v-model="editingTool.calib_yesno" type="text" class="form-control" maxlength="1" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Schedule</label>
                  <input v-model="editingTool.calib_schedule" type="text" class="form-control" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="closeModal"
              :disabled="isSaving"
            >
              Batal
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="saveEditingTool"
              :disabled="isSaving"
            >
              <span v-if="isSaving">
                <span class="spinner-border spinner-border-sm mr-1"></span>
                Menyimpan...
              </span>
              <span v-else>
                {{ saveButtonText }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ✅ Bulk delete controls styling */
.bulk-delete-wrapper {
  position: relative;
  height: 0;
  z-index: 10;
}

/* Tombol Hapus Banyak - di tengah */
.bulk-delete-toggle-btn {
  position: absolute;
  left: 20%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* Tombol Hapus X Alat - di kanan dekat search box */
.bulk-delete-action-btn {
  position: absolute;
  right: 220px;
  top: 0;
  white-space: nowrap;
}

/* ✅ Checkbox column styling */
.checkbox-column {
  width: 0;
  min-width: 0;
  max-width: 0;
  padding: 0 !important;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Tampilkan kolom saat bulk delete mode aktif */
.bulk-delete-active .checkbox-column {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 0.5rem !important;
}

.checkbox-column input[type="checkbox"] {
  visibility: hidden !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease;
  cursor: pointer;
  position: relative;
  z-index: 1;
  pointer-events: none !important;
}

/* Tampilkan checkbox saat bulk delete mode aktif */
.bulk-delete-active .checkbox-column input[type="checkbox"] {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

.cursor-pointer {
  cursor: pointer;
}

/* Header styling */
.daftar-alat-table thead th {
  vertical-align: middle;
  font-weight: 600;
  background-color: #f2f7fc;
}

.daftar-alat-table thead tr:first-child th {
  padding: 0.75rem;
}

.daftar-alat-table thead tr:nth-child(2) th {
  font-size: 0.85rem;
  padding: 0.4rem 0.5rem;
}

/* Konten tabel */
.daftar-alat-table th,
.daftar-alat-table td {
  white-space: nowrap;
  padding: 0.5rem;
}

/* ✅ Kolom No - lebar kecil */
.daftar-alat-table .no-column {
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  text-align: center;
}

.daftar-alat-table td:nth-child(2) {
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  text-align: center;
}

/* Kolom centered */
.daftar-alat-table .text-center {
  text-align: center;
}

/* Lebar minimum untuk kolom penting (opsional) */
.daftar-alat-table th:first-child,
.daftar-alat-table td:first-child {
  min-width: 50px;
}

.daftar-alat-table th:nth-child(2),
.daftar-alat-table td:nth-child(2) {
  min-width: 120px;
}

/* Modal scrollable styling */
.modal-dialog {
  max-height: calc(100vh - 2rem);
  display: flex;
}

.modal-content {
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
}

/* Print button wrapper styling */
.print-button-wrapper {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.modal-body {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  flex: 1;
}

/* ✅ Utility: gap konsisten untuk flex container */
.gap-2 {
  gap: 0.5rem !important;
}

/* ✅ Header alignment fixes */
.header-row {
  flex-wrap: wrap;
  gap: 1rem;
}

.header-actions {
  padding-top: 0.25rem;
}

/* ✅ Tombol Print konsisten ukurannya */
.btn-outline-info.btn-sm {
  min-width: auto;
  padding: 0.25rem 0.75rem;
}

/* Pemisah antar grup tombol di header */
.header-divider {
  width: 1px;
  height: 22px;
  background-color: #dee2e6;
  margin: 0 0.5rem;
}

/* ✅ Responsive: tumpuk rapi di mobile */
@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .header-row > div {
    width: 100%;
    justify-content: space-between !important;
  }
  
  .btn-label-mobile {
    display: inline !important;
  }
  
  .header-actions {
    justify-content: flex-start !important;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

/* Filter Panel Styling */
.filter-panel {
  border-radius: 0.5rem;
  border-top: 3px solid #17a2b8;
}

.filter-panel .card-header {
  background-color: #f8fbfd;
  border-bottom: 1px solid #e9f2f8;
}

.filter-panel .card-header.cursor-pointer {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.filter-panel .card-header.cursor-pointer:hover {
  background-color: #f0f7fb;
}

.filter-panel .custom-select {
  border-radius: 0.25rem;
  font-size: 0.85rem;
  border-color: #ced4da;
}

.filter-panel .custom-select:focus {
  border-color: #17a2b8;
  box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
}

.filter-chips .badge {
  font-size: 0.78rem;
  font-weight: 500;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.filter-chips .badge:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

/* ✅ Sembunyikan label teks di layar kecil (opsional) */
@media (max-width: 576px) {
  .btn-label-mobile {
    display: none !important;
  }
  .btn-outline-info.btn-sm,
  .btn-group-sm > .btn {
    padding: 0.25rem 0.5rem;
  }
}
</style>