// src/stores/settings.js
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Database configuration
    database: {
      type: 'supabase', // 'supabase' | 'googleSheets'
      activeSource: 'supabase' // Track which source is active
    },

    // Google Apps Script APIs (untuk Google Sheets)
    googleAppsScript: {
      daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec',
      logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec',
      jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJAs0qol4wwPImj27ds1tubFTDbzb49YngyPhbBi2J12S6/exec',
      config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46XVY4f877kZ_2hcM8pnrjzNmU_I8bvyu1AQifqGzolpl/exec',
      users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-terRT6ICi9l8vz2IHgTGXGyFx4-frUmdPy-lz-vE0Y/exec'
    },

    // Alias untuk backward compatibility
    api: {
      daftarAlat: null,
      logAktivitas: null,
      jadwalKalibrasi: null,
      config: null,
      users: null
    }
  }),

  getters: {
    /**
     * Get API endpoint berdasarkan database type yang aktif
     */
    getApiEndpoint: (state) => (module) => {
      if (state.database.type === 'googleSheets') {
        return state.googleAppsScript[module]
      }
      // Return null untuk Supabase (akan dihandle oleh daftarAlatApi di folder supabase/)
      return null
    },

    /**
     * Check apakah menggunakan Google Sheets
     */
    isUsingGoogleSheets: (state) => state.database.type === 'googleSheets',

    /**
     * Check apakah menggunakan Supabase
     */
    isUsingSupabase: (state) => state.database.type === 'supabase'
  },

  actions: {
    /**
     * Check remote config via Google Sheets API untuk sinkronisasi antar device
     */
    async checkRemoteConfig() {
      try {
        if (!this.googleAppsScript.config) return

        const response = await fetch(this.googleAppsScript.config + "?action=getConfig")
        const result = await response.json()
        const remoteConfig = result.data?.data || {}

        if (remoteConfig && remoteConfig.database_type) {
          const remoteType = remoteConfig.database_type === 'spreadsheet' ? 'googleSheets' : 'supabase'

          if (remoteType !== this.database.type) {
            console.log('[Realtime] Sinkronisasi: Pindah ke', remoteType)
            if (remoteType === 'googleSheets') {
            this.switchToGoogleSheets()
          } else {
        this.switchToSupabase()
      }
          window.location.reload()
    }
  }
      } catch (e) {
        console.warn('[Realtime] Gagal cek config remote, kemungkinan koneksi ke Sheets terganggu.')
      }
    },

    /**
     * Update remote config di Google Sheets
     */
    async updateRemoteConfig(newDatabaseType) {
        try {
        if (!this.googleAppsScript.config) return

        const response = await fetch(this.googleAppsScript.config, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'setConfig',
            data: {
              'database_type': newDatabaseType === 'spreadsheet' ? 'spreadsheet' : 'supabase'
            }
          })
        })

        const result = await response.json()
        console.log('[Remote] Config updated:', result)
        return result.success
      } catch (e) {
        console.error('[Remote] Gagal mengupdate config:', e)
        return false
      }
    },

    /**
     * Switch to Google Sheets (menggunakan Google Apps Script)
     */
    switchToGoogleSheets() {
      console.warn('[Settings] EMERGENCY SWITCH: Beralih ke Google Sheets')
      // Update API endpoints
            this.api.daftarAlat = this.googleAppsScript.daftarAlat
            this.api.logAktivitas = this.googleAppsScript.logAktivitas
            this.api.jadwalKalibrasi = this.googleAppsScript.jadwalKalibrasi
            this.api.config = this.googleAppsScript.config
            this.api.users = this.googleAppsScript.users

      this.database.type = 'googleSheets'
      this.database.activeSource = 'googleSheets'

      // Save to localStorage
      localStorage.setItem('database_config', JSON.stringify(this.database))

      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'warning',
          title: 'Mode Darurat Aktif',
          text: 'Koneksi ke Supabase terganggu. Sistem otomatis beralih ke Google Sheets.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000
        })
          }
      return true
    },

    /**
     * Switch to Supabase
     */
    switchToSupabase() {
      console.log('[Settings] Switching to Supabase')
      this.database.type = 'supabase'
      this.database.activeSource = 'supabase'

      // Clear API endpoints for Supabase (will use direct imports from supabase/ folder)
      this.api.daftarAlat = null
      this.api.logAktivitas = null
      this.api.jadwalKalibrasi = null
      this.api.config = null
      this.api.users = null

      // Save to localStorage
      localStorage.setItem('database_config', JSON.stringify(this.database))

      return true
    },

    /**
     * Initialize database config dari localStorage
     */
    initializeDatabase() {
      const savedConfig = localStorage.getItem('database_config')

      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig)
          this.database = config

          // Restore API endpoints jika menggunakan Google Sheets
          if (config.type === 'googleSheets') {
            this.api.daftarAlat = this.googleAppsScript.daftarAlat
            this.api.logAktivitas = this.googleAppsScript.logAktivitas
            this.api.jadwalKalibrasi = this.googleAppsScript.jadwalKalibrasi
            this.api.config = this.googleAppsScript.config
            this.api.users = this.googleAppsScript.users
        }

          console.log('[Settings] Database config restored:', config)
        } catch (error) {
          console.error('[Settings] Error parsing database config:', error)
          this.switchToSupabase() // Default to Supabase on error
      }
      } else {
        // Default to Supabase
        this.switchToSupabase()
    }
  }
  }
})

