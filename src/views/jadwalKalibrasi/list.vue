<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useJadwalKalibrasi } from '@/composables/useJadwalKalibrasi'
import { useDaftarAlat } from '@/composables/useDaftarAlat'
import { useFrontendConfig } from '@/composables/useConfig'
import { usePermissions } from '@/composables/usePermissions'
import { useExcelImport } from '@/composables/useExcelImport'
import { jadwalKalibrasiApi } from '@/api'
import { printService } from '@/services/printService'

// ✅ Ambil semua fungsi CRUD
const {
  refJadwal,
  loading,
  fetchList,
  saveJadwal,
  deleteJadwal,
  bulkDeleteJadwal,
  isSaving,
  initDataTable,
  startAutoRefresh,
  stopAutoRefresh
} = useJadwalKalibrasi()

const { config } = useFrontendConfig()

const {
  importing,
  importErrors,
  importPreview,
  showPreview,
  importMode,
  hasBlockingErrors: hasBlockingErrorsFromImport,
  downloadJadwalKalibrasiTemplate,
  exportJadwalKalibrasi,
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
  await parseImportFile(file, 'jadwalKalibrasi')
}

// ✅ Computed: daftar no_id yang tidak terdaftar di Daftar Alat (untuk display di error list)
const unregisteredNoIds = computed(() => {
  if (!importPreview.value.length) return []
  return [...new Set(
    importPreview.value
      .filter(row => {
        if (!row.no_id) return true
        return !(daftarAlat.value || []).some(t => String(t.no_id) === String(row.no_id))
      })
      .map(row => row.no_id)
      .filter(Boolean)
  )]
})

const hasImportBlockingErrors = computed(() => {
  const realErrors = importErrors.value.some(e => !String(e).startsWith('⚠️'))
  return realErrors || unregisteredNoIds.value.length > 0
})

