<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useJadwalKalibrasi } from '@/composables/useJadwalKalibrasi'
import { useDaftarAlat } from '@/composables/useDaftarAlat'
import { useFrontendConfig } from '@/composables/useConfig'
import { usePermissions } from '@/composables/usePermissions'

// ✅ Ambil semua fungsi CRUD
const {
  refJadwal,
  loading,
  fetchList,
  saveJadwal,
  deleteJadwal,
  isSaving
} = useJadwalKalibrasi()

const { config } = useFrontendConfig()
const permission = usePermissions()

// Computed untuk permission checks
const canCreate = computed(() => permission.can('jadwalKalibrasi:create'))
const canEdit = computed(() => permission.can('jadwalKalibrasi:edit'))
const canDelete = computed(() => permission.can('jadwalKalibrasi:delete'))
const isLoggedIn = computed(() => permission.isLoggedIn.value)

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

      // Delete sequentially
      for (const no of selectedJadwal.value) {
        await deleteJadwal(no)
      }

      // Reset
      selectedJadwal.value = []
      bulkDeleteMode.value = false

      // Refresh
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchList()

      // Success
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${deletedCount} jadwal berhasil dihapus.`,
        timer: 2000,
        showConfirmButton: false
      })
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

// Isi description otomatis ketika user memilih no_id dari daftarAlat
watch(
  () => editingJadwal.value.no_id,
  (newNoId) => {
    if (!newNoId) {
      editingJadwal.value.description = ''
      return
    }
    const found = (daftarAlat.value || []).find((t) => String(t.no_id) === String(newNoId))
    if (found) {
      editingJadwal.value.description = found.description || ''
    }
  }
)

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

onMounted(() => {
  fetchList()
  fetchDaftarAlat()
})
</script>

<template>
  <div class="content-wrapper">
    <!-- ✅ Header dengan tombol Tambah -->
    <section class="content-header">
      <div class="container-fluid d-flex justify-content-between align-items-start">
        <div>
          <h1 class="mb-0">Jadwal Kalibrasi</h1>
          <!-- <small class="text-muted">No Reff: AGIS-WI-ENG-016-LD1_v5.0</small><br> -->
           <small class="text-muted">No Reff: {{ documentRefCalibration }}</small>
        </div>
        <button v-if="canCreate" class="btn btn-info" @click="openCreateModal">
          <i class="fas fa-plus mr-1"></i> Tambah Jadwal
        </button>
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
                    <td>{{ row.no_id || '—' }}</td>
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
                  <select v-model="editingJadwal.no_id" class="form-control">
                    <option value="">Pilih No.ID</option>
                    <option
                      v-for="t in daftarAlat"
                      :key="t.no_id"
                      :value="t.no_id"
                    >
                      {{ t.no_id }}
                    </option>
                  </select>
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
</style>
