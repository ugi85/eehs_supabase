// src/stores/settings.js
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Google Sheets API URLs - DEPRECATED (replaced by Supabase)
    // Kept for reference only
    _deprecated_api: {
      daftarAlat: 'https://script.google.com/macros/s/AKfycbw0-LDvMGAerOwMPt7Bp1297AetmBNQPcVk7g2qsqe3qnhNJIZr1hFupWLxeGStK9w/exec',
      logAktivitas: 'https://script.google.com/macros/s/AKfycbzGKIeA9r9MQIDNWYP4QlSI_FnossL-hacN_FdtL3eeuni3PpxqdbFojnwa9PWK_usv/exec',
      jadwalKalibrasi: 'https://script.google.com/macros/s/AKfycbyZF-nEyTtyPB0PIc4yrRKJAs0qol4wwPImj27ds1tubFTDbzb49YngyPhbBi2J12S6/exec',
      config: 'https://script.google.com/macros/s/AKfycbyrPyT0Spl3nNUORdGCjyK46XVY4f877kZ_2hcM8pnrjzNmU_I8bvyu1AQifqGzolpl/exec',
      users: 'https://script.google.com/macros/s/AKfycbwvM73cy-gq3xcImArjLop_-terRT6ICi9l8vz2IHgTGXGyFx4-frUmdPy-lz-vE0Y/exec'
    }
  })
})