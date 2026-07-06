// src/api/daftarAlatApi.js
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'
import { daftarAlatApi as supabaseDaftarAlatApi } from '@/api/supabase/daftarAlatApi'

export const daftarAlatApi = {
  async fetchList(statusFilter = 'active') {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
      try {
        console.log('[daftarAlatApi] Attempting Supabase...')
        return await supabaseDaftarAlatApi.fetchList(statusFilter)
    } catch (error) {
        console.warn('[daftarAlatApi] Supabase gagal, mencoba failover ke Google Sheets...')
        settings.switchToGoogleSheets()
    }
    }

    // If using Google Sheets, use Google Apps Script
    console.log('[daftarAlatApi] Using Google Sheets')
    try {
      const { data } = await api.get(settings.api.daftarAlat, {
        params: { action: 'list' }
      })
      return data.success ? data.data || [] : []
    } catch (error) {
      console.error('[daftarAlatApi] Gagal fetch dari Google Sheets:', error)
      throw error
    }
  },

  async getToolByNo(no) {
    const settings = useSettingsStore()
    
    if (settings.isUsingSupabase) {
        return await supabaseDaftarAlatApi.getToolByNo(no)
    }
    try {
      const { data } = await api.get(settings.api.daftarAlat, {
        params: { action: 'get', no }
      })
      return data.success ? data.item : null
    } catch (error) {
      console.error('[daftarAlatApi] Gagal get tool:', error)
      throw error
    }
  },

  async saveTool(tool) {
    const settings = useSettingsStore()

    if (settings.isUsingSupabase) {
        return await supabaseDaftarAlatApi.create(tool)
}
    try {
      const action = tool.no ? 'update' : 'create'
      const { data } = await api.post(settings.api.daftarAlat, {
        action,
        ...tool
      }, {
        headers: { 'Content-Type': 'application/json' }
      })

      if (!data.success) throw new Error(data.message || 'Gagal menyimpan')
      return data
    } catch (error) {
      console.error('[daftarAlatApi] Gagal save tool:', error)
      throw error
    }
  },

  async deleteTool(no) {
    const settings = useSettingsStore()

    if (settings.isUsingSupabase) {
      return await supabaseDaftarAlatApi.delete(no)
}

    try {
      const { data } = await api.post(settings.api.daftarAlat, {
        action: 'delete',
        no: no
      }, {
        headers: { 'Content-Type': 'application/json' }
      })
      return data
    } catch (error) {
      console.error('[daftarAlatApi] Gagal delete tool:', error)
      throw error
    }
  },

  // ✅ BARU: Tambahan fungsi untuk import batch
  async upsertBatch(tools) {
    const settings = useSettingsStore()

    if (settings.isUsingSupabase) {
      return await supabaseDaftarAlatApi.upsertBatch(tools)
    }

    // Fallback: Loop saveTool jika upsertBatch tidak ada di GAS
    console.log('[daftarAlatApi] Upsert Batch (Sequential) ke Google Sheets...')
    try {
      const results = await Promise.all(tools.map(tool => this.saveTool(tool)))
      return { success: true, count: results.length }
    } catch (error) {
      console.error('[daftarAlatApi] Error upsertBatch:', error)
      throw error
    }
  }
}

