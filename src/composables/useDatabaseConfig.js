// src/composables/useDatabaseConfig.js
// Composable untuk mengelola konfigurasi database

import { ref, computed } from 'vue'
import { 
  getActiveDatabaseConfig, 
  getAllDatabaseConfigs,
  switchDatabaseType,
  updateDatabaseConfig,
  testSpreadsheetConnection
} from '@/api/supabase/databaseConfigApi'

export const useDatabaseConfig = () => {
  const activeConfig = ref(null)
  const allConfigs = ref([])
  const isLoading = ref(false)
  const isSwitching = ref(false)
  const isTesting = ref(false)

  // Computed
  const currentDatabaseType = computed(() => activeConfig.value?.database_type || 'supabase')
  const isUsingSupabase = computed(() => currentDatabaseType.value === 'supabase')
  const isUsingSpreadsheet = computed(() => currentDatabaseType.value === 'spreadsheet')
  const spreadsheetInfo = computed(() => {
    if (!activeConfig.value) return null
    return {
      id: activeConfig.value.spreadsheet_id,
      url: activeConfig.value.spreadsheet_url
    }
  })

  /**
   * Load konfigurasi database yang aktif
   */
  const loadActiveConfig = async () => {
    try {
      isLoading.value = true
      const config = await getActiveDatabaseConfig()
      activeConfig.value = config
      
      // Store to localStorage for quick access
      if (config) {
        localStorage.setItem('active_database_config', JSON.stringify(config))
      }
      
      console.log('[useDatabaseConfig] loadActiveConfig - Success:', config)
      return config
    } catch (error) {
      console.error('[useDatabaseConfig] loadActiveConfig - Error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load semua konfigurasi database (history)
   */
  const loadAllConfigs = async () => {
    try {
      isLoading.value = true
      const configs = await getAllDatabaseConfigs()
      allConfigs.value = configs
      console.log('[useDatabaseConfig] loadAllConfigs - Success:', configs.length, 'configs')
      return configs
    } catch (error) {
      console.error('[useDatabaseConfig] loadAllConfigs - Error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Switch database type
   * @param {Object} config - { database_type, spreadsheet_id, spreadsheet_url, updated_by, notes }
   */
  const switchDatabase = async (config) => {
    try {
      isSwitching.value = true
      console.log('[useDatabaseConfig] switchDatabase - Config:', config)

      const newConfig = await switchDatabaseType(config)
      activeConfig.value = newConfig
      localStorage.setItem('active_database_config', JSON.stringify(newConfig))
      
        const { useSettingsStore } = await import('@/stores/settings')
      if (config.database_type === 'spreadsheet') {
        useSettingsStore().switchToGoogleSheets()
      } else {
        useSettingsStore().switchToSupabase()
      }

      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: 'Switch Database Berhasil',
          text: `Database telah diubah ke ${config.database_type}`,
          timer: 2000,
          showConfirmButton: false
        })
      }
      
      setTimeout(() => window.location.reload(), 1000)
      return newConfig
    } catch (error) {
      console.error('[useDatabaseConfig] switchDatabase - Error (Supabase down):', error)
      
      // Failover jika Supabase down saat mencoba update config
      if (config.database_type === 'spreadsheet') {
        console.warn('[useDatabaseConfig] Supabase down, memaksa switch ke Spreadsheet secara lokal.')
        const { useSettingsStore } = await import('@/stores/settings')
        useSettingsStore().switchToGoogleSheets()
        Swal.fire({
          icon: 'success',
          title: 'Switch Database (Local Mode)',
          text: 'Konfigurasi server gagal disimpan (Supabase Down), tapi sistem telah beralih ke Spreadsheet.',
          timer: 3000
        })

        setTimeout(() => window.location.reload(), 1000)
        return { database_type: 'spreadsheet' }
      }
      
        Swal.fire({
        icon: 'error',
        title: 'Switch Database Gagal',
        text: 'Tidak dapat terhubung ke server database.',
          confirmButtonText: 'OK'
        })
      throw error
    } finally {
      isSwitching.value = false
    }
  }

  /**
   * Update konfigurasi yang ada
   */
  const updateConfig = async (id, updates) => {
    try {
      isSwitching.value = true
      const updated = await updateDatabaseConfig(id, updates)
      
      // Update activeConfig jika yang diupdate adalah config aktif
      if (updated.is_active) {
        activeConfig.value = updated
        localStorage.setItem('active_database_config', JSON.stringify(updated))
      }
      
      console.log('[useDatabaseConfig] updateConfig - Success:', updated)
      return updated
    } catch (error) {
      console.error('[useDatabaseConfig] updateConfig - Error:', error)
      throw error
    } finally {
      isSwitching.value = false
    }
  }

  /**
   * Test koneksi spreadsheet
   */
  const testConnection = async (spreadsheetId) => {
    try {
      isTesting.value = true
      console.log('[useDatabaseConfig] testConnection - Testing:', spreadsheetId)
      
      const result = await testSpreadsheetConnection(spreadsheetId)
      
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Test Koneksi Berhasil',
          text: result.message || 'Koneksi ke spreadsheet berhasil',
          timer: 2000,
          showConfirmButton: false
        })
      }
      
      return result
    } catch (error) {
      console.error('[useDatabaseConfig] testConnection - Error:', error)
      
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Test Koneksi Gagal',
          text: error.message || 'Tidak dapat terhubung ke spreadsheet',
          confirmButtonText: 'OK'
        })
      }
      
      throw error
    } finally {
      isTesting.value = false
    }
  }

  /**
   * Get config dari localStorage (quick access tanpa API call)
   */
  const getConfigFromCache = () => {
    const cached = localStorage.getItem('active_database_config')
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch (e) {
        console.error('[useDatabaseConfig] getConfigFromCache - Parse error:', e)
        return null
      }
    }
    return null
  }

  return {
    // State
    activeConfig,
    allConfigs,
    isLoading,
    isSwitching,
    isTesting,
    
    // Computed
    currentDatabaseType,
    isUsingSupabase,
    isUsingSpreadsheet,
    spreadsheetInfo,
    
    // Methods
    loadActiveConfig,
    loadAllConfigs,
    switchDatabase,
    updateConfig,
    testConnection,
    getConfigFromCache
  }
}

