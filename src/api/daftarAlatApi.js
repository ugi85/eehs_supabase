// src/api/daftarAlat.js
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
  async fetchList() {
    const settings = useSettingsStore()
    const { data } = await api.get(settings.api.daftarAlat, {
      params: { action: 'list' }
    })
    return data.success ? data.data || [] : []
  },

  async getToolByNo(no) {
    const settings = useSettingsStore()
    const { data } = await api.get(settings.api.daftarAlat, {
      params: { action: 'get', no }
    })
    return data.success ? data.item : null
  },

  async saveTool(tool) {
    const settings = useSettingsStore()
    const action = tool.no ? 'update' : 'create'
    
    const payload = toFormData({
      action,
      no: tool.no,
      no_id: tool.no_id,
      description: tool.description,
      type_model: tool.type_model,
      sn: tool.sn,
      year: tool.year,
      crit_product: tool.crit_product,
      crit_process: tool.crit_process,
      crit_safety: tool.crit_safety,
      crit_env: tool.crit_env,
      pm_overall: tool.pm_overall,
      pm_6monthly: tool.pm_6monthly,
      pm_yearly: tool.pm_yearly,
      pm_internal_external: tool.pm_internal_external,
      calib_yesno: tool.calib_yesno,
      calib_schedule: tool.calib_schedule,
      location: tool.location,
      status_pm: tool.status_pm,
      status_calibration: tool.status_calibration
    })

    const { data } = await api.post(settings.api.daftarAlat, payload)
    if (!data.success) {
      throw new Error(data.message || 'Gagal menyimpan data alat')
    }
    if (!data.item) {
      data.item = { no: data.no || tool.no, ...tool }
    }
    return data
  },

  async deleteTool(no) {
    const settings = useSettingsStore()
    const payload = toFormData({ action: 'delete', no })
    const { data } = await api.post(settings.api.daftarAlat, payload)
    if (!data.success) {
      throw new Error(data.message || 'Gagal menghapus data alat')
    }
    return data
  }
}