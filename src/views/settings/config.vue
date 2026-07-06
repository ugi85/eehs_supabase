<template>
  <div class="content-wrapper">
    <section class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1>Konfigurasi Sistem</h1>
          </div>
          <div class="col-sm-6">
            <ol class="breadcrumb float-sm-right">
              <li class="breadcrumb-item">
                <a href="/dashChart">Home</a>
              </li>
              <li class="breadcrumb-item active">Konfigurasi</li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="container-fluid">
        <div class="row">
          <!-- Form Konfigurasi -->
          <div class="col-md-8">
            <div class="card card-primary">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-cog mr-2"></i>Pengaturan Sistem</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <!-- Sistem -->
                <div class="form-group">
                  <label>Nama Sistem</label>
                  <input 
                    v-model="draft.systemName" 
                    type="text" 
                    class="form-control" 
                    placeholder="Dashboard EEHS"
                  />
                </div>
                <div class="form-group">
                  <label>Versi Sistem</label>
                  <input 
                    v-model="draft.systemVersion" 
                    type="text" 
                    class="form-control" 
                    placeholder="2.1.0"
                  />
                </div>

                <!-- Data Versioning Management -->
                <div class="card card-info mt-4">
                  <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-code-branch mr-2"></i>Manajemen Versi Data</h3>
                    <div class="card-tools">
                      <button type="button" class="btn btn-tool" data-card-widget="collapse">
                        <i class="fas fa-minus"></i>
                      </button>
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="form-group">
                      <label>Deskripsi Versi Baru</label>
                      <input 
                        v-model="newVersionDescription" 
                        type="text" 
                        class="form-control" 
                        placeholder="Update jadwal kalibrasi Mei 2026"
                      />
                      <small class="form-text text-muted">
                        Deskripsi perubahan data yang akan di-snapshot sebagai versi baru
                      </small>
                    </div>
                    <button 
                      @click="createNewVersion" 
                      class="btn btn-success"
                      :disabled="versioningLoading || !newVersionDescription.trim()"
                    >
                      <span v-if="versioningLoading">
                        <span class="spinner-border spinner-border-sm mr-1"></span>
                        Membuat Versi...
                      </span>
                      <span v-else>
                        <i class="fas fa-plus mr-1"></i>Buat Versi Data Baru
                      </span>
                    </button>

                    <!-- Tambahan Fitur Sync -->
                    <div class="card card-primary mt-4">
                      <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-sync mr-2"></i>Sinkronisasi Data</h3>
                      </div>
                      <div class="card-body">
                        <p>Gunakan fitur ini jika data di Google Sheets lebih baru daripada di Supabase.</p>
                        <button @click="handleSync" class="btn btn-primary" :disabled="syncing">
                          <i class="fas fa-arrow-down mr-1"></i> {{ syncing ? 'Sinkronisasi...' : 'Sync Sheets ke Supabase' }}
                        </button>
                      </div>
                    </div>
                    <!-- Version History -->
                    <div class="mt-4" v-if="versions.length > 0">
                      <h5>Riwayat Versi Data</h5>
                      <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                          <thead>
                            <tr>
                              <th>Versi</th>
                              <th>Tanggal</th>
                              <th>Deskripsi</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="version in versions" :key="version.version_id">
                              <td>{{ version.version_name }}</td>
                              <td>{{ formatDate(version.snapshot_date) }}</td>
                              <td>{{ version.description }}</td>
                              <td>
                                <span class="badge" :class="version.is_active ? 'badge-success' : 'badge-secondary'">
                                  {{ version.is_active ? 'Aktif' : 'Tidak Aktif' }}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Database Configuration Switch (Admin Only) -->
                <div class="card card-danger mt-4" v-if="isAdmin">
                  <div class="card-header">
                    <h3 class="card-title">
                      <i class="fas fa-database mr-2"></i>Konfigurasi Database
                      <span class="badge badge-warning ml-2">Admin Only</span>
                    </h3>
                    <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
                  </div>
                  <div class="card-body">
                    <!-- Current Database Status -->
                    <div class="alert" :class="isUsingSupabase ? 'alert-info' : 'alert-warning'">
                      <h5><i class="fas fa-info-circle mr-2"></i>Database Saat Ini</h5>
                      <p class="mb-0">
                        <strong>{{ currentDatabaseName }}</strong>
                        <span v-if="isUsingSpreadsheet && spreadsheetInfo">
                          - <a :href="spreadsheetInfo.url" target="_blank" class="text-primary">
                            <i class="fas fa-external-link-alt"></i> Buka Spreadsheet
                          </a>
                        </span>
                      </p>
                      <small class="text-muted">
                        Status: {{ isUsingSupabase ? 'Aktif (Supabase)' : 'Aktif (Emergency/Google Sheets)' }}
                      </small>
                    </div>

                    <!-- Switch Database Form -->
                    <div class="form-group">
                      <label>Pilih Tipe Database</label>
                      <select
                        v-model="databaseSwitchForm.database_type"
                        class="form-control"
                        :disabled="isSwitching"
                      >
                        <option value="supabase">Supabase (PostgreSQL)</option>
                        <option value="spreadsheet">Google Spreadsheet</option>
                      </select>
                      <small class="form-text text-muted">
                        <i class="fas fa-exclamation-triangle text-warning"></i> 
                        Mengubah database akan memuat ulang halaman
                      </small>
                    </div>

                    <!-- Spreadsheet Settings (OPTIONAL - endpoints pre-configured) -->
                    <div v-if="databaseSwitchForm.database_type === 'spreadsheet'" class="border-left border-info pl-3 mb-3">
                      <div class="alert alert-info mb-3">
                        <small>
                          <i class="fas fa-check-circle mr-1"></i>
                          <strong>Endpoint Google Apps Script sudah ter-konfigurasi.</strong> Anda bisa langsung switch tanpa perlu memasukan ID atau URL spreadsheet.
                        </small>
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Catatan Perubahan</label>
                      <textarea
                        v-model="databaseSwitchForm.notes"
                        class="form-control"
                        rows="2"
                        placeholder="Alasan switch database..."
                        :disabled="isSwitching"
                      ></textarea>
                    </div>
                    <!-- Switch Button -->
                    <div class="d-flex justify-content-between align-items-center">
                <button
                        @click="handleSwitchDatabase"
                        class="btn btn-danger"
                        :disabled="isSwitching"
                      >
                        <span v-if="isSwitching">
                          <span class="spinner-border spinner-border-sm mr-1"></span>
                          Switching...
                        </span>
                        <span v-else>
                          <i class="fas fa-sync-alt mr-1"></i>Switch Database
                        </span>
                      </button>
                      <small class="text-danger">
                        <i class="fas fa-exclamation-circle"></i> 
                        Pastikan data sudah di-backup!
                      </small>
                    </div>

                    <!-- Database History -->
                    <div class="mt-4" v-if="allConfigs.length > 0">
                      <h5>Riwayat Konfigurasi Database</h5>
                      <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                          <thead>
                            <tr>
                              <th>Tipe</th>
                              <th>Tanggal</th>
                              <th>Oleh</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="cfg in allConfigs" :key="cfg.id">
                              <td>
                                <span class="badge" :class="cfg.database_type === 'supabase' ? 'badge-info' : 'badge-warning'">
                                  {{ cfg.database_type }}
                                </span>
                              </td>
                              <td>{{ formatDate(cfg.updated_at) }}</td>
                              <td>{{ cfg.updated_by || '-' }}</td>
                              <td>
                                <span class="badge" :class="cfg.is_active ? 'badge-success' : 'badge-secondary'">
                                  {{ cfg.is_active ? 'Aktif' : 'Tidak Aktif' }}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                </div>
                </div>

                <!-- Perusahaan -->
                <div class="form-group">
                  <label>Nama Perusahaan</label>
                  <input
                    v-model="draft.companyName"
                    type="text"
                    class="form-control"
                    placeholder="PT. AGIS SISTEM INDONESIA"
                  />
                </div>
             <!-- DUA JENIS NO. REFERENSI -->
                <div class="card card-warning mt-4">
                  <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-file-alt mr-2"></i>No. Referensi Dokumen</h3>
                    <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
                  </div>
                  <div class="card-body">
                    <div class="form-group">
                      <label>No. Referensi Daftar Alat</label>
                      <input
                        v-model="draft.documentRefEquipment"
                        type="text"
                        class="form-control"
                        placeholder="AGIS-WI-ENG-001-LD1_v5.0"
                      />
                      <small class="form-text text-muted">
                        Contoh: AGIS-WI-ENG-001-LD1_v5.0 (untuk Daftar Alat)
                      </small>
                    </div>
                    <div class="form-group">
                      <label>No. Referensi Jadwal Kalibrasi</label>
                      <input
                        v-model="draft.documentRefCalibration"
                        type="text"
                        class="form-control"
                        placeholder="AGIS-WI-ENG-016-LD1_v5.0"
                      />
                      <small class="form-text text-muted">
                        Contoh: AGIS-WI-ENG-016-LD1_v5.0 (untuk Jadwal Kalibrasi)
                      </small>
              </div>
                    </div>
                </div>
              </div>
            </div>

              <!-- Aksi -->
            <div class="card card-secondary mt-4">
              <div class="card-body">
                <div class="d-flex justify-content-between">
                  <button
                    @click="resetConfig"
                    class="btn btn-danger"
                    :disabled="isSaving"
                  >
                    <i class="fas fa-undo mr-1"></i>Reset Default
                  </button>
                  <button
                    @click="confirmAndSave"
                    class="btn btn-primary"
                    :disabled="isSaving"
                  >
                    <span v-if="isSaving">
                      <span class="spinner-border spinner-border-sm mr-1"></span>
                      Menyimpan...
                    </span>
                    <span v-else>
                      <i class="fas fa-save mr-1"></i>Simpan Perubahan
                    </span>
                  </button>
                </div>
                <div v-if="config.lastUpdated" class="mt-3 text-muted small">
                  <i class="fas fa-clock mr-1"></i>
                  Terakhir disimpan: {{ formatDate(config.lastUpdated) }}
                </div>
              </div>
            </div>
           

          </div>
          
          <!-- Preview & Logo -->
          <div class="col-md-4">
            <!-- Logo Upload -->
            <div class="card card-info">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-image mr-2"></i>Logo Sistem</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body text-center">
                <div class="logo-preview mx-auto mb-3">
                  <img
                    :src="draftLogo || getLogoUrl"
                    alt="Logo Preview"
                    class="img-fluid"
                  />
                </div>
                <div class="custom-file">
                  <input
                    type="file"
                    class="custom-file-input"
                    id="logoUpload"
                    accept="image/*"
                    @change="handleLogoUpload"
                  />
                  <label class="custom-file-label" for="logoUpload">Pilih file logo (auto-compress)</label>
                </div>
                <small class="form-text text-muted mt-2">
                  Format: PNG, JPG | Auto-compress: Max 800x600px<br>
                  <strong>Favicon akan otomatis dibuat dari logo</strong>
                </small>
                <div class="mt-3 text-center">
                  <div class="small text-muted mb-2">Preview Favicon (32x32):</div>
                  <div style="width: 32px; height: 32px; margin: 0 auto; border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden;">
                    <img :src="draftLogo || getLogoUrl" alt="Favicon" style="width: 100%; height: 100%; object-fit: contain;" />
                  </div>
                </div>
                <button
                  @click="removeLogo"
                  class="btn btn-sm btn-outline-danger mt-3"
                  :disabled="!config.logoUrl && !config.logoDataUrl"
                >
                  <i class="fas fa-trash mr-1"></i>Hapus Logo
                </button>
              </div>
            </div>

            <!-- Logo Perusahaan (untuk Print) -->
            <div class="card card-warning mt-4">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-building mr-2"></i>Logo Perusahaan (Print)</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body text-center">
                <div class="logo-preview mx-auto mb-3">
                  <img
                    :src="draftCompanyLogo || config.logoPerusahaanUrl || '/logo/agis-logo.png'"
                    alt="Logo Perusahaan Preview"
                    class="img-fluid"
                  />
                </div>
                <div class="custom-file">
                  <input
                    type="file"
                    class="custom-file-input"
                    id="companyLogoUpload"
                    accept="image/*"
                    @change="handleCompanyLogoUpload"
                  />
                  <label class="custom-file-label" for="companyLogoUpload">Pilih file logo (auto-compress)</label>
                </div>
                <small class="form-text text-muted mt-2">
                  Format: PNG, JPG | Auto-compress: Max 800x600px<br>
                  <strong>Digunakan untuk header print dokumen</strong>
                </small>
                <button
                  @click="removeCompanyLogo"
                  class="btn btn-sm btn-outline-danger mt-3"
                  :disabled="!config.logoPerusahaanUrl && !config.logoPerusahaanDataUrl"
                >
                  <i class="fas fa-trash mr-1"></i>Hapus Logo Perusahaan
                </button>
              </div>
            </div>

                </div>
              </div>
                    </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFrontendConfig } from '@/composables/useConfig'
