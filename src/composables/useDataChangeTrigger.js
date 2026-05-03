// src/composables/useDataChangeTrigger.js
import { useVersioning } from './useVersioning'

export function useDataChangeTrigger() {
  const { createVersion } = useVersioning()

  // ✅ Trigger version creation when master data changes
  const triggerVersionOnDataChange = async (changeDescription) => {
    try {
      console.log('[DataChangeTrigger] Creating version for:', changeDescription)
      const result = await createVersion(changeDescription)

      if (result.success) {
        console.log('[DataChangeTrigger] Version created:', result.data.version_name)

        // Emit event to refresh dashboard
        window.dispatchEvent(new CustomEvent('data-version-created', {
          detail: { version: result.data }
        }))

        return result
      } else {
        console.error('[DataChangeTrigger] Failed to create version:', result.error)
        return result
      }
    } catch (error) {
      console.error('[DataChangeTrigger] Error:', error)
      return { success: false, error: error.message }
    }
  }

  // ✅ Auto-trigger on daftar alat changes
  const onDaftarAlatChange = async (action, alatData) => {
    const descriptions = {
      insert: `Penambahan alat baru: ${alatData.no_id}`,
      update: `Update alat: ${alatData.no_id}`,
      delete: `Penghapusan alat: ${alatData.no_id}`
    }

    const description = descriptions[action] || `Perubahan data alat: ${alatData.no_id}`
    return await triggerVersionOnDataChange(description)
  }

  // ✅ Auto-trigger on kalibrasi changes
  const onKalibrasiChange = async (action, kalibrasiData) => {
    const descriptions = {
      insert: `Penambahan jadwal kalibrasi: ${kalibrasiData.no_id}`,
      update: `Update jadwal kalibrasi: ${kalibrasiData.no_id}`,
      delete: `Penghapusan jadwal kalibrasi: ${kalibrasiData.no_id}`
    }

    const description = descriptions[action] || `Perubahan jadwal kalibrasi: ${kalibrasiData.no_id}`
    return await triggerVersionOnDataChange(description)
  }

  return {
    triggerVersionOnDataChange,
    onDaftarAlatChange,
    onKalibrasiChange
  }
}