<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useLogAktivitas } from '@/composables/useLogAktivitas'
import { logAktivitasApi } from '@/api'
import { printService } from '@/services/printService'
import { usePermissions } from '@/composables/usePermissions'

const permission = usePermissions()

const formatAuditTime = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const canEdit = computed(() => permission.can('logAktivitas:edit'))
const canDelete = computed(() => permission.can('logAktivitas:delete'))
const isLoggedIn = computed(() => permission.isLoggedIn.value)

const {
  loading,
  allActivityLogs,
  displayedLogs,
  backlogFilter,
  backlogCounts,
  initAllActivities,
  fetchAllLogs,
  deleteLog,
  bulkDeleteLogs,
  getJenisBadgeClass,
  showFormDialog,
  formMode,
  currentLog,
  formData,
  isSaving,
  openFormDialog,
  closeFormDialog,
  handleSubmit,
  setBacklogFilter
} = useLogAktivitas()

const pageError = ref(null)

// ── DataTable — satu-satunya tempat yang kelola instance ──────────────────
let dtInstance = null

const initDT = async () => {
  await nextTick()
  const table = document.querySelector('.all-aktivitas-table')
  if (!table) return
  if (dtInstance) {
    try { dtInstance.destroy(true) } catch (e) {}
    dtInstance = null
  }
  dtInstance = $(table).DataTable({
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
    language: { search: '_INPUT_', searchPlaceholder: 'Cari data...' }
  })
}

// Print
const printDate = ref('')
const handlePrint = () => {
  if (!displayedLogs.value.length) {
    Swal.fire({ icon: 'warning', title: 'Tidak Ada Data', text: 'Belum ada data untuk dicetak', confirmButtonText: 'OK' })
    return
  }
  const now = new Date()
  printDate.value = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  printService.printAllActivity(displayedLogs.value, 'All', String(now.getFullYear()))
}

// Auto-refresh
let refreshTimer = null

const refresh = async () => {
  pageError.value = null
  await fetchAllLogs(true) // silent
  setBacklogFilter(backlogFilter.value)
  // DataTable tidak di-reinit saat background refresh
  // Data di tbody sudah diupdate Vue, DataTable akan reflect saat user interaksi berikutnya
}

const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(refresh, 60 * 1000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}

// Bulk delete
const selectedLogs = ref([])
const isSelectAll = ref(false)
const bulkDeleteMode = ref(false)

const toggleBulkDeleteMode = () => {
  bulkDeleteMode.value = !bulkDeleteMode.value
  if (!bulkDeleteMode.value) { selectedLogs.value = []; isSelectAll.value = false }
}

const toggleSelectAll = () => {
  if (isSelectAll.value) {
    selectedLogs.value = []; isSelectAll.value = false
  } else {
    selectedLogs.value = displayedLogs.value.map(l => l.no)
    isSelectAll.value = true
  }
}

const toggleLogSelection = (no) => {
  const idx = selectedLogs.value.indexOf(no)
  if (idx === -1) selectedLogs.value.push(no)
  else selectedLogs.value.splice(idx, 1)
  isSelectAll.value = selectedLogs.value.length === displayedLogs.value.length && displayedLogs.value.length > 0
}

const isLogSelected = (no) => selectedLogs.value.includes(no)

