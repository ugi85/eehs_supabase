// src/composables/useDatabaseSource.js
// Composable untuk handle data fetching dengan auto-fallback logic

import { ref, computed } from 'vue'
import { universalFetch, getCurrentDatabaseSource, getFallbackData } from '@/api/databaseAdapter'
import { isUsingGoogleSheets, getActiveSpreadsheetId } from '@/api/googleSheets/sheetsDatasource'

export const useDatabaseSource = () => {
  const isLoadingData = ref(false)
  const dataSourceError = ref(null)
  const currentSource = computed(() => getCurrentDatabaseSource())
  const isUsingSheets = computed(() => isUsingGoogleSheets())

  /**
   * Fetch data dengan auto-fallback
   * @param {string} tableName - Nama tabel
   * @param {Function} supabaseApi - Function untuk fetch dari Supabase (fallback)
   * @param {Object} options - { cache: true, cacheTTL: 300000 }
   */
  const fetchData = async (tableName, supabaseApi, options = {}) => {
    try {
      isLoadingData.value = true
      dataSourceError.value = null

      console.log(`[useDatabaseSource] fetchData - Table: ${tableName}, Source: ${currentSource.value.type}`)

      // Try universal fetch (Supabase atau Sheets tergantung config)
      const data = await universalFetch(tableName, supabaseApi, {
        cache: options.cache !== false,
        cacheTTL: options.cacheTTL || 5 * 60 * 1000 // Default 5 menit
      })

      console.log(`[useDatabaseSource] fetchData - Success: ${data?.length || 0} rows`)
      return data || []
    } catch (error) {
      console.error(`[useDatabaseSource] fetchData - Error:`, error)
      dataSourceError.value = error.message

      // Try fallback jika ada
      if (typeof supabaseApi === 'function' && !isUsingSheets.value) {
        try {
          console.log(`[useDatabaseSource] fetchData - Trying Supabase fallback`)
          const fallbackData = await supabaseApi()
          dataSourceError.value = null
          return fallbackData || []
        } catch (fallbackError) {
          console.error(`[useDatabaseSource] fetchData - Fallback error:`, fallbackError)
          dataSourceError.value = fallbackError.message
        }
      }

      // Return empty array sebagai last resort
      return getFallbackData(tableName)
    } finally {
      isLoadingData.value = false
    }
  }

  /**
   * Fetch dengan retry logic
   */
  const fetchDataWithRetry = async (
    tableName,
    supabaseApi,
    maxRetries = 3,
    retryDelayMs = 1000
  ) => {
    let lastError = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[useDatabaseSource] fetchDataWithRetry - Attempt ${attempt}/${maxRetries}`)
        return await fetchData(tableName, supabaseApi)
      } catch (error) {
        lastError = error
        console.error(`[useDatabaseSource] fetchDataWithRetry - Attempt ${attempt} failed:`, error)

        if (attempt < maxRetries) {
          // Wait sebelum retry
          await new Promise(resolve => setTimeout(resolve, retryDelayMs))
        }
      }
    }

    // Semua retry gagal
    console.error(`[useDatabaseSource] fetchDataWithRetry - All retries failed`)
    dataSourceError.value = lastError?.message || 'Failed to fetch data after retries'
    throw lastError
  }

  /**
   * Get spreadsheet ID jika menggunakan Sheets
   */
  const getSpreadsheetId = () => {
    if (isUsingSheets.value) {
      return getActiveSpreadsheetId()
    }
    return null
  }

  /**
   * Check connection status
   */
  const checkConnection = async (tableName = 'daftaralat') => {
    try {
      const data = await fetchData(tableName, null, { cache: false })
      return {
        connected: true,
        source: currentSource.value.type,
        message: 'Connected'
      }
    } catch (error) {
      return {
        connected: false,
        source: currentSource.value.type,
        message: error.message || 'Connection failed'
      }
    }
  }

  return {
    // State
    isLoadingData,
    dataSourceError,
    currentSource,
    isUsingSheets,

    // Methods
    fetchData,
    fetchDataWithRetry,
    getSpreadsheetId,
    checkConnection
  }
}