import { useVersioning } from '@/composables/useVersioning'
import { useDatabaseConfig } from '@/composables/useDatabaseConfig'
import { useSettingsStore } from '@/stores/settings'
import { userStore } from '@/stores/userStore'

const {
  config,
  isSaving,
  previewLogo,
  getLogoUrl,
  getFullAddress,
  saveConfig,
  resetConfig,
  loadConfig,
  updateLogo,
  uploadLogo,
  deleteLogo
} = useFrontendConfig()

const {
  versions,
  versioningLoading,
  fetchVersions,
  createVersion
} = useVersioning()

// Database Config
const {
  activeConfig,
  allConfigs,
  isLoading: dbConfigLoading,
  isSwitching,
  isTesting,
  spreadsheetInfo,
  loadActiveConfig,
  loadAllConfigs,
  switchDatabase,
  testConnection
} = useDatabaseConfig()

const settingsStore = useSettingsStore()
const isUsingSupabase = computed(() => settingsStore.isUsingSupabase)
const isUsingSpreadsheet = computed(() => settingsStore.isUsingGoogleSheets)
const currentDatabaseName = computed(() => settingsStore.isUsingSupabase ? 'Supabase' : 'Google Spreadsheet')

// Check if user is admin
const currentUser = computed(() => userStore.state.user)
const isAdmin = computed(() => {
  const role = currentUser.value?.role
  return role === 'admin' || role === 'superadmin'
})

