// src/api/jadwalKalibrasiApi.js
import api from '@/plugins/axios'
import { useSettingsStore } from '@/stores/settings'

// Utility untuk format POST agar tidak ada masalah spasi menjadi '+'
function toFormData(data) {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value)) // pastikan nilai diubah ke string
    }
  })
  return params
}

export const jadwalKalibrasiApi = {
  async fetchList() {
    const settings = useSettingsStore()
    const { data } = await api.get(settings.api.jadwalKalibrasi, { params: { action: 'list' } })
    return data.success ? data.data || [] : []
  },


async getJadwalByNo(no) {
    const settings = useSettingsStore()
    const { data } = await api.get(settings.api.jadwalKalibrasi, {
      params: { action: 'get', no }
    })
    return data.success ? data.item : null
  },

  /**
   * Simpan alat (create atau update)
   */
  async saveJadwal(jadwal) {
    const settings = useSettingsStore()
    const action = jadwal.no ? 'update' : 'create'
    
    const payload = toFormData({
      action,
      no: jadwal.no,
      no_id: jadwal.no_id,
      description: jadwal.description,
      cal_id: jadwal.cal_id,
      parameter: jadwal.parameter,
      process_range: jadwal.process_range,
      reject_error: jadwal.reject_error,
      interval: jadwal.interval,
      due_date: jadwal.due_date,
      remark: jadwal.remark,
      criticality: jadwal.criticality
    })

    const { data } = await api.post(settings.api.jadwalKalibrasi, payload)
    if (!data.success) {
      throw new Error(data.message || 'Gagal menyimpan data jadwal')
    }
    if (!data.item) {
      data.item = { no: data.no || jadwal.no, ...jadwal }
    }
    return data
  },

async deleteJadwal(no) {
    const settings = useSettingsStore()
    const payload = toFormData({ action: 'delete', no })
    const { data } = await api.post(settings.api.jadwalKalibrasi, payload)
    if (!data.success) {
      throw new Error(data.message || 'Gagal menghapus data jadwal')
    }
    return data
  }
}