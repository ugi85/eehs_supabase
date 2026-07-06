<template>
  <div class="setup-container">
    <div class="setup-box">
      <div class="card card-primary">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fas fa-table mr-2"></i>Setup Google Sheets Database
          </h3>
        </div>
        <div class="card-body">
          <!-- Step 1: Informasi -->
          <div v-if="currentStep === 1" class="setup-step">
            <h5 class="mb-3">Step 1: Persiapan</h5>
            <div class="alert alert-info">
              <p><strong>Anda akan menggunakan Google Sheets sebagai database.</strong></p>
              <p class="mb-0">Pastikan Anda telah:</p>
            </div>
            <ol class="mb-4">
              <li>Membuat Google Sheets baru atau sudah punya yang siap</li>
              <li>Share spreadsheet dengan email yang tepat</li>
              <li>Siap copy Spreadsheet ID dari URL</li>
            </ol>

            <div class="alert alert-warning">
              <p class="mb-0">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                <strong>Cara mendapatkan Spreadsheet ID:</strong>
              </p>
              <p class="text-muted mt-2 mb-0">
                Buka spreadsheet Anda, ID ada di URL:<br>
                <code>https://docs.google.com/spreadsheets/d/<strong>[ SPREADSHEET ID ]</strong>/edit</code>
              </p>
            </div>

            <button @click="nextStep" class="btn btn-primary">
              <i class="fas fa-arrow-right mr-1"></i>Lanjut
            </button>
          </div>

          <!-- Step 2: Input Spreadsheet ID -->
          <div v-if="currentStep === 2" class="setup-step">
            <h5 class="mb-3">Step 2: Masukkan Spreadsheet ID</h5>
            
            <div class="form-group">
              <label>Spreadsheet ID *</label>
              <input
                v-model="spreadsheetId"
                type="text"
                class="form-control"
                placeholder="1A2B3C4D5E6F7G8H9I0J"
                @keyup.enter="testSheet"
              />
              <small class="form-text text-muted">
                Copy dari URL spreadsheet Anda
              </small>
            </div>

            <div class="form-group">
              <label>URL Spreadsheet (Optional)</label>
              <input
                v-model="spreadsheetUrl"
                type="url"
                class="form-control"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <small class="form-text text-muted">
                Untuk referensi, akan di-generate otomatis jika kosong
              </small>
            </div>

            <div class="d-flex justify-content-between">
              <button @click="prevStep" class="btn btn-secondary">
                <i class="fas fa-arrow-left mr-1"></i>Kembali
              </button>
              <button
                @click="testSheet"
                class="btn btn-primary"
                :disabled="isTesting || !spreadsheetId"
              >
                <span v-if="isTesting">
                  <span class="spinner-border spinner-border-sm mr-1"></span>
                  Testing...
                </span>
                <span v-else>
                  <i class="fas fa-check-circle mr-1"></i>Test Koneksi
                </span>
              </button>
            </div>
          </div>

          <!-- Step 3: Test Result -->
          <div v-if="currentStep === 3" class="setup-step">
            <h5 class="mb-3">Step 3: Verifikasi Koneksi</h5>

            <div v-if="testResult" :class="['alert', testResult.success ? 'alert-success' : 'alert-danger']">
              <p class="mb-0">
                <i :class="['fas mr-2', testResult.success ? 'fa-check-circle' : 'fa-times-circle']"></i>
                <strong>{{ testResult.message }}</strong>
              </p>
              <p v-if="testResult.rowCount" class="text-muted mt-2 mb-0">
                Data ditemukan: {{ testResult.rowCount }} baris
              </p>
            </div>

            <div class="d-flex justify-content-between">
              <button @click="prevStep" class="btn btn-secondary" :disabled="isTesting">
                <i class="fas fa-arrow-left mr-1"></i>Kembali
              </button>
              <button
                v-if="testResult && testResult.success"
                @click="saveConfiguration"
                class="btn btn-success"
                :disabled="isSaving"
              >
                <span v-if="isSaving">
                  <span class="spinner-border spinner-border-sm mr-1"></span>
                  Saving...
                </span>
                <span v-else>
                  <i class="fas fa-save mr-1"></i>Simpan & Lanjut
                </span>
              </button>
              <button
                v-else
                @click="currentStep = 2"
                class="btn btn-warning"
              >
                <i class="fas fa-edit mr-1"></i>Edit ID
              </button>
            </div>
          </div>

          <!-- Step 4: Success -->
          <div v-if="currentStep === 4" class="setup-step">
            <h5 class="mb-3">Step 4: Sukses!</h5>

            <div class="alert alert-success">
              <h5 class="mb-2">
                <i class="fas fa-check-circle mr-2"></i>
                Google Sheets Berhasil Dikonfigurasi!
              </h5>
              <p class="mb-0">Database Anda sekarang menggunakan Google Sheets.</p>
            </div>

            <div class="card card-info mt-3 mb-3">
              <div class="card-body">
                <p><strong>Spreadsheet ID:</strong> <code>{{ spreadsheetId }}</code></p>
                <p v-if="spreadsheetUrl" class="mb-0">
                  <strong>URL:</strong>
                  <a :href="spreadsheetUrl" target="_blank" class="text-primary">
                    <i class="fas fa-external-link-alt mr-1"></i>Buka Spreadsheet
                  </a>
                </p>
              </div>
            </div>

            <div class="alert alert-info">
              <p class="mb-2"><strong>Langkah berikutnya:</strong></p>
              <ul class="mb-0">
                <li>Refresh browser untuk muat ulang aplikasi</li>
                <li>Dashboard akan menampilkan data dari Google Sheets</li>
                <li>Anda dapat switch kembali ke Supabase kapan saja di Settings</li>
              </ul>
            </div>

            <button
              @click="finishSetup"
              class="btn btn-primary btn-block"
            >
              <i class="fas fa-check mr-1"></i>Selesai & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { testGoogleSheetsConnection } from '@/api/googleSheets/sheetsDatasource'