// Database switch form
const databaseSwitchForm = ref({
  database_type: 'supabase',
  spreadsheet_id: '',
  spreadsheet_url: '',
  notes: ''
})

// local draft object used by the form; changes here are not reflected globally
const draft = ref({ ...config.value })
const draftLogo = ref(previewLogo.value)
const draftCompanyLogo = ref(null) // For company logo preview
const isSavingLocal = ref(false) // Flag untuk mencegah watch trigger saat save
const isUploading = ref(false)

const syncing = ref(false)
const newVersionDescription = ref('')

// Handle Sync
const handleSync = async () => {
  if (!confirm('Data dari Sheets akan menimpa data di Supabase (untuk ID yang sama). Lanjutkan?')) return

  syncing.value = true
  try {
    const { syncService } = await import('@/services/syncService')
    const result = await syncService.syncSheetsToSupabase()
    Swal.fire('Berhasil!', `Sinkronisasi selesai. ${result.count} data diperbarui.`, 'success')
  } catch (err) {
    Swal.fire('Gagal!', err.message, 'error')
  } finally {
    syncing.value = false
  }
}

// keep draft in sync when config is externally updated (bukan dari save lokal)
watch(config, (newVal) => {
  if (isSavingLocal.value) {
    return
  }
  draft.value = { ...newVal }
  draftLogo.value = previewLogo.value
}, { deep: true })

