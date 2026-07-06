// src/config/databaseConfig.js
// Database Configuration Management

/**
 * Default database config
 */
const DEFAULT_CONFIG = {
  database_type: 'supabase',
  is_active: true,
  spreadsheet_id: null,
  spreadsheet_url: null,
  updated_at: new Date().toISOString(),
  updated_by: 'system'
}

const CONFIG_KEY = 'active_database_config'

/**
 * Initialize database config
 * Call this on app startup
 */
export const initializeDatabaseConfig = () => {
  console.log('[databaseConfig] initializeDatabaseConfig - Starting')

  // Check if config exists
  const existingConfig = localStorage.getItem(CONFIG_KEY)

  if (!existingConfig) {
    console.log('[databaseConfig] initializeDatabaseConfig - No existing config, setting default')
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    return DEFAULT_CONFIG
  }

  try {
    const config = JSON.parse(existingConfig)
    console.log('[databaseConfig] initializeDatabaseConfig - Using existing config:', config)
    return config
  } catch (error) {
    console.error('[databaseConfig] initializeDatabaseConfig - Parse error, resetting to default:', error)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    return DEFAULT_CONFIG
  }
}

/**
 * Get current database config
 */
export const getDatabaseConfig = () => {
  const config = localStorage.getItem(CONFIG_KEY)
  
  if (!config) {
    return DEFAULT_CONFIG
  }

  try {
    return JSON.parse(config)
  } catch (error) {
    console.error('[databaseConfig] getDatabaseConfig - Parse error:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Set database config
 */
export const setDatabaseConfig = (config) => {
  console.log('[databaseConfig] setDatabaseConfig - Setting config:', config)
  
  const newConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    updated_at: new Date().toISOString()
  }

  localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig))
  return newConfig
}

/**
 * Switch to Supabase
 */
export const switchToSupabase = (notes = '') => {
  console.log('[databaseConfig] switchToSupabase')
  
  return setDatabaseConfig({
    database_type: 'supabase',
    is_active: true,
    spreadsheet_id: null,
    spreadsheet_url: null,
    updated_by: 'manual_switch',
    notes: notes || 'Switched to Supabase'
  })
}

/**
 * Switch to Google Sheets
 */
export const switchToGoogleSheets = (spreadsheetId, spreadsheetUrl = '', notes = '') => {
  console.log('[databaseConfig] switchToGoogleSheets - ID:', spreadsheetId)
  
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required')
  }

  // Auto-generate URL if not provided
  const url = spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

  return setDatabaseConfig({
    database_type: 'spreadsheet',
    is_active: true,
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: url,
    updated_by: 'manual_switch',
    notes: notes || 'Switched to Google Sheets'
  })
}

/**
 * Get current database type
 */
export const getDatabaseType = () => {
  const config = getDatabaseConfig()
  return config.database_type
}

/**
 * Check if using Google Sheets
 */
export const isUsingGoogleSheets = () => {
  return getDatabaseType() === 'spreadsheet'
}

/**
 * Check if using Supabase
 */
export const isUsingSupabase = () => {
  return getDatabaseType() === 'supabase'
}

/**
 * Get Spreadsheet ID
 */
export const getSpreadsheetId = () => {
  const config = getDatabaseConfig()
  return config.spreadsheet_id
}

/**
 * Validate config
 */
export const validateConfig = (config) => {
  if (!config.database_type) {
    throw new Error('database_type is required')
  }

  if (!['supabase', 'spreadsheet'].includes(config.database_type)) {
    throw new Error('database_type must be supabase or spreadsheet')
  }

  if (config.database_type === 'spreadsheet' && !config.spreadsheet_id) {
    throw new Error('spreadsheet_id is required for spreadsheet mode')
  }

  return true
}

export default {
  initializeDatabaseConfig,
  getDatabaseConfig,
  setDatabaseConfig,
  switchToSupabase,
  switchToGoogleSheets,
  getDatabaseType,
  isUsingGoogleSheets,
  isUsingSupabase,
  getSpreadsheetId,
  validateConfig,
  DEFAULT_CONFIG,
  CONFIG_KEY
}
