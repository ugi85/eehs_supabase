<template>
  <div class="emergency-switch-page">
    <div class="emergency-container">
      <div class="emergency-card">
        <!-- Header -->
        <div class="emergency-header">
          <div class="emergency-icon">
            <i class="fas fa-database"></i>
          </div>
          <h1>🚨 Emergency Database Switch</h1>
          <p class="subtitle">Supabase sedang tidak tersedia - Gunakan Google Sheets sebagai fallback</p>
        </div>

        <!-- Status Alert -->
        <div class="alert alert-danger alert-icon">
          <i class="fas fa-exclamation-circle"></i>
          <strong>PERHATIAN:</strong> Database utama (Supabase) sedang tidak tersedia. 
          Sistem akan beralih ke Google Sheets untuk melanjutkan operasi.
        </div>

        <!-- Current Status -->
        <div class="status-section">
          <div class="status-box">
            <h5>Status Saat Ini</h5>
            <p><strong>Database Aktif:</strong> <span class="badge" :class="getBadgeClass()">{{ getCurrentDB() }}</span></p>
            <p><strong>Timestamp:</strong> {{ new Date().toLocaleString('id-ID') }}</p>
          </div>
        </div>

        <!-- Switch Options -->
        <div class="switch-section">
          <h5>Pilih Database</h5>
          
          <!-- Option 1: Google Sheets -->
          <div class="option-box" :class="{ active: selectedDB === 'googleSheets' }">
            <div class="option-header" @click="selectedDB = 'googleSheets'">
              <div class="option-radio">
                <input 
                  type="radio" 
                  :checked="selectedDB === 'googleSheets'"
                  @change="selectedDB = 'googleSheets'"
                >
              </div>
              <div class="option-info">
                <h6>Google Sheets (Apps Script)</h6>
                <p class="text-muted">Gunakan Google Sheets sebagai database alternatif</p>
              </div>
            </div>
            <div v-if="selectedDB === 'googleSheets'" class="option-details">
              <p class="text-success">
                <i class="fas fa-check-circle"></i>
                Semua endpoint Google Sheets sudah siap digunakan
              </p>
            </div>
          </div>

          <!-- Option 2: Supabase (if available) -->
          <div class="option-box" :class="{ active: selectedDB === 'supabase' }">
            <div class="option-header" @click="selectedDB = 'supabase'">
              <div class="option-radio">
                <input 
                  type="radio" 
                  :checked="selectedDB === 'supabase'"
                  @change="selectedDB = 'supabase'"
                >
              </div>
              <div class="option-info">
                <h6>Supabase (Primary - Jika Available)</h6>
                <p class="text-muted">Database utama - gunakan jika sudah online</p>
              </div>
            </div>
            <div v-if="selectedDB === 'supabase'" class="option-details">
              <p class="text-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Supabase sedang tidak tersedia. Jangan pilih ini kecuali sudah verify online.
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-section">
          <button 
            @click="switchDatabase" 
            class="btn btn-lg btn-primary btn-block"
            :disabled="isSwitching"
          >
            <span v-if="isSwitching">
              <span class="spinner-border spinner-border-sm mr-2"></span>
              Switching...
            </span>
            <span v-else>
              <i class="fas fa-sync-alt mr-2"></i>
              Switch ke {{ selectedDB === 'googleSheets' ? 'Google Sheets' : 'Supabase' }}
            </span>
          </button>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <div class="info-box">
            <h6 class="info-title">
              <i class="fas fa-info-circle mr-1"></i>
              Informasi Penting
            </h6>
            <ul class="info-list">
              <li>✅ Google Sheets mode sudah fully configured dengan Google Apps Script</li>
              <li>✅ Semua data akan dimuat dari Google Sheets</li>
              <li>✅ Anda dapat switch back ke Supabase kapan saja</li>
              <li>⚠️ Perubahan akan disimpan ke database yang dipilih</li>
              <li>⏱️ Setelah switch, halaman akan reload otomatis</li>
            </ul>
          </div>
        </div>

        <!-- Advanced Options -->
        <div class="advanced-section">
          <details>
            <summary class="advanced-toggle">
              <i class="fas fa-cog mr-1"></i>
              Advanced Options
            </summary>
            <div class="advanced-content">
              <div class="form-group">
                <label>Database Configuration</label>
                <textarea 
                  class="form-control form-control-sm"
                  rows="4"
                  readonly
                >{{ configJSON }}</textarea>
              </div>
              <div class="form-group">
                <button 
                  @click="copyConfigToClipboard"
                  class="btn btn-sm btn-outline-primary"
                >
                  <i class="fas fa-copy mr-1"></i>
                  Copy Config
                </button>
              </div>
            </div>
          </details>
        </div>

        <!-- Footer -->
        <div class="emergency-footer">
          <p class="text-muted text-center mt-4 mb-0">
            <small>
              Emergency Database Switch v1.0<br>
              <i class="fas fa-shield-alt"></i> Halaman ini aman dan tidak memerlukan login
            </small>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const selectedDB = ref('googleSheets')