const currentStep = ref(1)
const spreadsheetId = ref('')
const spreadsheetUrl = ref('')
const isTesting = ref(false)
const isSaving = ref(false)
const testResult = ref(null)

const nextStep = () => {
  currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const testSheet = async () => {
  if (!spreadsheetId.value.trim()) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Spreadsheet ID harus diisi',
      confirmButtonText: 'OK'
    })
    return
  }

  isTesting.value = true
  testResult.value = null

  try {
    const result = await testGoogleSheetsConnection(spreadsheetId.value)
    testResult.value = result

    if (result.success) {
      currentStep.value = 3
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Test Gagal',
        text: result.message,
        confirmButtonText: 'OK'
      })
    }
  } catch (error) {
    console.error('Test error:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Terjadi kesalahan saat test koneksi',
      confirmButtonText: 'OK'
    })
  } finally {
    isTesting.value = false
  }
}

const saveConfiguration = async () => {
  isSaving.value = true

  try {
    // Auto-generate URL jika kosong
    if (!spreadsheetUrl.value) {
      spreadsheetUrl.value = `https://docs.google.com/spreadsheets/d/${spreadsheetId.value}/edit`
    }

    // Simpan ke localStorage
    const config = {
      database_type: 'spreadsheet',
      spreadsheet_id: spreadsheetId.value,
      spreadsheet_url: spreadsheetUrl.value,
      is_active: true,
      updated_at: new Date().toISOString(),
      updated_by: 'setup_wizard',
      notes: 'Configured via setup wizard'
    }

    localStorage.setItem('active_database_config', JSON.stringify(config))

    console.log('[GoogleSheetsSetup] Configuration saved:', config)

    currentStep.value = 4
  } catch (error) {
    console.error('Save error:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Gagal menyimpan konfigurasi',
      confirmButtonText: 'OK'
    })
  } finally {
    isSaving.value = false
  }
}

const finishSetup = () => {
  Swal.fire({
    icon: 'success',
    title: 'Setup Selesai!',
    text: 'Halaman akan dimuat ulang untuk menerapkan perubahan',
    timer: 2000,
    showConfirmButton: false
  }).then(() => {
    window.location.reload()
  })
}
</script>

<style scoped>
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.setup-box {
  width: 100%;
  max-width: 600px;
}

.setup-step {
  min-height: 300px;
}

code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  color: #d63384;
  font-size: 0.9em;
}

ol {
  padding-left: 20px;
}

li {
  margin-bottom: 10px;
}
</style>
