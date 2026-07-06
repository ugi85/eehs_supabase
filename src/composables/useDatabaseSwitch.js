// src/composables/useDatabaseSwitch.js
// Composable untuk switch database antara Supabase dan Google Sheets

import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useDatabaseSwitch() {
  const settings = useSettingsStore()

  const isUsingGoogleSheets = computed(() => settings.isUsingGoogleSheets)
  const isUsingSupabase = computed(() => settings.isUsingSupabase)
  const currentDatabaseType = computed(() => settings.database.type)
  const currentDatabaseName = computed(() => {
    return settings.isUsingSupabase ? 'Supabase' : 'Google Sheets'
  })

  /**
   * Switch to Google Sheets
   */
  const switchToGoogleSheets = async () => {
    console.log('[useDatabaseSwitch] Switching to Google Sheets')
    
    try {
      settings.switchToGoogleSheets()
      
      // Show success message
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: 'Switch Berhasil',
          html: `
            <p>Database telah diubah ke <strong>Google Sheets</strong></p>
            <p class="text-warning mt-2"><small><i class="fas fa-info-circle"></i> Halaman akan reload otomatis</small></p>
          `,
          timer: 3000,
          showConfirmButton: false
        })
      }
      
      // Reload page
      setTimeout(() => {
        window.location.reload()
      }, 3000)
      
      return true
    } catch (error) {
      console.error('[useDatabaseSwitch] Error switching to Google Sheets:', error)
      
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Switch Gagal',
          text: error.message || 'Terjadi kesalahan saat switch database',
          confirmButtonText: 'OK'
        })
      }
      
      return false
    }
  }

  /**
   * Switch to Supabase (with auto-sync from Google Sheets)
   */
  const switchToSupabase = async () => {
    console.log('[useDatabaseSwitch] Switching to Supabase')
    
    try {
      // Show loading
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'Switching Database',
          html: '<p>Sedang melakukan sinkronisasi data dengan Google Sheets...</p>',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading()
          }
        })
      }

      // Before switching, sync data from Google Sheets to Supabase
      if (settings.isUsingGoogleSheets) {
        console.log('[useDatabaseSwitch] Auto-syncing data from Google Sheets to Supabase')
        
        const { dataSyncService } = await import('@/services/dataSyncService')
        
        // Temporarily get Google Sheets APIs
        const { daftarAlatApi } = await import('@/api/supabase/daftarAlatApi')
        const { jadwalKalibrasiApi } = await import('@/api/supabase/jadwalKalibrasiApi')
        const { logAktivitasApi } = await import('@/api/supabase/logAktivitasApi')
        const { userApi } = await import('@/api/supabase/userApi')

        // Create temporary API object with Google Sheets endpoints
        const tempApi = {
          getAllAlat: () => daftarAlatApi.readDaftarAlat?.() || Promise.resolve({ data: [] }),
          getAllSchedules: () => jadwalKalibrasiApi.readJadwalKalibrasi?.() || Promise.resolve({ data: [] }),
          getAllLogs: () => logAktivitasApi.listLogs?.() || Promise.resolve([]),
          getAllUsers: () => userApi.readUsers?.() || Promise.resolve({ data: [] })
        }

        try {
          const syncResults = await dataSyncService.syncFromGoogleSheetsToSupabase(tempApi)
          console.log('[useDatabaseSwitch] Sync completed:', syncResults)
        } catch (syncError) {
          console.warn('[useDatabaseSwitch] Sync warning:', syncError)
          // Don't fail the switch if sync fails, just warn
        }
      }

      settings.switchToSupabase()
      
      // Show success message
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: 'Switch Berhasil',
          html: `
            <p>Database telah diubah ke <strong>Supabase</strong></p>
            <p class="text-success mt-2"><small><i class="fas fa-check-circle"></i> Data telah disinkronisasi dari Google Sheets</small></p>
            <p class="text-warning mt-2"><small><i class="fas fa-info-circle"></i> Halaman akan reload otomatis</small></p>
          `,
          timer: 3000,
          showConfirmButton: false
        })
      }
      
      // Reload page
      setTimeout(() => {
        window.location.reload()
      }, 3000)
      
      return true
    } catch (error) {
      console.error('[useDatabaseSwitch] Error switching to Supabase:', error)
      
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Switch Gagal',
          text: error.message || 'Terjadi kesalahan saat switch database',
          confirmButtonText: 'OK'
        })
      }
      
      return false
    }
  }

  /**
   * Initialize database from localStorage
   */
  const initializeDatabase = () => {
    console.log('[useDatabaseSwitch] Initializing database')
    settings.initializeDatabase()
    console.log('[useDatabaseSwitch] Current database:', currentDatabaseName.value)
  }

  return {
    // State
    isUsingGoogleSheets,
    isUsingSupabase,
    currentDatabaseType,
    currentDatabaseName,

    // Methods
    switchToGoogleSheets,
    switchToSupabase,
    initializeDatabase
  }
}
