// src/services/dataLoader.js
// Universal Data Loader Service - Main entry point untuk semua data fetching

import { useDatabaseSource } from '@/composables/useDatabaseSource'
import { daftarAlatApi } from '@/api/supabase/daftarAlatApi'
import { jadwalKalibrasiApi } from '@/api/supabase/jadwalKalibrasiApi'
import { userApi } from '@/api/supabase/userApi'
import { logAktivitasApi } from '@/api/supabase/logAktivitasApi'

/**
 * DataLoader Service
 * Provides unified interface untuk fetch data dari Supabase atau Google Sheets
 */
class DataLoader {
  constructor() {
    this.cache = new Map()
    this.cacheTTL = 5 * 60 * 1000 // 5 menit default
  }

  /**
   * Load Daftar Alat (Equipment List)
   */
  async loadDaftarAlat(options = {}) {
    try {
      const { useDatabaseSource: dbSource } = await import('@/composables/useDatabaseSource')
      const { fetchData } = dbSource()

      console.log('[DataLoader] loadDaftarAlat - Starting')

      const data = await fetchData(
        'daftaralat',
        () => daftarAlatApi.fetchList(options.statusFilter || 'active'),
        {
          cache: options.cache !== false,
          cacheTTL: options.cacheTTL || this.cacheTTL
        }
      )

      // Normalize data jika dari Google Sheets
      return this.normalizeDaftarAlat(data)
    } catch (error) {
      console.error('[DataLoader] loadDaftarAlat - Error:', error)
      return []
    }
  }

  /**
   * Load Jadwal Kalibrasi (Calibration Schedule)
   */
  async loadJadwalKalibrasi(options = {}) {
    try {
      const { useDatabaseSource: dbSource } = await import('@/composables/useDatabaseSource')
      const { fetchData } = dbSource()

      console.log('[DataLoader] loadJadwalKalibrasi - Starting')

      const data = await fetchData(
        'jadwal_kalibrasi',
        () => jadwalKalibrasiApi.fetchList(),
        {
          cache: options.cache !== false,
          cacheTTL: options.cacheTTL || this.cacheTTL
        }
      )

      // Normalize data
      return this.normalizeJadwalKalibrasi(data)
    } catch (error) {
      console.error('[DataLoader] loadJadwalKalibrasi - Error:', error)
      return []
    }
  }

  /**
   * Load Users
   */
  async loadUsers(options = {}) {
    try {
      const { useDatabaseSource: dbSource } = await import('@/composables/useDatabaseSource')
      const { fetchData } = dbSource()

      console.log('[DataLoader] loadUsers - Starting')

      const data = await fetchData(
        'users',
        () => userApi.fetchAll(),
        {
          cache: options.cache !== false,
          cacheTTL: options.cacheTTL || this.cacheTTL
        }
      )

      return this.normalizeUsers(data)
    } catch (error) {
      console.error('[DataLoader] loadUsers - Error:', error)
      return []
    }
  }

  /**
   * Load Log Aktivitas
   */
  async loadLogAktivitas(options = {}) {
    try {
      const { useDatabaseSource: dbSource } = await import('@/composables/useDatabaseSource')
      const { fetchData } = dbSource()

      console.log('[DataLoader] loadLogAktivitas - Starting')

      const data = await fetchData(
        'log_aktivitas_kalibrasi',
        () => logAktivitasApi.fetchAll(),
        {
          cache: false // Log biasanya tidak di-cache agar selalu fresh
        }
      )

      return this.normalizeLogAktivitas(data)
    } catch (error) {
      console.error('[DataLoader] loadLogAktivitas - Error:', error)
      return []
    }
  }

  /**
   * Normalize Daftar Alat data
   * Map field names dari Google Sheets ke format yang diharapkan
   */
  normalizeDaftarAlat(data) {
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      // Basic info
      no: this.parseNumber(item.no),
      no_id: item.no_id,
      description: item.description,
      type_model: item.type_model,
      sn: item.sn,
      year: this.parseNumber(item.year),
      location: item.location,
      area: item.area,

      // Criticality
      crit_product: this.parseYN(item.crit_product || item.product),
      crit_process: this.parseYN(item.crit_process || item.process),
      crit_safety: this.parseYN(item.crit_safety || item.safety),
      crit_env: this.parseYN(item.crit_env || item.crit_env),

      // PM
      pm_overall: this.parseYN(item.pm_overall || item.pm_yn),
      pm_6monthly: this.parseYN(item.pm_6monthly || item['6_monthly']),
      pm_yearly: this.parseYN(item.pm_yearly || item.yearly),
      pm_internal_external: item.pm_internal_external || item.internal_external,

      // Calibration
      calib_yesno: this.parseYN(item.calib_yesno || item.y_n),
      calib_schedule: item.calib_schedule || item.schedule,

      // Status
      status: item.status || 'active',
      status_pm: item.status_pm || '',
      status_calibration: item.status_calibration || '',

      // Audit
      created_at: item.created_at,
      updated_at: item.updated_at,
      created_by: item.created_by,
      updated_by: item.updated_by
    }))
  }

  /**
   * Normalize Jadwal Kalibrasi data
   */
  normalizeJadwalKalibrasi(data) {
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      id: item.id,
      no_id: item.no_id,
      description: item.description || item.deskripsi,
      last_calibration: item.last_calibration || item.last_calib,
      next_calibration: item.next_calibration || item.next_calib,
      status: item.status || 'scheduled',
      notes: item.notes || item.keterangan,
      created_at: item.created_at,
      updated_at: item.updated_at
    }))
  }

  /**
   * Normalize Users data
   */
  normalizeUsers(data) {
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      id: item.id,
      nama: item.nama || item.name,
      email: item.email,
      role: item.role,
      is_active: this.parseYN(item.is_active),
      created_at: item.created_at,
      updated_at: item.updated_at
    }))
  }

  /**
   * Normalize Log Aktivitas data
   */
  normalizeLogAktivitas(data) {
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      id: item.id,
      user_id: item.user_id,
      user_nama: item.user_nama || item.nama,
      activity_type: item.activity_type || item.tipe,
      table_name: item.table_name || item.tabel,
      row_id: item.row_id,
      action: item.action || item.aksi,
      old_values: item.old_values,
      new_values: item.new_values,
      notes: item.notes || item.keterangan,
      created_at: item.created_at,
      timestamp: item.timestamp
    }))
  }

  /**
   * Helper: Parse number
   */
  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return isNaN(num) ? null : num
  }

  /**
   * Helper: Parse Y/N value
   */
  parseYN(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return value.toLowerCase().trim() === 'y' || value.toLowerCase().trim() === 'yes'
    }
    return !!value
  }

  /**
   * Clear all cache
   */
  clearCache() {
    console.log('[DataLoader] clearCache - Clearing all cache')
    this.cache.clear()
  }

  /**
   * Set cache TTL (untuk semua load berikutnya)
   */
  setCacheTTL(ms) {
    this.cacheTTL = ms
    console.log('[DataLoader] setCacheTTL - Set to:', ms, 'ms')
  }
}

// Export singleton instance
export const dataLoader = new DataLoader()

export default dataLoader
