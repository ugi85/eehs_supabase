// src/stores/settings.js
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Database configuration
    database: {
      type: 'googleSheets', // Default ke googleSheets
      activeSource: 'googleSheets'
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
      daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec',
      logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec',
      jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJAs0qol4wwPImj27ds1tubFTDbzb49YngyPhbBi2J12S6/exec',
      config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46XVY4f877kZ_2hcM8pnrjzNmU_I8bvyu1AQifqGzolpl/exec',
      users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-terRT6ICi9l8vz2IHgTGXGyFx4-frUmdPy-lz-vE0Y/exec'
    }
  }),

  getters: {
    /**
     * Get API endpoint berdasarkan database type yang aktif
     */
    getApiEndpoint: (state) => (module) => state.googleAppsScript[module],
    /**
     * Check apakah menggunakan Google Sheets
     */
    isUsingGoogleSheets: () => true,
    /**
     * Check apakah menggunakan Supabase
     */
    isUsingSupabase: () => false
  },

  actions: {
    /**
     * Check remote config via Google Sheets API untuk sinkronisasi antar device
     */
    async checkRemoteConfig() { /* no-op */ },
    /**
     * Update remote config di Google Sheets
     */
    async updateRemoteConfig() { return true },
    /**
     * Switch to Google Sheets (menggunakan Google Apps Script)
     */
    switchToGoogleSheets() {
      this.database.type = 'googleSheets'
      this.database.activeSource = 'googleSheets'
    },

    /**
     * Switch to Supabase
     */
    switchToSupabase() {
      console.warn('Supabase is no longer supported.')
    },

    /**
     * Initialize database config dari localStorage
     */
    initializeDatabase() {
      this.database.type = 'googleSheets'
    }
  }
})

