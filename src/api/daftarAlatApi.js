// src/api/daftarAlatApi.js
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'

function toFormData(data) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  return params
}

export const daftarAlatApi = {
  async fetchList(statusFilter = 'active') {
    const settings = useSettingsStore()
    
    // Always use Google Sheets
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

    try {
      const action = tool.no ? 'update' : 'create'

      // Menggunakan toFormData agar konsisten dengan referensi web yang berhasil
      const payload = toFormData({
        action,
        ...tool
      })

      const { data } = await api.post(settings.api.daftarAlat, payload)

      if (!data.success) throw new Error(data.message || 'Gagal menyimpan')
      return data
    } catch (error) {
      console.error('[daftarAlatApi] Gagal save tool:', error)
      throw error
    }
  },

  async deleteTool(no) {
    const settings = useSettingsStore()

    try {
      const payload = toFormData({
        action: 'delete',
        no: no
      })
      const { data } = await api.post(settings.api.daftarAlat, payload)
      return data
    } catch (error) {
      console.error('[daftarAlatApi] Gagal delete tool:', error)
      throw error
    }
  },

  // ✅ PERBAIKAN: Gunakan chunking untuk mencegah Network Error (Too many requests)
  async upsertBatch(tools, mode = 'upsert') {
    const settings = useSettingsStore()
    const CHUNK_SIZE = 5 // Kirim 5-5 agar tidak overload
    const results = []

    console.log(`[daftarAlatApi] Upsert Batch (Chunked ${CHUNK_SIZE}, mode: ${mode}) ke Google Sheets...`)

    for (let i = 0; i < tools.length; i += CHUNK_SIZE) {
      const chunk = tools.slice(i, i + CHUNK_SIZE)
      const chunkResults = await Promise.all(chunk.map(async (tool) => {
        try {
          const payload = toFormData({
            action: mode === 'insert_only' ? 'create' : 'upsert',
            ...tool
          })
          const { data } = await api.post(settings.api.daftarAlat, payload)
          return { success: data.success, action: data.action || 'inserted', no_id: tool.no_id, ...data }
        } catch (e) {
          return { success: false, no_id: tool.no_id, error: 'Network Error' }
        }
      }))

      results.push(...chunkResults)

      // Jeda singkat antar chunk untuk memberi nafas ke Google Sheets API
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }
}