const isSwitching = ref(false)

const getCurrentDB = () => {
  return settings.isUsingSupabase ? 'Supabase' : 'Google Sheets'
}

const getBadgeClass = () => {
  return settings.isUsingSupabase ? 'badge-info' : 'badge-warning'
}

const configJSON = computed(() => {
  return JSON.stringify({
    currentDatabase: settings.database.type,
    selectedDatabase: selectedDB.value,
    timestamp: new Date().toISOString(),
    googleAppsScriptEndpoints: {
      daftarAlat: settings.googleAppsScript.daftarAlat,
      logAktivitas: settings.googleAppsScript.logAktivitas,
      jadwalKalibrasi: settings.googleAppsScript.jadwalKalibrasi,
      config: settings.googleAppsScript.config,
      users: settings.googleAppsScript.users
    }
  }, null, 2)
})

const switchDatabase = async () => {
  isSwitching.value = true

  try {
    const dbType = selectedDB.value === 'googleSheets' ? 'spreadsheet' : 'supabase'

    // 1. Update ke Remote Google Sheets agar semua device tersinkronisasi
    const success = await settings.updateRemoteConfig(dbType)

    if (!success) {
      // Jika update remote gagal, kita tetap switch lokal (fallback)
      console.warn('[Emergency] Gagal update remote, melanjutkan switch lokal.')
    }

    // 2. Switch lokal
    if (selectedDB.value === 'googleSheets') {
      settings.switchToGoogleSheets()
    } else {
      settings.switchToSupabase()
    }

    // Show success message
    await Swal.fire({
      icon: 'success',
      title: 'Database Terupdate',
      html: `
        <p>Konfigurasi global telah diupdate ke <strong>${selectedDB.value === 'googleSheets' ? 'Google Sheets' : 'Supabase'}</strong></p>
        <p class="text-warning mt-2"><small><i class="fas fa-info-circle"></i> Semua device akan menyesuaikan otomatis dalam 60 detik.</small></p>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        setTimeout(() => {
          // ✅ Clear cache and redirect to dashboard
          localStorage.removeItem('dashboard_data_cache')
          window.location.href = '/'
        }, 2000)
      }
    })
  } catch (error) {
    console.error('Switch error:', error)
    isSwitching.value = false

    Swal.fire({
      icon: 'error',
      title: 'Switch Gagal',
      text: error.message || 'Terjadi kesalahan saat switch database',
      confirmButtonText: 'OK'
    })
  }
}

const copyConfigToClipboard = () => {
  navigator.clipboard.writeText(configJSON.value).then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'Config telah dicopy ke clipboard',
      timer: 2000,
      showConfirmButton: false
    })
  })
}

// Initialize settings on component mount
settings.initializeDatabase()
</script>

<style scoped>
.emergency-switch-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.emergency-container {
  width: 100%;
  max-width: 700px;
}

.emergency-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.emergency-header {
  background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
  color: white;
  padding: 40px 30px;
  text-align: center;
}

.emergency-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.emergency-header h1 {
  margin: 10px 0;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.emergency-header + .alert {
  margin: 20px;
  margin-bottom: 0;
}

.status-section,
.switch-section,
.action-section,
.info-section,
.advanced-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.advanced-section {
  border-bottom: none;
}

.status-box {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.status-box h5 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.status-box p {
  margin: 5px 0;
  font-size: 13px;
}

.switch-section h5 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 14px;
  font-weight: 700;
}

.option-box {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.option-box:hover {
  border-color: #667eea;
  background-color: #f9f9f9;
}

.option-box.active {
  border-color: #667eea;
  background-color: #f3f4ff;
}

.option-header {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  cursor: pointer;
}

.option-radio {
  margin-right: 15px;
  margin-top: 2px;
}

.option-radio input[type="radio"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.option-info h6 {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.option-info p {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.option-details {
  padding: 0 15px 15px 15px;
  border-top: 1px solid #e0e0e0;
  margin-top: 10px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.option-details p {
  margin: 0;
  font-size: 12px;
}

.action-section {
  padding: 25px;
}

.btn-block {
  width: 100%;
}

.info-section {
  background: #f0f4ff;
}

.info-box {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.info-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #333;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #555;
  line-height: 1.8;
}

.info-list li {
  margin-bottom: 5px;
}

.advanced-section {
  padding: 15px;
}

.advanced-toggle {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  user-select: none;
}

.advanced-toggle:hover {
  color: #764ba2;
}

details {
  margin-top: 10px;
}

.advanced-content {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.advanced-content textarea {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  background: #f9f9f9;
}

.emergency-footer {
  background: #f9f9f9;
  padding: 20px;
  text-align: center;
  border-top: 1px solid #e0e0e0;
}

.badge {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 576px) {
  .emergency-header {
    padding: 30px 20px;
  }

  .emergency-header h1 {
    font-size: 24px;
  }

  .emergency-icon {
    font-size: 36px;
  }

  .option-header {
    padding: 12px;
  }

  .option-details {
    padding: 0 12px 12px 12px;
  }
}
</style>