const confirmImport = async () => {
  // Cek error dari import + unregistered no_id
  if (!importPreview.value.length || hasImportBlockingErrors.value) return

  importing.value = true

  try {
    const results = await jadwalKalibrasiApi.upsertBatch(importPreview.value, importMode.value)
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

    // Navigasi ke halaman terakhir agar data baru terlihat
    if (inserted > 0) {
      await nextTick()
      try {
        const table = document.querySelector('.jadwal-kalibrasi-table')
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

// Print Jadwal Kalibrasi
const handlePrint = () => {
  const now = new Date()
  const month = now.toLocaleString('id-ID', { month: 'long' })
  const year = now.getFullYear()
  printService.printJadwalKalibrasi(refJadwal.value, month, year)
}
const permission = usePermissions()

const isLoggedIn = computed(() => permission.isLoggedIn.value)
const isAdmin = computed(() => ['admin', 'superadmin'].includes(permission.user.value?.role))

// Computed untuk permission checks — semua berbasis isAdmin
const canCreate = computed(() => isAdmin.value)
const canEdit = computed(() => isAdmin.value)
const canDelete = computed(() => isAdmin.value)

// ✅ State untuk bulk delete
const selectedJadwal = ref([])
const bulkDeleteMode = ref(false)

// ✅ Toggle bulk delete mode
const toggleBulkDeleteMode = () => {
  bulkDeleteMode.value = !bulkDeleteMode.value
  if (!bulkDeleteMode.value) {
    selectedJadwal.value = []
  }
}

// ✅ Check if jadwal is selected
const isJadwalSelected = (no) => {
  return selectedJadwal.value.includes(no)
}

// ✅ Toggle single jadwal selection
const toggleJadwalSelection = (no) => {
  const index = selectedJadwal.value.indexOf(no)
  if (index === -1) {
    selectedJadwal.value.push(no)
  } else {
    selectedJadwal.value.splice(index, 1)
  }
}

// ✅ Toggle select all
const toggleSelectAll = () => {
  if (selectedJadwal.value.length === refJadwal.value.length) {
    selectedJadwal.value = []
  } else {
    selectedJadwal.value = refJadwal.value.map(jadwal => jadwal.no)
  }
}

// ✅ Check if all selected
const isAllSelected = computed(() => {
  return refJadwal.value.length > 0 && selectedJadwal.value.length === refJadwal.value.length
})

// ✅ Bulk delete handler
const handleBulkDelete = async () => {
  if (selectedJadwal.value.length === 0) {
    Swal.fire('Peringatan!', 'Pilih minimal 1 jadwal untuk dihapus', 'warning')
    return
  }

  try {
    const result = await Swal.fire({
      title: 'Hapus Jadwal Kalibrasi?',
      html: `Yakin hapus <strong>${selectedJadwal.value.length}</strong> jadwal?<br><small class="text-muted">Data tidak bisa dikembalikan!</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const deletedCount = selectedJadwal.value.length
      
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
      const resultBulk = await bulkDeleteJadwal(selectedJadwal.value)

      // Reset
      selectedJadwal.value = []
      bulkDeleteMode.value = false

      if (resultBulk?.failedChunks?.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Bulk Delete Selesai Sebagian',
          html: `Berhasil menghapus <strong>${resultBulk.deletedCount}</strong> dari <strong>${deletedCount}</strong> jadwal.<br><small class="text-muted">Beberapa chunk gagal, silakan ulangi untuk sisa data.</small>`
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `${resultBulk?.deletedCount ?? deletedCount} jadwal berhasil dihapus.`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    }
  } catch (error) {
    console.error('Error saat bulk delete:', error)
    Swal.fire('Error!', error.message || 'Gagal menghapus jadwal', 'error')
  }
}

// Ambil daftar alat untuk menampilkan opsi No.ID di modal
const { tools: daftarAlat, loading: loadingAlat, fetchList: fetchDaftarAlat } = useDaftarAlat()

// Template untuk field form
const getEmptyJadwal = () => ({
  no: '',
  no_id: '',
  description: '',
  cal_id: '',
  parameter: '',
  process_range: '',
  reject_error: '',
  interval: '',
  due_date: '',
  remark: '',
  criticality: ''
})

// State untuk modal
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingJadwal = ref(getEmptyJadwal())

// Searchable No.ID dropdown
const noIdSearch = ref('')
const showNoIdDropdown = ref(false)
const noIdValidationState = ref({ isValid: true, message: '' }) // ✅ State untuk validasi

const filteredDaftarAlat = computed(() => {
  if (!noIdSearch.value) return daftarAlat.value || []
  const q = noIdSearch.value.toLowerCase()
  return (daftarAlat.value || []).filter(t =>
    t.no_id?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
  )
})

// ✅ Watch untuk validasi no_id secara real-time
watch(
  () => editingJadwal.value.no_id,
  (newNoId) => {
    if (!newNoId) {
      noIdValidationState.value = { isValid: true, message: '' }
      editingJadwal.value.description = ''
      return
    }
    const found = (daftarAlat.value || []).find((t) => String(t.no_id) === String(newNoId))
    if (found) {
      noIdValidationState.value = { isValid: true, message: '' }
      editingJadwal.value.description = found.description || ''
    } else {
      // ✅ No.ID tidak ditemukan di daftar alat
      noIdValidationState.value = {
        isValid: false,
        message: `No.ID "${newNoId}" tidak terdaftar di Daftar Alat`
      }
      editingJadwal.value.description = ''
    }
  }
)
const selectNoId = (noId) => {
  editingJadwal.value.no_id = noId
  noIdSearch.value = noId
  showNoIdDropdown.value = false
}

// Sync search text saat modal dibuka
watch(isModalOpen, (val) => {
  if (val) {
    noIdSearch.value = editingJadwal.value.no_id || ''
    // Reset validation state saat modal dibuka
    if (editingJadwal.value.no_id) {
      const found = (daftarAlat.value || []).find((t) => String(t.no_id) === String(editingJadwal.value.no_id))
      noIdValidationState.value = {
        isValid: !!found,
        message: found ? '' : `No.ID "${editingJadwal.value.no_id}" tidak terdaftar di Daftar Alat`
      }
    } else {
      noIdValidationState.value = { isValid: true, message: '' }
    }
  }
})

// Computed untuk judul modal
const modalTitle = computed(() =>
  isEditMode.value ? 'Edit Jadwal Kalibrasi' : 'Tambah Jadwal Kalibrasi'
)

// Computed untuk text tombol simpan
const saveButtonText = computed(() =>
  isEditMode.value ? 'Simpan Perubahan' : 'Tambah Jadwal'
)

// ✅ DYNAMIC REFERENCE
const documentRefCalibration = computed(() => {
  return config.value.documentRefCalibration
})

// Sync search text saat modal dibuka
watch(isModalOpen, (val) => {
  if (val) {
    noIdSearch.value = editingJadwal.value.no_id || ''
    // Reset validation state saat modal dibuka
    if (editingJadwal.value.no_id) {
      const found = (daftarAlat.value || []).find((t) => String(t.no_id) === String(editingJadwal.value.no_id))
      noIdValidationState.value = {
        isValid: !!found,
        message: found ? '' : `No.ID "${editingJadwal.value.no_id}" tidak terdaftar di Daftar Alat`
      }
    } else {
      noIdValidationState.value = { isValid: true, message: '' }
    }
  }
})

const refresh = () => fetchList()

// ✅ Fungsi Tambah
const openCreateModal = async () => {
  // pastikan daftar alat sudah dimuat supaya select langsung terisi
  if (!daftarAlat.value || !daftarAlat.value.length) {
    await fetchDaftarAlat()
  }
  editingJadwal.value = getEmptyJadwal()
  isEditMode.value = false
  isModalOpen.value = true
}

// ✅ Fungsi Edit
const openEditModal = async (jadwal) => {
  // pastikan daftar alat terisi dulu agar select dapat menampilkan nilai terpilih
  if (!daftarAlat.value || !daftarAlat.value.length) {
    await fetchDaftarAlat()
  }

  // jika no_id yang ingin dipilih belum ada di daftar, coba fetch paksa
  const exists = (daftarAlat.value || []).some((t) => String(t.no_id) === String(jadwal.no_id))
  if (jadwal.no_id && !exists) {
    await fetchDaftarAlat(true)
  }

  editingJadwal.value = {
    no: jadwal.no || '',
    no_id: jadwal.no_id || '',
    description: jadwal.description || '',
    cal_id: jadwal.cal_id || '',
    parameter: jadwal.parameter || '',
    process_range: jadwal.process_range || '',
    reject_error: jadwal.reject_error || '',
    interval: jadwal.interval || '',
    due_date: jadwal.due_date || '',
    remark: jadwal.remark || '',
    criticality: jadwal.criticality || ''
  }
  isEditMode.value = true
  isModalOpen.value = true
}

// Tutup modal
const closeModal = () => {
  isModalOpen.value = false
  editingJadwal.value = getEmptyJadwal()
  isEditMode.value = false
}

// ✅ Fungsi untuk fix encoding simbol khusus
const fixEncoding = (text) => {
  if (!text) return text
  
  let fixed = String(text)
  
  // Fix degree symbol (°C, °F) - harus dicek dulu sebelum plus-minus
  fixed = fixed
    .replace(/�\s*C/gi, '°C')
    .replace(/�C/gi, '°C')
    .replace(/�\s*F/gi, '°F')
    .replace(/�F/gi, '°F')
    .replace(/\?\s*C/gi, '°C')
    .replace(/\?C/gi, '°C')
    .replace(/\?\s*F/gi, '°F')
    .replace(/\?F/gi, '°F')
  
  // Fix plus-minus symbol (± angka)
  fixed = fixed
    .replace(/�\s*\d/g, (match) => match.replace('�', '±'))
    .replace(/\?\s*\d/g, (match) => match.replace('?', '±'))
  
  // HTML entities
  fixed = fixed
    .replace(/&plusmn;/g, '±')
    .replace(/&#177;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&#176;/g, '°')
    .replace(/&micro;/g, 'µ')
    .replace(/&#181;/g, 'µ')
  
  return fixed
}

// ✅ Fungsi Simpan (Create/Update)
const saveEditingJadwal = async () => {
  // ✅ Validasi client-side: no_id harus ada di daftar alat
  if (editingJadwal.value.no_id) {
    const found = (daftarAlat.value || []).find((t) => String(t.no_id) === String(editingJadwal.value.no_id))
    if (!found) {
      Swal.fire({
        icon: 'error',
        title: 'Validasi Gagal!',
        html: `No.ID "<strong>${editingJadwal.value.no_id}</strong>" tidak terdaftar di Daftar Alat.<br><br>` +
              `Silakan daftarkan alat terlebih dahulu di menu <strong>Daftar Alat</strong>.`,
        confirmButtonText: 'OK'
      })
      return
    }
  }

  try {
    await saveJadwal(editingJadwal.value)
    closeModal()
  } catch (error) {
    console.error('Gagal menyimpan:', error)
  }
}

// ✅ Fungsi Hapus
const handleDelete = (no) => {
  deleteJadwal(no)
}

// Fetch audit trail data dan gabungkan dengan refJadwal (hanya sebagai fallback)
const enrichWithAuditData = async () => {
  try {
    // Ambil semua no_id yang unik yang BELUM punya data audit dari kalibrasi
    const needEnrich = refJadwal.value.filter(j => !j.created_at && !j.updated_at)
    
    if (needEnrich.length === 0) {
      // Semua data sudah punya audit trail dari kalibrasi
      return
    }

    const noIds = [...new Set(needEnrich.map(j => j.no_id).filter(Boolean))]
    
    if (noIds.length === 0) return

    // Panggil API untuk mendapatkan audit trail dari daftaralat (fallback)
    const auditResult = await jadwalKalibrasiApi.getAuditTrailByNoIds(noIds)
    
    if (!auditResult.success) return

    const auditMap = auditResult.data

    // Gabungkan data audit ke setiap row yang belum punya data
    refJadwal.value = refJadwal.value.map(jadwal => {
      // Jika sudah punya data audit dari kalibrasi, jangan timpa
      if (jadwal.created_at || jadwal.updated_at) {
        return jadwal
      }
      
      // Fallback ke daftaralat
      return {
        ...jadwal,
        created_at: auditMap[jadwal.no_id]?.created_at || null,
        updated_at: auditMap[jadwal.no_id]?.updated_at || null,
        created_by: auditMap[jadwal.no_id]?.created_by || null,
        updated_by: auditMap[jadwal.no_id]?.updated_by || null
      }
    })
  } catch (error) {
    console.error('[Jadwal Kalibrasi] Error enriching audit data:', error)
  }
}

// Format audit trail info untuk tooltip
const formatAuditInfo = (jadwal) => {
  const parts = []

  if (jadwal.created_at) {
    const date = new Date(jadwal.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Dibuat: ${date}`)
    if (jadwal.created_by) parts.push(`oleh ${jadwal.created_by}`)
  }

  if (jadwal.updated_at && jadwal.updated_at !== jadwal.created_at) {
    const date = new Date(jadwal.updated_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Update: ${date}`)
    if (jadwal.updated_by) parts.push(`oleh ${jadwal.updated_by}`)
  }

  return parts.join('\n') || 'Tidak ada informasi audit'
}

// Watcher: setiap data berubah, enrich dengan audit trail
let enrichTimeout = null
watch(refJadwal, async (newData) => {
  if (newData && newData.length > 0) {
    // Debounce untuk menghindari pemanggilan berulang
    if (enrichTimeout) clearTimeout(enrichTimeout)
    enrichTimeout = setTimeout(async () => {
      await enrichWithAuditData()
    }, 100)
  }
}, { deep: false }) // shallow watch karena array reference berubah

onMounted(async () => {
  await fetchList()
  await enrichWithAuditData() // Tambahkan data audit trail
  await nextTick()
  await initDataTable()
  fetchDaftarAlat()
  startAutoRefresh()

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      localStorage.removeItem('jadwal_kalibrasi_cache')
      fetchList(true, true) // silent
      // enrichWithAuditData akan dipanggil otomatis oleh watcher
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    stopAutoRefresh()
  })
})
</script>

<template>
  <div class="content-wrapper">
  <!-- Header dengan Tombol Tambah & Print -->
<section class="content-header">
  <div class="container-fluid">
    
    <!-- Baris 1: Judul + Tombol Aksi (Print/Tambah) -->
    <div class="d-flex justify-content-between align-items-center mb-2 header-row">
      
      <!-- Kiri: Judul -->
      <div>
        <h1 class="page-title mb-0">Jadwal Kalibrasi</h1>
        <small class="page-subtitle">No Reff: {{ documentRefCalibration }}</small>
      </div>

      <!-- Kanan: Tombol Print (non-admin) atau Tambah + Print (admin) -->
      <div class="d-flex align-items-center gap-2">
        <!-- Print button: untuk non-admin -->
        <button 
          v-if="!isAdmin" 
          class="btn btn-outline-info btn-sm d-flex align-items-center" 
          @click="handlePrint" 
          title="Print jadwal kalibrasi"
        >
          <i class="fas fa-print"></i>
          <span class="btn-label-mobile ml-1">Print</span>
        </button>
        
        <!-- Tombol Tambah: hanya admin -->
        <button v-if="canCreate" class="btn btn-info btn-sm" @click="openCreateModal">
          <i class="fas fa-plus mr-1"></i><span class="btn-label-mobile"> Tambah Jadwal</span>
        </button>
        
        <!-- Print button: untuk admin (sejajar dengan Import) -->
        <button 
          v-if="isAdmin" 
          class="btn btn-outline-info btn-sm d-flex align-items-center" 
          @click="handlePrint" 
          title="Print jadwal kalibrasi"
        >
          <i class="fas fa-print"></i>
          <span class="btn-label-mobile ml-1">Print</span>
        </button>
      </div>
    </div>

    <!-- Baris 2: Export/Import (hanya untuk admin) -->
    <div class="header-actions d-flex justify-content-end" v-if="isAdmin">
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-success" @click="exportJadwalKalibrasi(refJadwal)" title="Export ke Excel">
          <i class="fas fa-file-excel"></i><span class="btn-label-mobile ml-1">Export</span>
        </button>
        <button class="btn btn-outline-secondary" @click="downloadJadwalKalibrasiTemplate" title="Download template">
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
                <!-- Tombol Hapus X Jadwal - di kanan dekat search -->
                <button
                  v-if="bulkDeleteMode && selectedJadwal.length > 0"
                  class="btn btn-danger btn-sm bulk-delete-action-btn"
                  @click="handleBulkDelete"
                  title="Hapus jadwal yang dipilih"
                >
                  <i class="fas fa-trash mr-1"></i>Delete {{ selectedJadwal.length }} Jadwal
                </button>
              </div>
              <!-- ✅ Ubah class tabel -->
              <table class="table table-bordered table-hover jadwal-kalibrasi-table">
                <thead>
                  <tr>
                    <th class="align-middle checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @click.stop="toggleSelectAll"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </th>
                    <th>No</th>
                    <th>No.ID</th>
                    <th>Description</th>
                    <th>Calibration ID</th>
                    <th>Parameter</th>
                    <th>Process Range</th>
                    <th>Reject Error</th>                   
                    <th>Interval</th>                   
                    <th>Due Date</th>                   
                    <th>Remark</th>                   
                    <th>Criticality</th>
                    <!-- ✅ Kolom Aksi -->
                    <th class="text-center">Aksi</th>                   
                  </tr>  
                </thead>
                <tbody>
                    <tr v-for="(row, index) in refJadwal" :key="`jadwal-${row.no}`">
                    <td class="text-center checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                      <input
                        type="checkbox"
                        :checked="isJadwalSelected(row.no)"
                        @click.stop="toggleJadwalSelection(row.no)"
                        class="cursor-pointer"
                        :disabled="!bulkDeleteMode"
                      />
                    </td>
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ row.no_id || '—' }}
                      <!-- Audit trail tooltip -->
                      <span v-if="row.created_at || row.updated_at" class="ml-1" style="cursor: help;" :title="formatAuditInfo(row)">
                        <i class="fas fa-info-circle text-muted" style="font-size: 0.75rem;"></i>
                      </span>
                    </td>
                    <td>{{ row.description || '—' }}</td>
                    <td>{{ row.cal_id || '—' }}</td>
                    <td>{{ row.parameter || '—' }}</td>
                    <td>{{ fixEncoding(row.process_range) || '—' }}</td>
                    <td>{{ fixEncoding(row.reject_error) || '—' }}</td>
                    <td>{{ row.interval || '—' }}</td>
                    <td>{{ row.due_date || '—' }}</td>
                    <td>{{ row.remark || '—' }}</td>
                    <td>{{ row.criticality || '—' }}</td>
                    <!-- ✅ Tombol Aksi -->
                    <td class="text-center">
                      <button v-if="canEdit"
                        class="btn btn-warning btn-sm mr-1"
                        @click="openEditModal(row)"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button v-if="canDelete"
                        class="btn btn-danger btn-sm"
                        @click="handleDelete(row.no)"
                      >
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
            <h5 class="modal-title"><i class="fas fa-file-upload mr-2"></i>Import Jadwal Kalibrasi</h5>
            <button type="button" class="close" @click="closeImportModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle mr-1"></i>
              Upload file Excel (.xlsx) sesuai format template. Kolom <strong>No.ID</strong> wajib diisi.
              <a href="#" class="ml-2" @click.prevent="downloadJadwalKalibrasiTemplate">
                <i class="fas fa-download mr-1"></i>Download Template
              </a>
            </div>

            <!-- Mode Import -->
            <div class="form-group">
              <label class="font-weight-bold">Mode Import</label>
              <div class="d-flex">
                <div class="custom-control custom-radio mr-4">
                  <input type="radio" id="kal-mode-upsert" class="custom-control-input" value="upsert" v-model="importMode" />
                  <label class="custom-control-label" for="kal-mode-upsert">
                    Tambah + Update <small class="text-muted">(data baru ditambah, data berubah diupdate, data sama dilewati)</small>
                  </label>
                </div>
                <div class="custom-control custom-radio">
                  <input type="radio" id="kal-mode-insert" class="custom-control-input" value="insert_only" v-model="importMode" />
                  <label class="custom-control-label" for="kal-mode-insert">
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

            <div v-if="importErrors.length || unregisteredNoIds.length" class="alert alert-danger">
              <strong>Ditemukan error:</strong>
              <ul class="mb-0 mt-1">
                <li v-for="(err, i) in importErrors" :key="i">{{ err }}</li>
                <li v-for="(noId, i) in unregisteredNoIds" :key="`noid-${i}`">
                  No.ID "<strong>{{ noId }}</strong>" tidak terdaftar di Daftar Alat
                </li>
              </ul>
            </div>

            <div v-if="showPreview && importPreview.length" class="mt-3">
              <p class="font-weight-bold">Preview <span class="badge badge-primary">{{ importPreview.length }} baris</span></p>
              <div style="max-height: 300px; overflow-y: auto;">
                <table class="table table-sm table-bordered">
                  <thead class="thead-light">
                    <tr>
                      <th>No.ID</th>
                      <th>Description</th>
                      <th>Calibration ID</th>
                      <th>Parameter</th>
                      <th>Due Date</th>
                      <th>Criticality</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in importPreview" :key="i">
                      <td>{{ row.no_id || '-' }}</td>
                      <td>{{ row.description || '-' }}</td>
                      <td>{{ row.cal_id || '-' }}</td>
                      <td>{{ row.parameter || '-' }}</td>
                      <td>{{ row.due_date || '-' }}</td>
                      <td>{{ row.criticality || '-' }}</td>
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

    <!-- ✅ Modal Create/Edit -->
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
            <!-- Identitas Alat -->
            <div class="row">
              <div class="col-md-6">
                <div v-if="editingJadwal.no" class="form-group">
                  <label>No.</label>
                  <input v-model="editingJadwal.no" type="text" class="form-control" readonly />
                </div>
                <div class="form-group">
                  <label>No. ID <span class="text-danger">*</span></label>
                  <!-- Searchable No.ID dropdown -->
                  <div style="position: relative;">
                    <input
                      v-model="noIdSearch"
                      @input="editingJadwal.no_id = noIdSearch"
                      type="text"
                      class="form-control"
                      :class="{ 'is-invalid': !noIdValidationState.isValid && noIdSearch, 'is-valid': noIdValidationState.isValid && noIdSearch }"
                      placeholder="Ketik untuk cari No.ID..."
                      @focus="showNoIdDropdown = true"
                      @blur="setTimeout(() => showNoIdDropdown = false, 200)"
                      autocomplete="off"
                    />
                    <!-- ✅ Validasi indicator -->
                    <div v-if="!noIdValidationState.isValid && noIdSearch" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-circle mr-1"></i>{{ noIdValidationState.message }}
                    </div>
                    <div v-if="noIdSearch && filteredDaftarAlat.length === 0 && noIdValidationState.isValid === false" class="alert alert-danger py-1 px-2 mt-2 mb-0 small">
                      <i class="fas fa-times-circle mr-1"></i><strong>Peringatan:</strong> No.ID tidak ditemukan di Daftar Alat
                    </div>
                    <div
                      v-if="showNoIdDropdown && filteredDaftarAlat.length"
                      style="position:absolute;z-index:1050;width:100%;max-height:200px;overflow-y:auto;background:#fff;border:1px solid #ced4da;border-radius:0 0 4px 4px;box-shadow:0 4px 8px rgba(0,0,0,.1);"
                    >
                      <div
                        v-for="t in filteredDaftarAlat"
                        :key="t.no_id"
                        @mousedown.prevent="selectNoId(t.no_id)"
                        style="padding:6px 12px;cursor:pointer;font-size:0.875rem;"
                        class="dropdown-item"
                      >
                        <strong>{{ t.no_id }}</strong>
                        <span v-if="t.description" class="text-muted ml-1 small">— {{ t.description }}</span>
                      </div>
                      <div v-if="!filteredDaftarAlat.length" class="text-muted small px-3 py-2">Tidak ditemukan</div>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Description</label>
                  <input v-model="editingJadwal.description" type="text" class="form-control" readonly />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Calibration ID</label>
                  <input v-model="editingJadwal.cal_id" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Criticality</label>
                  <input v-model="editingJadwal.criticality" type="text" class="form-control" />
                </div>
              </div>
            </div>

            <!-- Specification -->
            <div class="row">
              <div class="col-12">
                <h6 class="font-weight-bold mb-3 mt-3 text-secondary">
                  <small>SPECIFICATION</small>
                </h6>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Parameter</label>
                  <input v-model="editingJadwal.parameter" type="text" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Process Range</label>
                  <input v-model="editingJadwal.process_range" type="text" class="form-control" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Reject Error</label>
                  <input v-model="editingJadwal.reject_error" type="text" class="form-control" />
                </div>
              </div>
            </div>

            <!-- Schedule -->
            <div class="row">
              <div class="col-12">
                <h6 class="font-weight-bold mb-3 mt-3 text-secondary">
                  <small>SCHEDULE</small>
                </h6>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Interval</label>
                  <input v-model="editingJadwal.interval" type="text" class="form-control" />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Due Date</label>
                  <input v-model="editingJadwal.due_date" type="text" class="form-control" />
                </div>
              </div>
            </div>

            <!-- Remarks -->
            <div class="row">
              <div class="col-12">
                <div class="form-group">
                  <label>Remark</label>
                  <textarea v-model="editingJadwal.remark" class="form-control" rows="3"></textarea>
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
              @click="saveEditingJadwal"
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

/* Tombol Hapus X Jadwal - di kanan dekat search box */
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

/* Ubah class sesuai nama tabel baru */
.jadwal-kalibrasi-table thead th {
  vertical-align: middle;
  font-weight: 600;
  background-color: #f2f7fc;
}
.jadwal-kalibrasi-table th,
.jadwal-kalibrasi-table td {
  white-space: nowrap;
  padding: 0.5rem;
}
.jadwal-kalibrasi-table .text-center {
  text-align: center;
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

.modal-body {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  flex: 1;
}

/* Print button wrapper styling */
.print-button-wrapper {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
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