// ✅ GENERATE FAVICON FROM IMAGE (fallback untuk development)
const generateFaviconFromImage = (dataUrl) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, 32, 32)
    const faviconDataUrl = canvas.toDataURL('image/png')
    draft.value.faviconDataUrl = faviconDataUrl
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      document.head.appendChild(link)
    }
    link.href = faviconDataUrl
  }
  img.src = dataUrl
}

// ✅ AUTO-COMPRESS IMAGE sebelum upload (with transparency support)
const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Hitung ukuran baru dengan maintain aspect ratio
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
        
        // Create canvas dan resize
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Clear canvas with transparent background for PNG
        ctx.clearRect(0, 0, width, height)
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Detect file type and use appropriate format
        let mimeType = 'image/jpeg'
        let compressQuality = quality
        
        // Check if original file is PNG or has transparency
        if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png'
          compressQuality = 1 // PNG doesn't use quality parameter
        } else if (file.type === 'image/webp') {
          mimeType = 'image/webp'
        }
        
        // Compress dan convert ke dataURL
        const compressedDataUrl = canvas.toDataURL(mimeType, compressQuality)
        
        console.log('[Compress] Original:', img.width, 'x', img.height, '|', Math.round(file.size / 1024), 'KB', '|', file.type)
        console.log('[Compress] Compressed:', width, 'x', height, '|', Math.round(compressedDataUrl.length * 3 / 4 / 1024), 'KB', '|', mimeType)
        
        resolve(compressedDataUrl)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ✅ HANDLE UPLOAD LOGO - Upload ke Supabase as base64
const handleLogoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
  if (window.Swal) {
    window.Swal.fire({
        icon: 'error',
        title: 'Gagal Upload!',
        text: 'File harus berupa gambar (PNG, JPG, SVG)',
        confirmButtonText: 'OK'
      })
    }
    return
  }

  // Show loading
            if (window.Swal) {
              window.Swal.fire({
      title: 'Mengupload...',
      text: 'Logo sedang dikompres dan disimpan',
      allowOutsideClick: false,
      didOpen: () => {
        window.Swal.showLoading()
      }
    })
  }
  try {
    // Auto-compress image
    const compressedDataUrl = await compressImage(file, 800, 600, 0.8)
    
    // Detect mime type from dataURL
    const mimeMatch = compressedDataUrl.match(/^data:([^;]+);/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
    
    // Convert dataURL ke File untuk upload
    const response = await fetch(compressedDataUrl)
    const blob = await response.blob()
    const compressedFile = new File([blob], file.name, { type: mimeType })

    // Upload ke API (akan disimpan sebagai base64 di Supabase)
    const result = await uploadLogo(compressedFile, 'logo sistem')

    // Update draft untuk preview - logoUrl berisi base64
    draftLogo.value = result.logoUrl
    draft.value.logoUrl = result.logoUrl
    draft.value.logoDataUrl = result.logoUrl
    draft.value.faviconUrl = result.faviconUrl
    draft.value.faviconDataUrl = result.faviconUrl

    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Logo berhasil diupload dan dikompres otomatis',
        timer: 1500,
        showConfirmButton: false
      })
    }
  } catch (error) {
    console.error('[Config] Upload error:', error)
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Gagal Upload!',
        text: error.message || 'Terjadi kesalahan saat upload logo',
        confirmButtonText: 'OK'
    })
  }
}

  event.target.value = ''
}

// ✅ HAPUS LOGO with confirmation
const removeLogo = async () => {
  if (window.Swal) {
    window.Swal.fire({
      icon: 'warning',
      title: 'Hapus logo?',
      text: 'Logo dan favicon yang telah disimpan akan dihapus dari semua pengguna.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          draft.value.logoUrl = null
          draft.value.faviconUrl = null
          draft.value.logoDataUrl = null
          draft.value.faviconDataUrl = null
          draftLogo.value = null
          
          // Delete dari blob storage
          await deleteLogo()
          
          // Kembalikan favicon ke default
          let link = document.querySelector("link[rel~='icon']")
          if (link) {
            link.href = '/favicon.ico'
  }

          if (window.Swal) {
            window.Swal.fire({
              icon: 'success',
              title: 'Berhasil!',
              text: 'Logo berhasil dihapus',
              timer: 1500,
              showConfirmButton: false
            })
          }
        } catch (error) {
          if (window.Swal) {
            window.Swal.fire({
              icon: 'error',
              title: 'Gagal!',
              text: error.message || 'Terjadi kesalahan saat menghapus logo',
              confirmButtonText: 'OK'
            })
          }
        }
      }
    })
  }
}

