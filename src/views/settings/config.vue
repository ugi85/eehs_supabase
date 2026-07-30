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
                      <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="form-inline">
                          <label class="mr-2 mb-0">Tampil</label>
                          <select
                            class="form-control form-control-sm"
                            v-model.number="versionPageSize"
                            @change="changeVersionPageSize(versionPageSize)"
                          >
                            <option v-for="size in [5, 10, 20, 50]" :key="size" :value="size">
                              {{ size }}
                            </option>
                          </select>
                          <span class="ml-3 text-muted">Total {{ totalVersions }} versi</span>
                        </div>
                        <div class="btn-group btn-group-sm" role="group" aria-label="Pagination">
                          <button
                            type="button"
                            class="btn btn-secondary"
                            :disabled="versionPage === 1"
                            @click="goToVersionPage(versionPage - 1)"
                          >
                            Sebelumnya
                          </button>
                          <button
                            type="button"
                            class="btn btn-light disabled"
                          >
                            Halaman {{ versionPage }} / {{ totalPages }}
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary"
                            :disabled="versionPage === totalPages"
                            @click="goToVersionPage(versionPage + 1)"
                          >
                            Berikutnya
                          </button>
                        </div>
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
                <!-- <div class="form-group">
                  <label>Alamat Baris 1</label>
                  <input 
                    v-model="draft.addressLine1" 
                    type="text" 
                    class="form-control" 
                    placeholder="Jl. Raya Industri No. 123"
                  />
                </div>
                <div class="form-group">
                  <label>Alamat Baris 2</label>
                  <input 
                    v-model="draft.addressLine2" 
                    type="text" 
                    class="form-control" 
                    placeholder="Kawasan Industri MM2100"
                  />
                </div>
                <div class="form-row">
                  <div class="form-group col-md-6">
                    <label>Kota</label>
                    <input 
                      v-model="draft.city" 
                      type="text" 
                      class="form-control" 
                      placeholder="Cikarang Barat"
                    />
                  </div>
                  <div class="form-group col-md-6">
                    <label>Kode Pos</label>
                    <input 
                      v-model="draft.postalCode" 
                      type="text" 
                      class="form-control" 
                      placeholder="17520"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-md-6">
                    <label>Provinsi</label>
                    <input 
                      v-model="draft.province" 
                      type="text" 
                      class="form-control" 
                      placeholder="Bekasi"
                    />
                  </div>
                  <div class="form-group col-md-6">
                    <label>Negara</label>
                    <input 
                      v-model="draft.country" 
                      type="text" 
                      class="form-control" 
                      placeholder="Indonesia"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group col-md-6">
                    <label>Telepon</label>
                    <input 
                      v-model="draft.phone" 
                      type="text" 
                      class="form-control" 
                      placeholder="(021) 897-1234"
                    />
                  </div>
                  <div class="form-group col-md-6">
                    <label>Email</label>
                    <input 
                      v-model="draft.email" 
                      type="email" 
                      class="form-control" 
                      placeholder="info@agis.co.id"
                    />
                  </div>
                </div> -->
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

            <!-- Preview Print Header -->
            <!-- <div class="card card-success mt-4">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-eye mr-2"></i>Preview Header Print</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div
                  class="print-preview"
                  :style="{
                    fontFamily: draft.print.fontFamily,
                    padding: draft.print.margin,
                    overflow: 'auto',
                    maxHeight: '400px',
                    boxSizing: 'border-box'
                  }"
                >
                  <div class="preview-header-new" :style="{ height: draft.print.headerHeight }">
                    <div class="preview-company-name" :style="{ 
                      textAlign: 'center', 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }">
                      {{ draft.companyName }}
                    </div>
                    
                    <div class="preview-doc-info" style="display: flex; justify-content: space-between; margin-bottom: '5px'">
                      <div class="preview-doc-title" :style="{ 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        flex: '1'
                      }">
                        Judul Dokumen : Daftar Peralatan dan Jadwal Perawatannya
                      </div>
                      <div class="preview-doc-number" :style="{ 
                        fontSize: '14px',
                        textAlign: 'right'
                      }">
                        Nomor Dokumen : {{ draft.documentRefEquipment }}
                      </div>
                    </div>
                    
                    <div class="preview-table-header" :style="{ 
                      fontSize: '10px',
                      borderTop: '1px solid #000',
                      borderBottom: '1px solid #000',
                      padding: '3px 0'
                    }">
                      <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                          <tr>
                            <th style="border: 1px solid #000; padding: 2px;">No.</th>
                            <th style="border: 1px solid #000; padding: 2px;">No. ID</th>
                            <th style="border: 1px solid #000; padding: 2px;">Description</th>
                            <th style="border: 1px solid #000; padding: 2px;">Type/Model</th>
                            <th style="border: 1px solid #000; padding: 2px;">SN</th>
                            <th style="border: 1px solid #000; padding: 2px;">Year</th>
                            <th style="border: 1px solid #000; padding: 2px;">Criticality (Y/N)</th>
                            <th style="border: 1px solid #000; padding: 2px;" colspan="4">PM</th>
                            <th style="border: 1px solid #000; padding: 2px;" colspan="3">Calibration</th>
                            <th style="border: 1px solid #000; padding: 2px;">PIC</th>
                            <th style="border: 1px solid #000; padding: 2px;">Dikerjakan tgl:</th>
                            <th style="border: 1px solid #000; padding: 2px;">Keterangan</th>
                          </tr>
                          <tr>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;">Product</th>
                            <th style="border: 1px solid #000; padding: 2px;">Process</th>
                            <th style="border: 1px solid #000; padding: 2px;">Safety</th>
                            <th style="border: 1px solid #000; padding: 2px;">Enviroment</th>
                            <th style="border: 1px solid #000; padding: 2px;">Y/N</th>
                            <th style="border: 1px solid #000; padding: 2px;">6 Monthly</th>
                            <th style="border: 1px solid #000; padding: 2px;">Yearly</th>
                            <th style="border: 1px solid #000; padding: 2px;">6/12</th>
                            <th style="border: 1px solid #000; padding: 2px;">Y/N</th>
                            <th style="border: 1px solid #000; padding: 2px;">Schedule</th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                            <th style="border: 1px solid #000; padding: 2px;"></th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                  </div>
                </div>
                <small class="form-text text-muted mt-3">
                  Preview ini menunjukkan bagaimana header akan tampil saat dicetak
                </small>
              </div>
            </div> -->

             <!-- <div class="card card-warning mt-4">
              <div class="card-header">
                <h3 class="card-title"><i class="fas fa-print mr-2"></i>Pengaturan Print</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label>Orientasi Kertas</label>
                  <select v-model="config.print.orientation" class="form-control">
                    <option value="portrait">Portrait (Tegak)</option>
                    <option value="landscape">Landscape (Mendatar)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Margin Kertas</label>
                  <select v-model="config.print.margin" class="form-control">
                    <option value="5mm">5mm (Sempit)</option>
                    <option value="10mm" selected>10mm (Normal)</option>
                    <option value="15mm">15mm (Lebar)</option>
                    <option value="20mm">20mm (Sangat Lebar)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Tinggi Header</label>
                  <select v-model="config.print.headerHeight" class="form-control">
                    <option value="20mm">20mm (Kecil)</option>
                    <option value="25mm">25mm (Sedang)</option>
                    <option value="30mm" selected>30mm (Besar)</option>
                    <option value="35mm">35mm (Sangat Besar)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Font untuk Print</label>
                  <select v-model="config.print.fontFamily" class="form-control">
                    <option value="'Arial', sans-serif">Arial (Default)</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Calibri', sans-serif">Calibri</option>
                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                  </select>
                </div>
                <div class="form-group">
                  <div class="form-check">
                    <input 
                      v-model="config.print.showLogo" 
                      class="form-check-input" 
                      type="checkbox" 
                      id="showLogo"
                    >
                    <label class="form-check-label" for="showLogo">
                      Tampilkan Logo di Header
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <div class="form-check">
                    <input 
                      v-model="config.print.showAddress" 
                      class="form-check-input" 
                      type="checkbox" 
                      id="showAddress"
                    >
                    <label class="form-check-label" for="showAddress">
                      Tampilkan Alamat di Header
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <div class="form-check">
                    <input 
                      v-model="config.print.showDocumentRef" 
                      class="form-check-input" 
                      type="checkbox" 
                      id="showDocumentRef"
                    >
                    <label class="form-check-label" for="showDocumentRef">
                      Tampilkan Nomor Referensi Dokumen
                    </label>
                  </div>
                </div>
              </div>
            </div> -->
            
          
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFrontendConfig } from '@/composables/useConfig'
import { useVersioning } from '@/composables/useVersioning'

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
  totalVersions,
  versionPage,
  versionPageSize,
  totalPages,
  fetchVersions,
  createVersion
} = useVersioning()

// local draft object used by the form; changes here are not reflected globally
const draft = ref({ ...config.value })
const draftLogo = ref(previewLogo.value)
const draftCompanyLogo = ref(null) // For company logo preview
const isSavingLocal = ref(false) // Flag untuk mencegah watch trigger saat save
const isUploading = ref(false)

// Versioning
const newVersionDescription = ref('')

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

// Pagination helpers for version history
const goToVersionPage = async (page) => {
  if (page < 1 || page > totalPages.value || page === versionPage.value) return
  await fetchVersions({ page, pageSize: versionPageSize.value })
}

const changeVersionPageSize = async (size) => {
  if (size === versionPageSize.value) return
  await fetchVersions({ page: 1, pageSize: size })
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
            await fetchVersions({ page: 1, pageSize: versionPageSize.value })
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

// ✅ LOAD VERSIONS ON MOUNT
import { onMounted } from 'vue'
onMounted(async () => {
  await fetchVersions()
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