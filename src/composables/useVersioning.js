// src/composables/useVersioning.js
import { ref, computed } from 'vue'
import { supabase, handleSupabaseError } from '@/config/supabase'

export function useVersioning() {
  const versions = ref([])
  const currentVersion = ref(null)
  const loading = ref(false)
  const totalVersions = ref(0)
  const versionPage = ref(1)
  const versionPageSize = ref(5)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalVersions.value / versionPageSize.value)))

  // ✅ Get paged versions
  const fetchVersions = async ({ page = versionPage.value, pageSize = versionPageSize.value } = {}) => {
    try {
      loading.value = true
      versionPage.value = page
      versionPageSize.value = pageSize

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await supabase
        .from('data_versions')
        .select('*', { count: 'exact' })
        .order('snapshot_date', { ascending: false })
        .range(from, to)

      if (error) throw error
      versions.value = data || []
      totalVersions.value = count || 0
      return { success: true, data: versions.value, count: totalVersions.value }
    } catch (error) {
      return handleSupabaseError(error)
    } finally {
      loading.value = false
    }
  }

  // ✅ Create new version snapshot
  const createVersion = async (description = '') => {
    try {
      loading.value = true

      // Get current user (you might need to adjust this based on your auth system)
      const user = JSON.parse(localStorage.getItem('current_user') || '{}')
      const createdBy = user.email || user.nama || 'system'

      // Create version record
      const versionName = `v${new Date().toISOString().split('T')[0]}_${Date.now()}`
      const { data: version, error: versionError } = await supabase
        .from('data_versions')
        .insert([{
          version_name: versionName,
          description: description || `Snapshot ${new Date().toLocaleDateString('id-ID')}`,
          created_by: createdBy,
          is_active: true
        }])
        .select()
        .single()

      if (versionError) throw versionError

      // Snapshot current data to this version
      await snapshotCurrentData(version.version_id)

      // Deactivate previous versions
      await supabase
        .from('data_versions')
        .update({ is_active: false })
        .neq('version_id', version.version_id)

      currentVersion.value = version
      versionPage.value = 1
      await fetchVersions({ page: 1, pageSize: versionPageSize.value })

      return { success: true, data: version }
    } catch (error) {
      return handleSupabaseError(error)
    } finally {
      loading.value = false
    }
  }

  // ✅ Helper: Snapshot current data to version
  const snapshotCurrentData = async (versionId) => {
    // Copy daftaralat
    const { data: alatData } = await supabase.from('daftaralat').select('*')
    if (alatData) {
      await supabase
        .from('daftaralat')
        .update({ version_id: versionId })
        .is('version_id', null)
    }

    // Copy kalibrasi
    const { data: kalibrasiData } = await supabase.from('kalibrasi').select('*')
    if (kalibrasiData) {
      await supabase
        .from('kalibrasi')
        .update({ version_id: versionId })
        .is('version_id', null)
    }

    // Copy logaktivitas
    const { data: logData } = await supabase.from('logaktivitas').select('*')
    if (logData) {
      await supabase
        .from('logaktivitas')
        .update({ version_id: versionId })
        .is('version_id', null)
    }
  }

  // ✅ Get version for specific period (frozen past logic)
  const getVersionForPeriod = async (month, year) => {
    const targetDate = new Date(year, month)
    const now = new Date()

    // If target period is in the past, find the version that was active at end of that month
    if (targetDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
      const periodEnd = new Date(year, month + 1, 0) // Last day of target month

      const { data, error } = await supabase
        .from('data_versions')
        .select('*')
        .lte('snapshot_date', periodEnd)
        .order('snapshot_date', { ascending: false })
        .limit(1)

      if (error) throw error
      return data?.[0]?.version_id || null
    }

    // For current month, use latest version
    return null
  }

  // ✅ Get data for specific version
  const getDataForVersion = async (table, versionId = null) => {
    let query = supabase.from(table).select('*')

    if (versionId) {
      query = query.eq('version_id', versionId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  return {
    versions: computed(() => versions.value),
    currentVersion: computed(() => currentVersion.value),
    loading: computed(() => loading.value),
    totalVersions: computed(() => totalVersions.value),
    versionPage,
    versionPageSize,
    totalPages,
    fetchVersions,
    createVersion,
    getVersionForPeriod,
    getDataForVersion
  }
}