// ✅ HAPUS LOGO PERUSAHAAN
const removeCompanyLogo = async () => {
  if (window.Swal) {
    window.Swal.fire({
      icon: 'warning',
      title: 'Hapus logo perusahaan?',
      text: 'Logo perusahaan yang digunakan untuk print akan dihapus.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          draft.value.logoPerusahaanUrl = null
          draft.value.logoPerusahaanDataUrl = null
          draftCompanyLogo.value = null

          await deleteLogo('logo perusahaan')

          if (window.Swal) {
            window.Swal.fire({
              icon: 'success',
              title: 'Berhasil!',
              text: 'Logo perusahaan berhasil dihapus',
              timer: 1500,
              showConfirmButton: false
            })
          }
        } catch (error) {
          if (window.Swal) {
            window.Swal.fire({
              icon: 'error',
              title: 'Gagal!',
              text: error.message || 'Terjadi kesalahan saat menghapus logo perusahaan',
              confirmButtonText: 'OK'
            })
          }
        }
      }
    })
  }
}

// ✅ UPLOAD LOGO PERUSAHAAN
const handleCompanyLogoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    if (window.Swal) {
      window.Swal.fire({ icon: 'error', title: 'Gagal Upload!', text: 'File harus berupa gambar', confirmButtonText: 'OK' })
    }
    return
  }

  if (window.Swal) {
    window.Swal.fire({ title: 'Mengupload...', text: 'Logo perusahaan sedang dikompres dan disimpan', allowOutsideClick: false, didOpen: () => { window.Swal.showLoading() } })
  }

  try {
    // Auto-compress image
    const compressedDataUrl = await compressImage(file, 800, 600, 0.8)
    
    // Detect mime type from dataURL
    const mimeMatch = compressedDataUrl.match(/^data:([^;]+);/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
    
    // Convert dataURL ke File untuk upload
    const response = await fetch(compressedDataUrl)
    const blob = await response.blob()
    const compressedFile = new File([blob], file.name, { type: mimeType })
    
    // Upload ke API (akan disimpan sebagai base64 di Supabase)
    const result = await uploadLogo(compressedFile, 'logo perusahaan')
    
    // Update draft untuk preview - logoUrl berisi base64
    draftCompanyLogo.value = result.logoUrl
    draft.value.logoPerusahaanUrl = result.logoUrl
    draft.value.logoPerusahaanDataUrl = result.logoUrl

    if (window.Swal) {
      window.Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Logo perusahaan berhasil diupload dan dikompres otomatis', timer: 1500, showConfirmButton: false })
    }
  } catch (error) {
    console.error('[Config] Company logo upload error:', error)
    if (window.Swal) {
      window.Swal.fire({ icon: 'error', title: 'Gagal Upload!', text: error.message, confirmButtonText: 'OK' })
    }
  }

  event.target.value = ''
}

// ✅ FORMAT TANGGAL
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ✅ CONFIRM AND APPLY DRAFT - Save to API
const confirmAndSave = async () => {
  const doSave = async () => {
    isSavingLocal.value = true

    // Copy all draft values to config
    Object.keys(draft.value).forEach(key => {
      config.value[key] = draft.value[key]
    })

    // Update preview logo if changed
    if (draftLogo.value) {
      previewLogo.value = draftLogo.value
    }

    // Save to Supabase
    await saveConfig()
    
    isSavingLocal.value = false
  }

  if (window.Swal) {
    window.Swal.fire({
      title: 'Simpan perubahan?',
      text: 'Perubahan akan diterapkan dan langsung terlihat oleh semua pengguna.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await doSave()
      } else {
        // Reset draft to current config
        draft.value = { ...config.value }
        draftLogo.value = previewLogo.value
        draftCompanyLogo.value = config.value.logoPerusahaanUrl || config.value.logoPerusahaanDataUrl
      }
    })
  } else {
    await doSave()
  }
}

