<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useLogAktivitas } from '@/composables/useLogAktivitas'
import { logAktivitasApi } from '@/api'
import { printService } from '@/services/printService'
import { usePermissions } from '@/composables/usePermissions'
import { useUsers } from '@/composables/useUsers'

const permission = usePermissions()

// Backlog modal state
const backlogModal = ref({ show: false, row: null, status: null, notes: '' })
const savingBacklog = ref(false)

const openBacklogModal = (row) => {
  backlogModal.value = {
    show: true,
    row,
    status: row.backlog_status || null,
    notes: row.backlog_notes || ''
  }
  nextTick(() => $('#backlogModalPM').modal('show'))
}

// Format timestamp untuk display
const formatAuditTime = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Format audit trail info untuk tooltip
const formatAuditInfo = (row) => {
  const parts = []

  if (row.created_at) {
    const date = new Date(row.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Dibuat: ${date}`)
    if (row.created_by) parts.push(`oleh ${row.created_by}`)
  }

  if (row.updated_at && row.updated_at !== row.created_at) {
    const date = new Date(row.updated_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    parts.push(`Update: ${date}`)
    if (row.updated_by) parts.push(`oleh ${row.updated_by}`)
  }

  return parts.join('\n') || 'Tidak ada informasi audit'
}

const saveBacklog = async () => {
  if (!backlogModal.value.row?.log_no) return
  savingBacklog.value = true
  try {
    const updatedBy = permission.user.value?.inisial || permission.user.value?.nama || permission.user.value?.email || null

    // ✅ FIX: Kirim sebagai objek untuk konsistensi API
    const result = await logAktivitasApi.updateBacklog({
      no: backlogModal.value.row.log_no,
      status: backlogModal.value.status,
      notes: backlogModal.value.notes,
      updated_by: updatedBy
    })
    backlogModal.value.row.backlog_status = backlogModal.value.status
    backlogModal.value.row.backlog_notes = backlogModal.value.notes
    backlogModal.value.row.backlog_updated_at = new Date().toISOString()
    backlogModal.value.row.backlog_updated_by = updatedBy

    if (result?.data?.backlog_history) {
      backlogModal.value.row.backlog_history = result.data.backlog_history
    }

    $('#backlogModalPM').modal('hide')
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Backlog berhasil disimpan ke database', timer: 1200, showConfirmButton: false })
  } catch (error) {
    console.error('Error saving backlog:', error)
    Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Gagal menyimpan backlog' })
  } finally {
    savingBacklog.value = false
  }
}

const {
  loading,
  logs,
  selectedMonth,
  selectedYear,
  filterType,
  fetchData
} = useLogAktivitas()

const { users, fetchUsers } = useUsers()

// Computed untuk permission checks
const canCreate = computed(() => permission.can('logAktivitas:create'))
const canEdit = computed(() => permission.can('logAktivitas:edit'))
const canDelete = computed(() => permission.can('logAktivitas:delete'))
const isLoggedIn = computed(() => permission.isLoggedIn.value)

// ✅ SET FILTER TYPE KE PM SAJA
filterType.value = 'pm'

// State untuk tracking
const dataLoaded = ref(false)
const savingRows = ref(new Set())
const statusFilter = ref('all') // 'all' | 'selesai' | 'belum'
const searchQuery = ref('') // Kolom pencarian
const showObsolete = ref(true) // Toggle untuk show/hide data obsolete

const filteredLogs = computed(() => {
  let result = logs.value
  
  // Filter by status
  if (statusFilter.value === 'selesai') result = result.filter(r => r.status === 'Selesai')
  if (statusFilter.value === 'belum') result = result.filter(r => r.status !== 'Selesai')
  
  // Filter by obsolete status
  if (!showObsolete.value) result = result.filter(r => r.equipment_status !== 'obsolete')
  
  // Filter by search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(row => {
      // Cari di SEMUA kolom yang ditampilkan
      return (
        (row['No.ID'] && row['No.ID'].toLowerCase().includes(q)) ||
        (row.Description && row.Description.toLowerCase().includes(q)) ||
        (row['Type/Model'] && row['Type/Model'].toLowerCase().includes(q)) ||
        (row.Parameter && row.Parameter.toLowerCase().includes(q)) ||
        (row.SN && row.SN.toLowerCase().includes(q)) ||
        (row.pm_interval && row.pm_interval.toLowerCase().includes(q)) ||
        (row['Due Date'] && row['Due Date'].toLowerCase().includes(q)) ||
        (row.pic && row.pic.toLowerCase().includes(q)) ||
        (row.execute_date && row.execute_date.toLowerCase().includes(q)) ||
        (row.ket && row.ket.toLowerCase().includes(q))
      )
    })
  }
  
  return result
})

// State untuk users
const usersLoading = ref(false)
const openDropdownId = ref(null)
const picSearch = ref('')

// Computed untuk dropdown options (format: "Nama (INISIAL)") - exclude superadmin
const userOptions = computed(() => {
  return users.value
    .filter(user => user.role !== 'superadmin')
    .map(user => ({
      value: user.inisial || user.nama,
      label: `${user.nama} (${user.inisial || '-'})`
    }))
})

const filteredUserOptions = computed(() => {
  if (!picSearch.value) return userOptions.value
  const q = picSearch.value.toLowerCase()
  return userOptions.value.filter(u => u.label.toLowerCase().includes(q))
})

// Fungsi untuk mendapatkan inisial dari value
const getPicInisial = (picValue) => {
  const user = users.value.find(u => (u.inisial || u.nama) === picValue)
  return user?.inisial || picValue
}

// Toggle dropdown
const toggleDropdown = (rowId) => {
  if (openDropdownId.value === rowId) {
    openDropdownId.value = null
  } else {
    openDropdownId.value = rowId
    picSearch.value = ''
  }
}

// Pilih user dari dropdown
const selectUser = (row, userValue) => {
  row.pic = userValue
  openDropdownId.value = null
}

// Close dropdown saat klik di luar
const closeAllDropdowns = () => {
  openDropdownId.value = null
}

// Daftar bulan
const months = [
  { value: 'January', label: 'January' },
  { value: 'February', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'July', label: 'July' },
  { value: 'August', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' }
]

// Tahun untuk dropdown
const years = ['2025', '2026', '2027', '2028', '2029', '2030']

// ✅ FUNGSI FORMAT TANGGAL SAMA DENGAN LOG KALIBRASI
function formatDateDisplay(dateString) {
  if (!dateString) return ''
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }
  
  try {
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
  } catch (e) {
    // Ignore error
  }
  
  return dateString
}

const handleSearch = async () => {
  if (!selectedMonth.value || !selectedYear.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Peringatan!',
      text: 'Pilih bulan dan tahun terlebih dahulu',
      confirmButtonText: 'OK'
    })
    return
  }
  
  dataLoaded.value = true
  loading.value = true
  
  try {
    await fetchData()
    
    if (logs.value.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Informasi',
        text: `Tidak ada data PM untuk ${selectedMonth.value} ${selectedYear.value}`,
        confirmButtonText: 'OK'
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    
    Swal.fire({
      icon: 'error',
      title: 'Gagal!',
      text: error.message || 'Gagal memuat data PM',
      confirmButtonText: 'OK'
    })
  } finally {
    loading.value = false
  }
}

const printDate = ref('')
// print helper
const handlePrint = () => {
  if (!dataLoaded.value || filteredLogs.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Tidak Ada Data',
      text: 'Belum ada data untuk dicetak',
      confirmButtonText: 'OK'
    })
    return
  }

  const now = new Date()
  printDate.value = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  
  // Call print service dengan data yang sudah difilter
  printService.printPM(filteredLogs.value, selectedMonth.value, selectedYear.value)
}

// ✅ SIMPAN LANGSUNG VIA API, LALU RELOAD DATA PERIODE
const saveToLogAktivitas = async (row) => {
  if (!row.pic || !row.execute_date || !row.ket?.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Peringatan!',
      text: 'PIC, Execute Date, dan Keterangan wajib diisi',
      confirmButtonText: 'OK'
    })
    return
  }

  const rowKey = row['No.ID']
  if (savingRows.value.has(rowKey)) return
  
  savingRows.value.add(rowKey)
  
  try {
    const response = await logAktivitasApi.createLog({
      no_id: row['No.ID'],
      cal_id: `${row['No.ID']}.PM`,
      jenis: 'PM',
      tanggal: row.execute_date,
      petugas: row.pic,
      keterangan: row.ket
    })

    if (!response || response.success === false) {
      throw new Error(response?.message || 'Gagal menyimpan data')
    }

    // Update status baris ini secara lokal — TIDAK fetch ulang agar input baris lain tidak hilang
    row.status = 'Selesai'
    row.log_no = response.data?.no || null
    
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: 'Data PM berhasil disimpan',
      timer: 1200,
      showConfirmButton: false
    })
    
  } catch (error) {
    console.error('❌ Gagal simpan:', error)
    Swal.fire({
      icon: 'error',
      title: 'Gagal!',
      text: error.message || 'Gagal menyimpan data PM',
      confirmButtonText: 'OK'
    })
  } finally {
    savingRows.value.delete(rowKey)
  }
}

const preventFormSubmit = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
  }
}

onMounted(async () => {
  selectedMonth.value = 'January'
  selectedYear.value = new Date().getFullYear().toString()
  
  // Fetch users untuk dropdown PIC
  usersLoading.value = true
  try {
    await fetchUsers()
  } catch (error) {
    console.error('Gagal load data user:', error)
  } finally {
    usersLoading.value = false
  }
  
  // Close dropdown saat klik di luar
  document.addEventListener('click', closeAllDropdowns)
})
</script>

<template>
  <div class="content-wrapper">
    <section class="content-header">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h1 class="mb-0">Data Log Preventive Maintenance (PM)</h1>
          <span class="badge badge-info no-print">
            Total: {{ logs.length }} data
          </span>
        </div>
        
        <div class="row no-print align-items-end">
          <div class="col-md-3">
            <label class="font-weight-bold mb-2">Pilih Bulan:</label>
            <select v-model="selectedMonth" class="form-control" :disabled="loading">
              <option value="">-- Pilih Bulan --</option>
              <option v-for="month in months" :key="month.value" :value="month.value">
                {{ month.label }}
              </option>
            </select>
          </div>
          
          <div class="col-md-2">
            <label class="font-weight-bold mb-2">Pilih Tahun:</label>
            <select v-model="selectedYear" class="form-control" :disabled="loading">
              <option value="">-- Pilih Tahun --</option>
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>
          
          <div class="col-md-2 d-flex align-items-end">
            <button @click="handleSearch" :disabled="!selectedMonth || !selectedYear || loading" class="btn btn-secondary">
              <i class="fas fa-search mr-1"></i>
              <span v-if="loading">Loading...</span>
              <span v-else>Cari Data</span>
            </button>
          </div>
          <div class="col-md-5 d-flex align-items-end justify-content-end">
            <!-- Filter Status -->
            <div class="btn-group btn-group-sm mr-2" role="group" v-if="dataLoaded && logs.length > 0">
              <button type="button" class="btn" :class="statusFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'" @click="statusFilter = 'all'">Semua</button>
              <button type="button" class="btn" :class="statusFilter === 'selesai' ? 'btn-success' : 'btn-outline-success'" @click="statusFilter = 'selesai'">Selesai</button>
              <button type="button" class="btn" :class="statusFilter === 'belum' ? 'btn-danger' : 'btn-outline-danger'" @click="statusFilter = 'belum'">Belum</button>
            </div>
            <!-- Toggle Obsolete -->
            <button type="button" class="btn btn-sm mr-2" :class="showObsolete ? 'btn-outline-secondary' : 'btn-secondary'" @click="showObsolete = !showObsolete" v-if="dataLoaded && logs.length > 0" title="Show/Hide data obsolete">
              <i class="fas mr-1" :class="showObsolete ? 'fa-eye' : 'fa-eye-slash'"></i>
              <span class="d-none d-md-inline">{{ showObsolete ? '' : '' }}</span>
            </button>
            <!-- Search input -->
            <div class="form-group mr-2" style="margin-bottom: 0;">
              <input 
                v-model="searchQuery" 
                type="text" 
                class="form-control form-control-sm" 
                placeholder="Cari..."
                style="width: 120px;"
              />
            </div>
            <button
              class="btn btn-primary"
              :disabled="!dataLoaded || logs.length === 0"
              @click="handlePrint"
              title="Cetak halaman"
            >
              <i class="fas fa-print mr-1"></i>Print
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <!-- print header info -->
        <!-- <div class="print-header d-none">
          <div class="company-logo">AGIS</div>
          <div class="company-name">PT. AGIS INSTRUMENT SERVICES</div>
          <div class="company-address">Jl. Raya Industri No. 123, Kawasan Industri MM2100</div>
          <div class="company-address">Cikarang Barat, Bekasi 17520 - Indonesia</div>
          <div class="company-address">Telp: (021) 897-1234 | Email: info@agis.co.id</div>
          <h1 class="report-title">LAPORAN LOG PM</h1>
          <div class="report-subtitle">No. Reff: AGIS-WI-ENG-016-LD1_v5.0</div>
          <div class="report-period">
            Periode: {{ selectedMonth }} {{ selectedYear }}
          </div>
        </div> -->
        <div class="card">
          <div class="card-body">
            <div v-if="!dataLoaded" class="text-center py-5">
              <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
              <p class="text-muted mt-3">Pilih bulan dan tahun, lalu klik "Cari Data"</p>
            </div>

            <!-- ✅ HAPUS KONDISI LOADING GLOBAL - TIDAK DIPERLUKAN LAGI -->
            <!-- <div v-else-if="loading" class="text-center py-4"> ... </div> -->

            <div v-else-if="logs.length > 0">
              <div class="table-responsive">
                <table class="table table-bordered table-hover table-sm">
                  <thead class="thead-light">
                    <tr>
                      <th style="width: 5%">No</th>
                      <th style="width: 10%">No.ID</th>
                      <th style="width: 15%">Description</th>
                      <th style="width: 10%">Type/Model</th>
                      <th style="width: 10%">SN</th>
                      <th style="width: 5%">Interval</th>
                      <th style="width: 8%">Due Date</th>
                      <th style="width: 10%">PIC</th>
                      <th style="width: 12%">Execute Date</th>
                      <th style="width: 15%">Keterangan</th>
                      <th style="width: 8%">Status</th>
                      <th style="width: 5%">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in filteredLogs" :key="'pm-' + index" :class="{'table-secondary': row.equipment_status === 'obsolete', 'table-success': row.status === 'Selesai' && row.equipment_status !== 'obsolete'}">
                      <td class="text-center">{{ index + 1 }}</td>
                      <td>
                        {{ row['No.ID'] }}
                        <!-- Audit trail tooltip -->
                        <span v-if="row.created_at || row.updated_at" class="ml-1" style="cursor: help;" :title="formatAuditInfo(row)">
                          <i class="fas fa-info-circle text-muted" style="font-size: 0.75rem;"></i>
                        </span>
                      </td>
                      <td>{{ row.Description }}</td>
                      <td>{{ row['Type/Model'] || row.Parameter || '-' }}</td>
                      <td>{{ row.SN || '-' }}</td>
                      <td>{{ row.pm_interval || '-' }}</td>
                      <td class="text-center">{{ row['Due Date'] }}</td>
                      
                      <td>
                        <!-- Tampilkan hanya inisial saat status Selesai -->
                        <span v-if="row.status === 'Selesai'" class="text-center d-block">
                          {{ getPicInisial(row.pic) }}
                        </span>
                        
                        <!-- Custom dropdown saat status Belum -->
                        <div v-else class="dropdown-container" style="position: relative;" @click.stop>
                          <button
                            type="button"
                            class="form-control form-control-sm text-left"
                            :disabled="usersLoading"
                            @click="toggleDropdown(`pm-${index}`)"
                            style="min-width: 150px; width: 100%; text-align: left;"
                          >
                            {{ row.pic ? getPicInisial(row.pic) : '-- Pilih PIC --' }}
                            <span class="float-right">▼</span>
                          </button>
                          
                          <!-- Dropdown menu -->
                          <div
                            v-if="openDropdownId === `pm-${index}`"
                            class="dropdown-menu show"
                            style="display: block; position: absolute; z-index: 1000; width: 100%; padding: 0;"
                          >
                            <!-- Search input -->
                            <div class="px-2 py-1 border-bottom">
                              <input
                                v-model="picSearch"
                                type="text"
                                class="form-control form-control-sm"
                                placeholder="Cari nama..."
                                @click.stop
                                autocomplete="off"
                              />
                            </div>
                            <div style="max-height: 160px; overflow-y: auto;">
                              <div v-if="!filteredUserOptions.length" class="text-muted small px-3 py-2">Tidak ditemukan</div>
                              <option
                                v-for="user in filteredUserOptions"
                                :key="user.value"
                                :value="user.value"
                                @click="selectUser(row, user.value)"
                                class="dropdown-item"
                                style="cursor: pointer; padding: 0.25rem 0.5rem;"
                              >
                                {{ user.label }}
                              </option>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td class="text-center">
                        <span v-if="row.status === 'Selesai'">
                          {{ formatDateDisplay(row.execute_date) }}
                        </span>
                        <input
                          v-else
                          v-model="row.execute_date"
                          type="date"
                          class="form-control form-control-sm text-center"
                          @keydown="preventFormSubmit"
                          style="min-width: 100px; width: 100%;"
                        />
                      </td>

                      <td>
                        <input
                          v-model="row.ket"
                          type="text"
                          class="form-control form-control-sm"
                          :placeholder="row.ket || 'Keterangan'"
                          :disabled="row.status === 'Selesai'"
                          @keydown="preventFormSubmit"
                        />
                      </td>
                      
                      <td class="text-center">
                        <span :class="['badge', row.status === 'Selesai' ? 'badge-success' : 'badge-danger']">
                          {{ row.status }}
                        </span>
                        <span v-if="row.backlog_status === 'pending'" class="badge badge-warning d-block mt-1" title="Ada follow-up pending">
                          <i class="fas fa-clock mr-1"></i>Backlog
                        </span>
                        <span v-else-if="row.backlog_status === 'completed'" class="badge badge-info d-block mt-1" title="Backlog selesai">
                          <i class="fas fa-check mr-1"></i>Done
                        </span>
                      </td>
                      
                      <td class="text-center">
                        <button
                          v-if="isLoggedIn && row.status === 'Belum'"
                          @click="saveToLogAktivitas(row)"
                          :disabled="!row.pic || !row.execute_date || !row.ket?.trim() || savingRows.has(row['No.ID'])"
                          :class="['btn btn-sm', savingRows.has(row['No.ID']) ? 'btn-success' : 'btn-warning']"
                          type="button"
                        >
                          <span v-if="savingRows.has(row['No.ID'])">
                            <span class="spinner-border spinner-border-sm mr-1"></span>
                            Menyimpan...
                          </span>
                          <span v-else>
                            <i class="fas fa-save"></i>
                          </span>
                        </button>
                        <span v-else-if="row.status === 'Selesai'" class="d-flex align-items-center justify-content-center">
                          <i class="fas fa-check-circle fa-lg text-success mr-2"></i>
                          <button
                            class="btn btn-sm"
                            :class="row.backlog_status === 'pending' ? 'btn-warning' : row.backlog_status === 'completed' ? 'btn-success' : 'btn-outline-secondary'"
                            @click="openBacklogModal(row)"
                            title="Lihat/Kelola Backlog"
                          >
                            <i class="fas fa-clipboard-list"></i>
                          </button>
                        </span>
                        <span v-else class="text-muted small">
                          <i class="fas fa-lock mr-1"></i>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- print footer -->
              <div class="print-footer d-none">
                <div class="footer-timestamp">Dicetak pada: {{ printDate }}</div>
                <div class="footer-page">Halaman 1 dari 1</div>
                <div class="footer-disclaimer">
                  Dokumen ini dihasilkan secara otomatis oleh sistem QMS AGIS. 
                  Setiap perubahan harus melalui prosedur kontrol dokumen yang berlaku.
                </div>
              </div>
            </div>

            <!-- ✅ HANYA TAMPILKAN LOADING SAAT SEDANG MEMUAT DATA -->
              <div v-if="loading && dataLoaded" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-2 text-primary">Memuat data...</p>
              </div>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Backlog Modal -->
  <div class="modal fade" id="backlogModalPM" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="fas fa-clipboard-list mr-2"></i>Backlog / Follow-up</h5>
          <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-2">
            <strong>{{ backlogModal.row?.['No.ID'] }}</strong> — {{ backlogModal.row?.['Description'] }}
          </p>
          <!-- Audit trail info -->
          <div v-if="backlogModal.row?.backlog_updated_at" class="alert alert-light py-1 px-2 mb-2 small">
            <i class="fas fa-history mr-1 text-muted"></i>
            Terakhir diubah: <strong>{{ formatAuditTime(backlogModal.row.backlog_updated_at) }}</strong>
            <span v-if="backlogModal.row.backlog_updated_by"> oleh <strong>{{ backlogModal.row.backlog_updated_by }}</strong></span>
          </div>
          <!-- History perubahan backlog -->
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
                placeholder="Contoh: Menunggu part bearing dari supplier, ETA 2 minggu"></textarea>
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
.table-responsive { 
  overflow-x: auto; 
}

.table thead th { 
  background-color: #f0f4f7; 
  font-weight: 600; 
}

.table tbody tr.table-success { 
  background-color: #d4edda !important; 
}

.badge { 
  padding: 0.4em 0.8em; 
  border-radius: 0.25rem; 
  font-size: 0.85em; 
  font-weight: 500; 
}

.badge-success { 
  background-color: #28a745; 
  color: white; 
}

.badge-danger { 
  background-color: #dc3545; 
  color: white; 
}

.btn { 
  cursor: pointer; 
}

.btn:disabled { 
  opacity: 0.65; 
  cursor: not-allowed; 
}

.btn-warning { 
  background-color: #ffc107; 
  border-color: #ffc107; 
  color: #212529; 
}

.btn-warning:hover:not(:disabled) { 
  background-color: #e0a800; 
  border-color: #d39e00; 
}

.btn-success {
  background-color: #28a745;
  border-color: #28a745;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
  border-color: #1e7e34;
}

.spinner-border { 
  width: 1rem; 
  height: 1rem; 
  border-width: 0.2em; 
}

.table td.text-center,
.table th.text-center {
  text-align: center;
  vertical-align: middle;
}

/* Custom dropdown untuk PIC */
.dropdown-container {
  position: relative;
}

.dropdown-container button {
  text-align: left;
  position: relative;
}

.dropdown-container button .float-right {
  float: right;
  font-size: 0.7em;
  margin-top: 3px;
}

.dropdown-menu.show {
  background-color: white;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  width: 100%;
  min-width: 150px;
  margin-top: 2px;
}

.dropdown-menu.show .dropdown-item:hover {
  background-color: #f8f9fa;
}

.text-left {
  text-align: left !important;
}

.table-sm {
  font-size: 0.875rem;
}

.table-sm th,
.table-sm td {
  padding: 0.5rem;
  vertical-align: middle;
}

.form-control-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.form-control-sm.text-center {
  text-align: center;
}

/* print-specific helpers */
@media print {
  /* landscape orientation */
  @page {
    size: landscape;
    margin: 10mm;
  }
  .no-print {
    display: none !important;
  }
  .table-responsive {
    overflow: visible !important;
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
  .print-header .report-subtitle,
  .print-header .report-period {
    font-size: 14px;
    color: #666;
  }

  /* footer styling */
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
}
</style>