const handleBulkDelete = async () => {
  if (!selectedLogs.value.length) {
    Swal.fire('Peringatan!', 'Pilih minimal 1 log untuk dihapus', 'warning')
    return
  }
  const result = await Swal.fire({
    title: 'Hapus Log Aktivitas?',
    html: `Yakin hapus <strong>${selectedLogs.value.length}</strong> log?<br><small class="text-muted">Data tidak bisa dikembalikan!</small>`,
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
  })
  if (!result.isConfirmed) return

  const count = selectedLogs.value.length
  Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
  const resultBulk = await bulkDeleteLogs(selectedLogs.value)
  selectedLogs.value = []; isSelectAll.value = false; bulkDeleteMode.value = false
  await setBacklogFilter(backlogFilter.value)
  if (resultBulk?.failedChunks?.length) {
    Swal.fire({
      icon: 'warning',
      title: 'Bulk Delete Selesai Sebagian',
      html: `Berhasil menghapus <strong>${resultBulk.deletedCount}</strong> dari <strong>${count}</strong> log.<br><small class="text-muted">Beberapa chunk gagal, silakan ulangi untuk sisa data.</small>`
    })
  } else {
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${resultBulk?.deletedCount ?? count} log berhasil dihapus.`, timer: 2000, showConfirmButton: false })
  }
}

// Edit / Delete
const openEditDialog = (log) => {
  openFormDialog('update', log)
  $('#logFormModal').modal('show')
}

// ── Backlog modal (terpisah dari edit) ────────────────────────────────────
const backlogModal = ref({ row: null, status: null, notes: '' })
const savingBacklog = ref(false)

const openBacklogModal = (log) => {
  backlogModal.value = {
    row: log,
    status: log.backlog_status || null,
    notes: log.backlog_notes || ''
  }
  $('#allAktivitasBacklogModal').modal('show')
}

const saveBacklog = async () => {
  if (!backlogModal.value.row?.no) return
  savingBacklog.value = true
  try {
    const updatedBy = permission.user.value?.inisial || permission.user.value?.nama || permission.user.value?.email || null
    const result = await logAktivitasApi.updateBacklog(
      backlogModal.value.row.no,
      backlogModal.value.status,
      backlogModal.value.notes,
      updatedBy
    )
    backlogModal.value.row.backlog_status = backlogModal.value.status
    backlogModal.value.row.backlog_notes = backlogModal.value.notes
    backlogModal.value.row.backlog_updated_at = new Date().toISOString()
    backlogModal.value.row.backlog_updated_by = updatedBy
    if (result?.data?.backlog_history) backlogModal.value.row.backlog_history = result.data.backlog_history
    $('#allAktivitasBacklogModal').modal('hide')
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Backlog berhasil disimpan', timer: 1200, showConfirmButton: false })
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Gagal menyimpan backlog' })
  } finally {
    savingBacklog.value = false
  }
}

const handleCloseModal = () => {
  closeFormDialog()
  $('#logFormModal').modal('hide')
}

const handleSave = async () => {
  if (!formData.value.keterangan?.trim()) {
    Swal.fire('Peringatan!', 'Keterangan wajib diisi', 'warning')
    return
  }
  try {
    await handleSubmit()
    $('#logFormModal').modal('hide')
    await setBacklogFilter(backlogFilter.value)
    Swal.fire('Berhasil!', 'Log aktivitas berhasil diupdate', 'success')
  } catch (error) {
    Swal.fire('Error!', error.message || 'Gagal update log', 'error')
  }
}

const handleDelete = async (no, noId, calId) => {
  const result = await Swal.fire({
    title: 'Hapus Log Aktivitas?',
    html: `Yakin hapus log <strong>${noId} - ${calId}</strong>?<br><small class="text-muted">Data tidak bisa dikembalikan!</small>`,
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
  })
  if (!result.isConfirmed) return
  await deleteLog(no)
  await setBacklogFilter(backlogFilter.value)
  Swal.fire('Dihapus!', 'Log aktivitas berhasil dihapus.', 'success')
}

// Format audit trail info untuk tooltip
const formatAuditInfo = (log) => {
  const parts = []

  if (log.created_at) {
    const date = new Date(log.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Dibuat: ${date}`)
    if (log.created_by) parts.push(`oleh ${log.created_by}`)
  }

  if (log.updated_at && log.updated_at !== log.created_at) {
    const date = new Date(log.updated_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Update: ${date}`)
    if (log.updated_by) parts.push(`oleh ${log.updated_by}`)
  }

  return parts.join('\n') || 'Tidak ada informasi audit'
}

watch(showFormDialog, (val) => {
  if (val) $('#logFormModal').modal('show')
  else $('#logFormModal').modal('hide')
})

// Saat filter berubah: Vue update tbody → destroy DataTable lama → init ulang
watch(backlogFilter, async () => {
  await nextTick() // tunggu Vue update tbody dengan data baru
  await initDT()   // destroy instance lama + init di elemen yang sama
}, { flush: 'post' })

// Mount
onMounted(async () => {
  try {
    await initAllActivities()
    await initDT()
    startAutoRefresh()
  } catch (error) {
    pageError.value = error.message || 'Gagal memuat halaman'
    Swal.fire('Error!', error.message || 'Gagal memuat data', 'error')
  }

  // Flag untuk deteksi print — skip refresh setelah print dialog tutup
  let isPrinting = false
  const onBeforePrint = () => { isPrinting = true }
  const onAfterPrint = () => { setTimeout(() => { isPrinting = false }, 500) }
  window.addEventListener('beforeprint', onBeforePrint)
  window.addEventListener('afterprint', onAfterPrint)

  const onVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && !isPrinting) await refresh()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('beforeprint', onBeforePrint)
    window.removeEventListener('afterprint', onAfterPrint)
    stopAutoRefresh()
    if (dtInstance) { try { dtInstance.destroy() } catch (e) {} dtInstance = null }
  })
})
</script>

<template>
  <div class="content-wrapper">
    <!-- Header -->
    <section class="content-header">
      <div class="container-fluid">
        <!-- Baris 1: Judul -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h1 class="mb-0" style="font-size: 1.3rem;">Semua Log Aktivitas</h1>
            <small class="text-muted d-none d-md-block">Menampilkan semua aktivitas Kalibrasi dan PM yang pernah dilaksanakan</small>
          </div>
          <!-- Print + counter — kanan atas -->
          <div class="d-flex align-items-center no-print">
            <span class="badge badge-info mr-2">
              <i class="fas fa-database mr-1"></i>
              {{ displayedLogs.length }}{{ backlogFilter !== 'all' ? ' / ' + allActivityLogs.length : '' }}
            </span>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="loading || allActivityLogs.length===0"
              @click="handlePrint"
              title="Cetak semua log aktivitas"
            >
              <i class="fas fa-print mr-1"></i><span class="d-none d-sm-inline">Print</span>
            </button>
          </div>
        </div>
        <!-- Baris 2: Filter buttons — full width di mobile -->
        <div class="no-print">
          <div class="btn-group btn-group-sm w-100" role="group" style="flex-wrap: wrap;">
            <button
              type="button"
              class="btn"
              :class="backlogFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'"
              @click="setBacklogFilter('all')"
            >Semua</button>
            <button
              type="button"
              class="btn"
              :class="backlogFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'"
              @click="setBacklogFilter('pending')"
            >
              <i class="fas fa-clock mr-1"></i>Pending
              <span v-if="backlogCounts.pending > 0" class="badge badge-dark ml-1">{{ backlogCounts.pending }}</span>
            </button>
            <button
              type="button"
              class="btn"
              :class="backlogFilter === 'completed' ? 'btn-success' : 'btn-outline-success'"
              @click="setBacklogFilter('completed')"
            >
              <i class="fas fa-check mr-1"></i>Done
              <span v-if="backlogCounts.completed > 0" class="badge badge-dark ml-1">{{ backlogCounts.completed }}</span>
            </button>
            <button
              type="button"
              class="btn"
              :class="backlogFilter === 'none' ? 'btn-light' : 'btn-outline-secondary'"
              @click="setBacklogFilter('none')"
            >Tanpa Backlog</button>
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <!-- print header -->
        <!-- <div class="print-header d-none">
          <div class="company-logo">AGIS</div>
          <div class="company-name">PT. AGIS INSTRUMENT SERVICES</div>
          <div class="company-address">Jl. Raya Industri No. 123, Kawasan Industri MM2100</div>
          <div class="company-address">Cikarang Barat, Bekasi 17520 - Indonesia</div>
          <div class="company-address">Telp: (021) 897-1234 | Email: info@agis.co.id</div>
          <h1 class="report-title">LAPORAN LOG AKTIVITAS</h1>
          <div class="report-period">
            Dicetak pada: {{ printDate }}
          </div>
        </div> -->
        <div class="card">
          <!-- <div class="card-header bg-primary">
            <h3 class="card-title text-white">
              <i class="fas fa-history mr-2"></i>Riwayat Aktivitas Lengkap
            </h3>
          </div> -->
          
          <div class="card-body">
            <!-- ✅ ERROR STATE - TAMPILKAN JIKA ADA ERROR -->
            <div v-if="pageError" class="alert alert-danger alert-dismissible fade show no-print">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              <strong>Error:</strong> {{ pageError }}
              <button type="button" class="close" @click="pageError = null">
                <span>&times;</span>
              </button>
            </div>

            <!-- ✅ LOADING STATE -->
            <div v-else-if="loading" class="text-center py-5 no-print">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
              </div>
              <p class="mt-3 text-primary font-weight-bold">Memuat data log aktivitas...</p>
              <p class="text-muted small">Mohon tunggu, sedang mengambil data dari server...</p>
            </div>

            <!-- DATA -->
            <div v-else :class="{ 'bulk-delete-active': bulkDeleteMode }">
              <!-- Bulk delete buttons -->
              <div class="bulk-delete-wrapper no-print" v-if="isLoggedIn && canDelete">
                <button
                  class="btn btn-outline-danger btn-sm bulk-delete-toggle-btn"
                  :class="{ 'active': bulkDeleteMode }"
                  @click="toggleBulkDeleteMode"
                  title="Mode hapus banyak"
                >
                  <i class="fas fa-trash-alt mr-1"></i>
                  {{ bulkDeleteMode ? 'Cancel' : 'Delete' }}
                </button>
                <button
                  v-if="bulkDeleteMode && selectedLogs.length > 0"
                  class="btn btn-danger btn-sm bulk-delete-action-btn"
                  @click="handleBulkDelete"
                  title="Hapus log yang dipilih"
                >
                  <i class="fas fa-trash mr-1"></i>Delete {{ selectedLogs.length }} Log
                </button>
              </div>

              <!-- :key pada wrapper memaksa Vue recreate seluruh container + tabel saat filter berubah -->
              <!-- Ini mencegah konflik antara DataTable DOM dan Vue reactive data -->
              <div :key="backlogFilter" class="table-responsive">
                <table class="table table-bordered table-hover all-aktivitas-table">
                  <thead>
                    <tr>
                      <th class="align-middle text-center checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                        <input
                          type="checkbox"
                          :checked="isSelectAll"
                          @click.stop="toggleSelectAll"
                          class="cursor-pointer"
                        />
                      </th>
                      <th class="align-middle text-center">No</th>
                      <th class="align-middle text-center">No.ID</th>
                      <th class="align-middle text-center">Description</th>
                      <th class="align-middle text-center">Log ID</th>
                      <th class="align-middle text-center">Jenis</th>
                      <th class="align-middle text-center">PIC</th>
                      <th class="align-middle text-center">Execute Date</th>
                      <th class="align-middle text-center">Keterangan</th>
                      <th class="align-middle text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(log, index) in displayedLogs"
                      :key="log.no || index"
                    >
                      <td class="text-center checkbox-column" :style="bulkDeleteMode ? '' : 'width:0!important;min-width:0!important;max-width:0!important;padding:0!important;'">
                        <input
                          type="checkbox"
                          :checked="isLogSelected(log.no)"
                          @click.stop="toggleLogSelection(log.no)"
                          class="cursor-pointer"
                          :disabled="!bulkDeleteMode"
                        />
                      </td>
                      <td class="text-center font-weight-bold">{{ index + 1 }}</td>
                      <td class="font-weight-bold">
                        {{ log.no_id || '-' }}
                        <span v-if="log.equipment_status === 'obsolete'" class="badge badge-secondary ml-1" title="Alat sudah obsolete">
                          obsolete
                        </span>
                        <!-- Audit trail tooltip -->
                        <span v-if="log.created_at || log.updated_at" class="ml-1" style="cursor: help;" :title="formatAuditInfo(log)">
                          <i class="fas fa-info-circle text-muted" style="font-size: 0.75rem;"></i>
                        </span>
                      </td>
                      <td>{{ log.description || log.type_model || '-' }}</td>
                      <td class="font-italic">{{ log.cal_id || '-' }}</td>
                      <td class="text-center">
                        <span :class="['badge', getJenisBadgeClass(log.jenis)]">
                          {{ log.jenis || '-' }}
                        </span>
                      </td>
                      <td class="text-center font-weight-bold">{{ log.petugas || '-' }}</td>
                      <!-- ✅ GUNAKAN formattedDate yang sudah di-compute di composable -->
                      <td class="text-center font-weight-bold">
                        <span :class="log.status === 'Selesai' ? 'text-success' : 'text-muted'">
                          {{ log.formattedDate || '-' }}
                        </span>
                      </td>
                      <td>{{ log.keterangan || '-' }}
                        <span v-if="log.backlog_status === 'pending'" class="badge badge-warning ml-1" title="Ada follow-up yang pending">
                          <i class="fas fa-clock mr-1"></i>Pending
                        </span>
                        <span v-else-if="log.backlog_status === 'completed'" class="badge badge-success ml-1" title="Follow-up sudah selesai">
                          <i class="fas fa-check mr-1"></i>Done
                        </span>
                      </td>
                       <td class="text-center">
                        <button
                          v-if="isLoggedIn && canEdit"
                          class="btn btn-warning btn-sm mr-1"
                          @click="openEditDialog(log)"
                          title="Edit Log"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <!-- Tombol Backlog — tampil untuk semua, warna sesuai status -->
                        <button
                          class="btn btn-sm mr-1"
                          :class="log.backlog_status === 'pending' ? 'btn-warning' : log.backlog_status === 'completed' ? 'btn-success' : 'btn-outline-secondary'"
                          @click="openBacklogModal(log)"
                          title="Lihat/Kelola Backlog"
                        >
                          <i class="fas fa-clipboard-list"></i>
                        </button>
                        <button
                          v-if="isLoggedIn && canDelete"
                          class="btn btn-danger btn-sm"
                          @click="handleDelete(log.no, log.no_id, log.cal_id)"
                          title="Hapus Log"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                        <span v-if="!isLoggedIn" class="text-muted small">
                          <i class="fas fa-lock mr-1"></i>
                        </span>
                        <span v-else-if="!canEdit && !canDelete" class="text-muted">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Summary Info -->
              <div class="alert alert-info mt-4 mb-0">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <i class="fas fa-info-circle mr-2"></i>
                    <strong>Info:</strong> Gunakan fitur search, sort, dan paging untuk navigasi
                  </div>
                  <div class="d-flex">
                    <span class="badge badge-light mr-2">
                      <i class="fas fa-balance-scale mr-1"></i>{{ displayedLogs.filter(l => l.jenis === 'Kalibrasi').length }} Kalibrasi
                    </span>
                    <span class="badge badge-light mr-2">
                      <i class="fas fa-tools mr-1"></i>{{ displayedLogs.filter(l => l.jenis === 'PM').length }} PM
                    </span>
                    <span v-if="backlogCounts.pending > 0" class="badge badge-warning">
                      <i class="fas fa-clock mr-1"></i>{{ backlogCounts.pending }} Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

     <!-- ✅ MODAL EDIT LOG -->
    <div class="modal fade" id="logFormModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-edit mr-2"></i>
              {{ formMode === 'create' ? 'Tambah' : 'Edit' }} Log Aktivitas
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close" @click="handleCloseModal">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>No. ID</label>
              <input 
                v-model="formData.no_id" 
                type="text" 
                class="form-control" 
                readonly 
                placeholder="No. ID"
              />
            </div>
            <div class="form-group">
              <label>Log ID</label>
              <input 
                v-model="formData.cal_id" 
                type="text" 
                class="form-control" 
                readonly 
                placeholder="Log ID"
              />
            </div>
            <div class="form-group">
              <label>Jenis Aktivitas</label>
              <input 
                v-model="formData.jenis" 
                type="text" 
                class="form-control" 
                readonly 
                :class="formData.jenis === 'PM' ? 'bg-info' : 'bg-warning'"
                placeholder="Jenis"
              />
            </div>
            <div class="form-group">
              <label>PIC (Petugas)</label>
              <input 
                v-model="formData.petugas" 
                type="text" 
                class="form-control" 
                placeholder="Nama petugas"
                required
              />
            </div>
            <div class="form-group">
              <label>Tanggal Pelaksanaan</label>
              <input 
                v-model="formData.tanggal" 
                type="date" 
                class="form-control" 
                required
              />
            </div>
            <div class="form-group">
              <label>Keterangan</label>
              <textarea 
                v-model="formData.keterangan" 
                class="form-control" 
                rows="3" 
                placeholder="Keterangan hasil aktivitas"
                required
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn btn-secondary" 
              data-dismiss="modal"
              @click="handleCloseModal"
              :disabled="isSaving"
            >
              Batal
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="handleSave"
              :disabled="isSaving || !formData.keterangan?.trim()"
            >
              <span v-if="isSaving">
                <span class="spinner-border spinner-border-sm mr-1"></span>
                Menyimpan...
              </span>
              <span v-else>
                <i class="fas fa-save mr-1"></i>
                {{ formMode === 'create' ? 'Simpan' : 'Update' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Modal Backlog Terpisah -->
  <div class="modal fade" id="allAktivitasBacklogModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="fas fa-clipboard-list mr-2"></i>Backlog / Follow-up</h5>
          <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-2">
            <strong>{{ backlogModal.row?.no_id }}</strong>
            <span v-if="backlogModal.row?.cal_id"> — {{ backlogModal.row.cal_id }}</span>
          </p>
          <!-- Audit trail -->
          <div v-if="backlogModal.row?.backlog_updated_at" class="alert alert-light py-1 px-2 mb-2 small">
            <i class="fas fa-history mr-1 text-muted"></i>
            Terakhir diubah: <strong>{{ formatAuditTime(backlogModal.row.backlog_updated_at) }}</strong>
            <span v-if="backlogModal.row.backlog_updated_by"> oleh <strong>{{ backlogModal.row.backlog_updated_by }}</strong></span>
          </div>
          <!-- Riwayat perubahan -->
          <div v-if="backlogModal.row?.backlog_history?.length" class="mb-3">
            <small class="text-muted font-weight-bold d-block mb-1">Riwayat Perubahan:</small>
            <div
              v-for="(h, i) in [...(backlogModal.row.backlog_history || [])].reverse()"
              :key="i"
              class="border-left pl-2 mb-1 small"
              :style="h.status === 'pending' ? 'border-color: #ffc107 !important' : 'border-color: #28a745 !important'"
            >
              <span :class="h.status === 'pending' ? 'text-warning' : 'text-success'" class="font-weight-bold">
                {{ h.status === 'pending' ? 'Pending' : 'Completed' }}
              </span>
              <span class="text-muted ml-1">— {{ formatAuditTime(h.changed_at) }} oleh {{ h.changed_by }}</span>
              <div v-if="h.notes" class="text-muted font-italic">{{ h.notes }}</div>
            </div>
          </div>
          <!-- Form — hanya tampil jika login -->
          <div v-if="isLoggedIn">
            <div class="form-group">
              <label>Status Backlog</label>
              <select v-model="backlogModal.status" class="form-control form-control-sm">
                <option :value="null">— Tidak ada backlog —</option>
                <option value="pending">Pending (perlu ditindaklanjuti)</option>
                <option value="completed">Completed (sudah selesai)</option>
              </select>
            </div>
            <div v-if="backlogModal.status" class="form-group">
              <label>Catatan</label>
              <textarea v-model="backlogModal.notes" class="form-control form-control-sm" rows="3"
                placeholder="Contoh: Menunggu part dari supplier, ETA 2 minggu"></textarea>
            </div>
          </div>
          <!-- View-only jika tidak login -->
          <div v-else-if="backlogModal.row?.backlog_status" class="alert alert-light py-2 px-3 small">
            <strong>Status saat ini:</strong>
            <span :class="backlogModal.row.backlog_status === 'pending' ? 'text-warning' : 'text-success'" class="ml-1 font-weight-bold">
              {{ backlogModal.row.backlog_status === 'pending' ? 'Pending' : 'Completed' }}
            </span>
            <div v-if="backlogModal.row.backlog_notes" class="mt-1 text-muted font-italic">{{ backlogModal.row.backlog_notes }}</div>
          </div>
        </div>
        <div class="modal-footer" v-if="isLoggedIn">
          <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal" :disabled="savingBacklog">Batal</button>
          <button type="button" class="btn btn-primary btn-sm" @click="saveBacklog" :disabled="savingBacklog">
            <span v-if="savingBacklog"><span class="spinner-border spinner-border-sm mr-1"></span>Menyimpan...</span>
            <span v-else><i class="fas fa-save mr-1"></i>Simpan</span>
          </button>
        </div>
        <div class="modal-footer" v-else>
          <small class="text-muted"><i class="fas fa-lock mr-1"></i>Login untuk mengelola backlog</small>
          <button type="button" class="btn btn-secondary btn-sm ml-auto" data-dismiss="modal">Tutup</button>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

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

/* Tombol Hapus X Log - di kanan dekat search box */
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

.card-header {
  border-radius: 0.5rem 0.5rem 0 0 !important;
}

.table-responsive { 
  overflow-x: auto; 
  margin-top: 15px;
}

.table thead th { 
  background-color: #e9f0f7; 
  color: black;
  font-weight: 600; 
  vertical-align: middle;
}

/* ✅ TABEL NORMAL DENGAN HOVER EFFECT SAJA */
.table-hover tbody tr:hover {
  background-color: #f8f9fa !important; /* ✅ HOVER ABU-ABU TERANG */
}


.badge {
  padding: 0.4em 0.8em;
  border-radius: 0.25rem;
  font-size: 0.85em;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}

.badge-success { 
  background-color: #28a745; 
  color: white; 
}

.badge-danger { 
  background-color: #dc3545; 
  color: white; 
}

.badge-info {
  background-color: #17a2b8;
  color: white;
}

.badge-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn { 
  cursor: pointer; 
}

.btn:disabled { 
  opacity: 0.65; 
  cursor: not-allowed; 
}

/* Center alignment */
.table td.text-center,
.table th.text-center {
  text-align: center;
  vertical-align: middle;
}

/* Table styling */
.table-sm {
  font-size: 0.875rem;
}

.table-sm th,
.table-sm td {
  padding: 0.6rem;
  vertical-align: middle;
}

/* Alert styling */
.alert {
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

/* print-specific helpers */
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }
  .no-print {
    display: none !important;
  }
  .print-header.d-none {
    display: block !important;
  }
  .print-header {
    text-align: center;
    margin-bottom: 20px;
  }
  .print-header .company-logo {
    font-size: 28px;
    font-weight: bold;
    color: #003366;
  }
  .print-header .company-name {
    font-size: 24px;
    font-weight: bold;
    color: #003366;
  }
  .print-header .company-address {
    font-size: 12px;
    color: #555;
    line-height: 1.3;
  }
  .print-header .report-title {
    margin-top: 10px;
    font-size: 22px;
    color: #0056b3;
    font-weight: bold;
  }
  .print-header .report-period {
    font-size: 14px;
    color: #666;
  }
  .print-footer {
    text-align: center;
    margin-top: 30px;
    font-size: 12px;
    color: #666;
  }
  .print-footer .footer-timestamp {
    font-weight: 500;
    color: #0056b3;
    margin-bottom: 5px;
  }
  .print-footer .footer-page {
    margin-top: 3px;
  }
  .print-footer .footer-disclaimer {
    margin-top: 15px;
    font-style: italic;
    color: #888;
    font-size: 11px;
  }
  /* hide datatables controls */
  .dataTables_wrapper {
    display: none !important;
  }
}

.dataTables_info {
  font-size: 0.875rem;
  color: #6c757d;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  /* Header filter buttons full width di mobile */
  .btn-group.w-100 {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .btn-group.w-100 .btn {
    flex: 1 1 auto;
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.25rem 0.4rem;
  }

  /* Tabel lebih kecil di mobile */
  .table th,
  .table td {
    padding: 0.35rem 0.4rem;
    font-size: 0.78rem;
  }

  .content-header {
    padding: 0.75rem 0.75rem 0.5rem;
  }

  .alert {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert .d-flex {
    flex-direction: column;
    width: 100%;
  }

  .alert .badge {
    margin-top: 0.5rem;
    margin-left: 0;
  }
}
</style>