// ✅ CREATE NEW DATA VERSION
const createNewVersion = async () => {
  if (!newVersionDescription.value.trim()) return

  if (window.Swal) {
    window.Swal.fire({
      title: 'Buat versi data baru?',
      text: `Snapshot data saat ini akan dibuat dengan deskripsi: "${newVersionDescription.value}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, buat versi',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const result = await createVersion(newVersionDescription.value)
          if (result.success) {
            newVersionDescription.value = ''
            await fetchVersions()
            if (window.Swal) {
              window.Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Versi data baru ${result.data.version_name} telah dibuat`,
                timer: 2000,
                showConfirmButton: false
              })
            }
          } else {
            throw new Error(result.error || 'Gagal membuat versi')
          }
        } catch (error) {
          console.error('Create version error:', error)
          if (window.Swal) {
            window.Swal.fire({
              icon: 'error',
              title: 'Gagal!',
              text: error.message || 'Terjadi kesalahan saat membuat versi data',
              confirmButtonText: 'OK'
            })
          }
        }
      }
    })
  }
}

// ✅ HANDLE SWITCH DATABASE
const handleSwitchDatabase = async () => {
  if (window.Swal) {
    window.Swal.fire({
      title: 'Switch Database?',
      html: `
        <p>Anda akan mengubah database dari <strong>${currentDatabaseName.value}</strong> ke <strong>${databaseSwitchForm.value.database_type}</strong></p>
        <p class="text-danger mt-2"><small><i class="fas fa-exclamation-triangle"></i> Pastikan data sudah di-backup sebelum melanjutkan!</small></p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Switch Database',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await switchDatabase({
            database_type: databaseSwitchForm.value.database_type,
            spreadsheet_id: databaseSwitchForm.value.spreadsheet_id || 'DEFAULT_CONFIGURED_ID',
            spreadsheet_url: databaseSwitchForm.value.spreadsheet_url || '',
            updated_by: currentUser.value?.nama || 'admin',
            notes: databaseSwitchForm.value.notes || `Switch to ${databaseSwitchForm.value.database_type}`
          })
        } catch (error) {
          console.error('Switch database error:', error)
        }
      }
    })
  }
}

// ✅ HANDLE TEST CONNECTION
const handleTestConnection = async () => {
  try {
    await testConnection(databaseSwitchForm.value.spreadsheet_id)
  } catch (error) {
    console.error('Test connection error:', error)
  }
}

// ✅ LOAD VERSIONS ON MOUNT
onMounted(async () => {
  await fetchVersions()
  
  // Load database config
  if (isAdmin.value) {
    await loadActiveConfig()
    await loadAllConfigs()
    
    // Populate form dengan config yang aktif
    if (activeConfig.value) {
      databaseSwitchForm.value.database_type = activeConfig.value.database_type || 'supabase'
      databaseSwitchForm.value.spreadsheet_id = activeConfig.value.spreadsheet_id || ''
      databaseSwitchForm.value.spreadsheet_url = activeConfig.value.spreadsheet_url || ''
    }
  }
})

</script>

<style scoped>
.logo-preview {
  width: 180px;
  height: 80px;
  background-color: #f8f9fa;
  border: 2px dashed #ced4da;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0 auto;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.print-preview {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  min-height: 200px;
}

.preview-header {
  border-bottom: 2px solid #0056b3;
  padding-bottom: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.preview-logo {
  margin-bottom: 10px;
}

.preview-company {
  text-align: center;
}

.preview-name {
  margin-bottom: 5px;
}

.preview-address {
  white-space: pre-line;
}

.preview-ref {
  text-align: center;
  width: 100%;
}

.custom-file-label::after {
  content: "Pilih";
}
</style>