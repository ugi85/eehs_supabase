// src/api/googleSheets/sheetsDatasource.js
// Google Sheets Data Source Adapter
// Membaca data dari Google Sheets tanpa memerlukan API key kompleks

import { cacheManager } from '@/services/cacheManager'

/**
 * Sheet name mapping
 * Sesuaikan dengan nama sheet di Google Sheets Anda
 */
const SHEET_MAPPING = {
  daftaralat: 'DaftarAlat',
  jadwal_kalibrasi: 'JadwalKalibrasi',
  users: 'Users',
  roles: 'Roles',
  log_aktivitas_kalibrasi: 'LogKalibrasi',
  log_aktivitas_pm: 'LogPM',
  config: 'Config'
}

/**
 * Parse CSV dari Google Sheets
 * Google Sheets bisa di-export sebagai CSV via URL
 */
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n')
  if (lines.length === 0) return []

  // Parse header
  const headers = parseCSVLine(lines[0])
  
  // Parse rows
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const obj = {}
    
    headers.forEach((header, index) => {
      obj[header.toLowerCase().trim()] = values[index] || null
    })
    
    return obj
  })

  return rows
}

/**
 * Parse single CSV line (handle quoted values)
 */
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim().replace(/^"|"$/g, ''))
  return result
}

/**
 * Build Google Sheets export URL
 * Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=SHEET_ID
 */
const buildExportUrl = (spreadsheetId, sheetName) => {
  // Jika sudah punya gid (sheet ID), gunakan itu
  // Jika tidak, gunakan default (gid=0 untuk sheet pertama)
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`
}

/**
 * Fetch data dari Google Sheets
 * @param {string} spreadsheetId - Spreadsheet ID dari URL
 * @param {string} tableName - Nama tabel (key dari SHEET_MAPPING)
 * @param {Object} options - { cache: true, cacheTTL: 5 }
 */
export const fetchFromGoogleSheets = async (spreadsheetId, tableName, options = {}) => {
  try {
    const { cache = true, cacheTTL = 5 * 60 * 1000 } = options // Default cache 5 menit
    const cacheKey = `sheets_${spreadsheetId}_${tableName}`

    // Check cache first
    if (cache) {
      const cached = cacheManager.get(cacheKey)
      if (cached) {
        console.log('[sheetsDatasource] fetchFromGoogleSheets - Cache HIT:', tableName)
        return cached
      }
    }

    const sheetName = SHEET_MAPPING[tableName] || tableName
    const url = buildExportUrl(spreadsheetId, sheetName)

    console.log('[sheetsDatasource] fetchFromGoogleSheets - URL:', url)

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`)
    }

    const csvText = await response.text()
    const data = parseCSV(csvText)

    console.log('[sheetsDatasource] fetchFromGoogleSheets - Success:', tableName, data.length, 'rows')

    // Cache data
    if (cache && data.length > 0) {
      cacheManager.set(cacheKey, data, cacheTTL)
    }

    return data
  } catch (error) {
    console.error('[sheetsDatasource] fetchFromGoogleSheets - Error:', error)
    throw error
  }
}

/**
 * Fetch single table dengan error handling
 */
export const getTableData = async (spreadsheetId, tableName, options = {}) => {
  try {
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required')
    }

    const data = await fetchFromGoogleSheets(spreadsheetId, tableName, options)
    
    if (!data || data.length === 0) {
      console.warn('[sheetsDatasource] getTableData - No data found for:', tableName)
      return []
    }

    return data
  } catch (error) {
    console.error('[sheetsDatasource] getTableData - Error:', error)
    throw error
  }
}

/**
 * Get active spreadsheet ID dari config
 */
export const getActiveSpreadsheetId = () => {
  const config = localStorage.getItem('active_database_config')
  if (config) {
    try {
      const parsed = JSON.parse(config)
      return parsed.spreadsheet_id
    } catch (e) {
      console.error('[sheetsDatasource] getActiveSpreadsheetId - Parse error:', e)
      return null
    }
  }
  return null
}

/**
 * Check if using Google Sheets
 */
export const isUsingGoogleSheets = () => {
  const config = localStorage.getItem('active_database_config')
  if (config) {
    try {
      const parsed = JSON.parse(config)
      return parsed.database_type === 'spreadsheet'
    } catch (e) {
      return false
    }
  }
  return false
}

/**
 * Test connection ke Google Sheets
 */
export const testGoogleSheetsConnection = async (spreadsheetId) => {
  try {
    console.log('[sheetsDatasource] testGoogleSheetsConnection - Testing:', spreadsheetId)

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required')
    }

    // Try fetch header row dari sheet pertama
    const url = buildExportUrl(spreadsheetId, Object.values(SHEET_MAPPING)[0])
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.statusText}`)
    }

    const csvText = await response.text()
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Spreadsheet is empty')
    }

    const data = parseCSV(csvText)

    return {
      success: true,
      message: 'Connection successful',
      spreadsheetId,
      rowCount: data.length
    }
  } catch (error) {
    console.error('[sheetsDatasource] testGoogleSheetsConnection - Error:', error)
    return {
      success: false,
      message: error.message || 'Connection failed',
      spreadsheetId
    }
  }
}

/**
 * Clear all sheets cache
 */
export const clearSheetsCache = () => {
  console.log('[sheetsDatasource] clearSheetsCache - Clearing all sheets cache')
  
  // Clear semua cache yang dimulai dengan 'sheets_'
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sheets_')) {
      localStorage.removeItem(key)
    }
  }
}

export default {
  fetchFromGoogleSheets,
  getTableData,
  getActiveSpreadsheetId,
  isUsingGoogleSheets,
  testGoogleSheetsConnection,
  clearSheetsCache,
  SHEET_MAPPING
}
