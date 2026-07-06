// src/api/googleSheets/sheetsApi.js
// Google Sheets API Integration
// TODO: Implement real Google Sheets API integration

/**
 * Google Sheets API Client
 * Untuk menggunakan API ini, Anda perlu:
 * 1. Enable Google Sheets API di Google Cloud Console
 * 2. Buat Service Account dan download credentials
 * 3. Share spreadsheet dengan service account email
 */

// ============================================================
// CONFIGURATION
// ============================================================

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
const SERVICE_ACCOUNT_EMAIL = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL

// Mapping table names to sheet names
const SHEET_MAPPING = {
  daftaralat: 'DaftarAlat',
  jadwal_kalibrasi: 'JadwalKalibrasi',
  log_aktivitas_kalibrasi: 'LogKalibrasi',
  log_aktivitas_pm: 'LogPM',
  users: 'Users',
  roles: 'Roles'
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get spreadsheet ID from active config
 */
const getActiveSpreadsheetId = () => {
  const config = localStorage.getItem('active_database_config')
  if (config) {
    try {
      const parsed = JSON.parse(config)
      return parsed.spreadsheet_id
    } catch (e) {
      console.error('[sheetsApi] getActiveSpreadsheetId - Parse error:', e)
    }
  }
  return null
}

/**
 * Build Google Sheets API URL
 */
const buildApiUrl = (spreadsheetId, range) => {
  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${GOOGLE_API_KEY}`
}

/**
 * Convert row array to object based on headers
 */
const rowToObject = (headers, row) => {
  const obj = {}
  headers.forEach((header, index) => {
    obj[header] = row[index] || null
  })
  return obj
}

/**
 * Convert object to row array based on headers
 */
const objectToRow = (headers, obj) => {
  return headers.map(header => obj[header] || '')
}

// ============================================================
// READ OPERATIONS
// ============================================================

/**
 * Read all rows from a sheet
 * @param {string} tableName - Name of the table (e.g., 'daftaralat')
 * @returns {Array} Array of objects
 */
export const readSheet = async (tableName) => {
  try {
    const spreadsheetId = getActiveSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error('No active spreadsheet configured')
    }

    const sheetName = SHEET_MAPPING[tableName] || tableName
    const range = `${sheetName}!A:Z` // Read columns A to Z

    console.log('[sheetsApi] readSheet - Table:', tableName, 'Sheet:', sheetName)

    // TODO: Implement real API call
    // For now, return mock data
    return []

    /* Real implementation would be:
    const response = await fetch(buildApiUrl(spreadsheetId, range))
    const data = await response.json()

    if (!data.values || data.values.length === 0) {
      return []
    }

    const headers = data.values[0]
    const rows = data.values.slice(1)

    return rows.map(row => rowToObject(headers, row))
    */
  } catch (error) {
    console.error('[sheetsApi] readSheet - Error:', error)
    throw error
  }
}

/**
 * Read single row by ID
 * @param {string} tableName - Name of the table
 * @param {number} id - Row ID
 * @returns {Object} Single object
 */
export const readSheetById = async (tableName, id) => {
  try {
    const allRows = await readSheet(tableName)
    return allRows.find(row => row.id === id) || null
  } catch (error) {
    console.error('[sheetsApi] readSheetById - Error:', error)
    throw error
  }
}

// ============================================================
// WRITE OPERATIONS
// ============================================================

/**
 * Append a new row to sheet
 * @param {string} tableName - Name of the table
 * @param {Object} data - Data to insert
 * @returns {Object} Inserted data with ID
 */
export const appendSheet = async (tableName, data) => {
  try {
    const spreadsheetId = getActiveSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error('No active spreadsheet configured')
    }

    const sheetName = SHEET_MAPPING[tableName] || tableName

    console.log('[sheetsApi] appendSheet - Table:', tableName, 'Data:', data)

    // TODO: Implement real API call
    // For now, return mock data
    return { ...data, id: Date.now() }

    /* Real implementation would be:
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:append?valueInputOption=RAW&key=${GOOGLE_API_KEY}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [objectToRow(headers, data)]
      })
    })

    const result = await response.json()
    return { ...data, id: result.updates.updatedRows }
    */
  } catch (error) {
    console.error('[sheetsApi] appendSheet - Error:', error)
    throw error
  }
}

/**
 * Update a row in sheet
 * @param {string} tableName - Name of the table
 * @param {number} id - Row ID
 * @param {Object} data - Data to update
 * @returns {Object} Updated data
 */
export const updateSheet = async (tableName, id, data) => {
  try {
    const spreadsheetId = getActiveSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error('No active spreadsheet configured')
    }

    console.log('[sheetsApi] updateSheet - Table:', tableName, 'ID:', id, 'Data:', data)

    // TODO: Implement real API call
    // Need to find row number first, then update
    return { ...data, id }

    /* Real implementation would be:
    1. Find row number by ID
    2. Update specific range (e.g., Sheet1!A5:Z5)
    */
  } catch (error) {
    console.error('[sheetsApi] updateSheet - Error:', error)
    throw error
  }
}

/**
 * Delete a row from sheet
 * @param {string} tableName - Name of the table
 * @param {number} id - Row ID
 * @returns {boolean} Success status
 */
export const deleteSheet = async (tableName, id) => {
  try {
    const spreadsheetId = getActiveSpreadsheetId()
    if (!spreadsheetId) {
      throw new Error('No active spreadsheet configured')
    }

    console.log('[sheetsApi] deleteSheet - Table:', tableName, 'ID:', id)

    // TODO: Implement real API call
    // Need to find row number first, then delete
    return true

    /* Real implementation would be:
    1. Find row number by ID
    2. Use batchUpdate to delete the row
    */
  } catch (error) {
    console.error('[sheetsApi] deleteSheet - Error:', error)
    throw error
  }
}

// ============================================================
// TEST CONNECTION
// ============================================================

/**
 * Test connection to spreadsheet
 * @param {string} spreadsheetId - Spreadsheet ID
 * @returns {Object} Test result
 */
export const testSpreadsheetConnection = async (spreadsheetId) => {
  try {
    console.log('[sheetsApi] testSpreadsheetConnection - ID:', spreadsheetId)

    // TODO: Implement real API call to test connection
    // For now, return mock success
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      success: true,
      message: 'Connection successful',
      spreadsheetId
    }

    /* Real implementation would be:
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Cannot connect to spreadsheet')
    }

    const data = await response.json()
    return {
      success: true,
      message: 'Connection successful',
      spreadsheetId,
      title: data.properties.title
    }
    */
  } catch (error) {
    console.error('[sheetsApi] testSpreadsheetConnection - Error:', error)
    return {
      success: false,
      message: error.message || 'Connection failed',
      spreadsheetId
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  readSheet,
  readSheetById,
  appendSheet,
  updateSheet,
  deleteSheet,
  testSpreadsheetConnection
}
