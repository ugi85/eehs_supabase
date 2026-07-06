// src/services/syncService.js
import { supabase } from '@/config/supabase'
import { daftarAlatApi as googleApi } from '@/api/daftarAlatApi'

export const syncService = {
  /**
   * Sinkronisasi data dari Google Sheets ke Supabase
   * Menggunakan Upsert agar tidak duplikat
   */
  async syncSheetsToSupabase() {
    try {
      console.log('[Sync] Memulai sinkronisasi dari Google Sheets ke Supabase...')
      
      // 1. Ambil data dari Sheets
      const dataFromSheets = await googleApi.fetchList('all')
      
      if (!dataFromSheets || dataFromSheets.length === 0) {
        throw new Error('Data di Google Sheets kosong.')
      }

      // 2. Mapping data Sheets ke format Supabase
      const formattedData = dataFromSheets.map(item => ({
        no: item.no,
        no_id: item.no_id,
        description: item.description,
        type_model: item.type_model,
        sn: item.sn,
        year: item.year,
        crit_product: item.crit_product,
        crit_process: item.crit_process,
        crit_safety: item.crit_safety,
        crit_env: item.crit_env,
        pm_overall: item.pm_overall,
        pm_6monthly: item.pm_6monthly,
        pm_yearly: item.pm_yearly,
        pm_internal_external: item.pm_internal_external,
        calib_yesno: item.calib_yesno,
        calib_schedule: item.calib_schedule,
        location: item.location,
        status_pm: item.status_pm,
        status_calibration: item.status_calibration,
        updated_at: new Date().toISOString()
      }))

      // 3. Upsert ke Supabase
      const { error } = await supabase
        .from('daftar_alat')
        .upsert(formattedData, { onConflict: 'no' })

      if (error) throw error
      
      return { success: true, count: formattedData.length }
    } catch (error) {
      console.error('[Sync] Error syncing Sheets to Supabase:', error)
      throw error
    }
  }
}
