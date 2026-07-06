// src/api/databaseAdapter.js
// Universal Database Adapter - Switch antara Supabase dan Google Sheets

import { isUsingGoogleSheets, getTableData } from '@/api/googleSheets/sheetsDatasource'

/**
 * Get active database config
 */
const getActiveConfig = () => {
  const config = localStorage.getItem('active_database_config')
  if (config) {
    try {
      return JSON.parse(config)
    } catch (e) {
      console.error('[databaseAdapter] getActiveConfig - Parse error:', e)
      return null
    }
  }
  return null
}

/**
 * Universal fetch function - automatically choose source
 * @param {string} tableName - Nama tabel (e.g., 'daftaralat', 'jadwal_kalibrasi')
 * @param {Function} supabaseApi - Function yang fetch dari Supabase
 * @param {Object} options - Cache options
 */
export const universalFetch = async (tableName, supabaseApi, options = {}) => {
  try {
    // Check database type
    if (isUsingGoogleSheets()) {
      console.log('[databaseAdapter] universalFetch - Using Google Sheets:', tableName)
      
      const config = getActiveConfig()
      if (!config || !config.spreadsheet_id) {
        throw new Error('Spreadsheet ID not configured')
      }

      // Fetch dari Google Sheets
      return await getTableData(config.spreadsheet_id, tableName, options)
    } else {
      console.log('[databaseAdapter] universalFetch - Using Supabase:', tableName)
      
      // Fetch dari Supabase (default)
      if (typeof supabaseApi === 'function') {
        return await supabaseApi()
      }
      return []
    }
  } catch (error) {
    console.error('[databaseAdapter] universalFetch - Error:', tableName, error)
    throw error
  }
}

/**
 * Check current database source
 */
export const getCurrentDatabaseSource = () => {
  if (isUsingGoogleSheets()) {
    const config = getActiveConfig()
    return {
      type: 'spreadsheet',
      spreadsheetId: config?.spreadsheet_id,
      name: 'Google Sheets'
    }
  }
  
  return {
    type: 'supabase',
    name: 'Supabase'
  }
}

/**
 * Get fallback data (offline/empty)
 */
export const getFallbackData = (tableName) => {
  const fallbacks = {
    daftaralat: [],
    jadwal_kalibrasi: [],
    users: [],
    roles: [],
    log_aktivitas_kalibrasi: [],
    log_aktivitas_pm: [],
    config: []
  }
  
  return fallbacks[tableName] || []
}

export default {
  universalFetch,
  getCurrentDatabaseSource,
  getFallbackData,
  isUsingGoogleSheets,
  getActiveConfig
}
