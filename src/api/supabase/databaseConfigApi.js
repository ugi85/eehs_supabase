// src/api/supabase/databaseConfigApi.js
// API untuk mengelola konfigurasi database (Supabase vs Spreadsheet)

import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Get konfigurasi database yang aktif
 */
export const getActiveDatabaseConfig = async () => {
  try {
    const { data, error } = await supabase
      .from('config_database')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) throw error
    
    console.log('[databaseConfigApi] getActiveDatabaseConfig - Success:', data)
    return data || { database_type: 'supabase', is_active: true }
  } catch (error) {
    console.error('[databaseConfigApi] getActiveDatabaseConfig - Error:', error)
    // Return default jika tidak ada config
    return { database_type: 'supabase', is_active: true }
  }
}

/**
 * Get semua konfigurasi database
 */
export const getAllDatabaseConfigs = async () => {
  try {
    const { data, error } = await supabase
      .from('config_database')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    
    console.log('[databaseConfigApi] getAllDatabaseConfigs - Success:', data?.length, 'configs')
    return data || []
  } catch (error) {
    console.error('[databaseConfigApi] getAllDatabaseConfigs - Error:', error)
    handleSupabaseError(error)
  }
}

/**
 * Switch database type (Supabase atau Spreadsheet)
 * @param {Object} config - { database_type, spreadsheet_id, spreadsheet_url, updated_by, notes }
 */
export const switchDatabaseType = async (config) => {
  try {
    console.log('[databaseConfigApi] switchDatabaseType - Config:', config)

    // Validasi
    if (!config.database_type || !['supabase', 'spreadsheet'].includes(config.database_type)) {
      throw new Error('Database type harus supabase atau spreadsheet')
    }

    // Non-aktifkan semua config yang ada
    const { error: deactivateError } = await supabase
      .from('config_database')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateError) throw deactivateError

    // Insert config baru sebagai aktif
    const { data, error } = await supabase
      .from('config_database')
      .insert({
        database_type: config.database_type,
        spreadsheet_id: config.spreadsheet_id || null,
        spreadsheet_url: config.spreadsheet_url || null,
        is_active: true,
        updated_by: config.updated_by || 'system',
        notes: config.notes || `Switch to ${config.database_type}`
      })
      .select()
      .single()

    if (error) throw error
    
    console.log('[databaseConfigApi] switchDatabaseType - Success:', data)
    return data
  } catch (error) {
    console.error('[databaseConfigApi] switchDatabaseType - Error:', error)
    handleSupabaseError(error)
  }
}

/**
 * Update konfigurasi database yang ada
 * @param {number} id - ID config
 * @param {Object} updates - Data yang akan diupdate
 */
export const updateDatabaseConfig = async (id, updates) => {
  try {
    console.log('[databaseConfigApi] updateDatabaseConfig - ID:', id, 'Updates:', updates)

    const { data, error } = await supabase
      .from('config_database')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    console.log('[databaseConfigApi] updateDatabaseConfig - Success:', data)
    return data
  } catch (error) {
    console.error('[databaseConfigApi] updateDatabaseConfig - Error:', error)
    handleSupabaseError(error)
  }
}

/**
 * Test koneksi spreadsheet
 * @param {string} spreadsheetId - ID Google Sheets
 */
export const testSpreadsheetConnection = async (spreadsheetId) => {
  try {
    // TODO: Implementasi test koneksi ke Google Sheets API
    // Untuk sekarang, return dummy success
    console.log('[databaseConfigApi] testSpreadsheetConnection - Testing:', spreadsheetId)
    
    // Simulasi delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      success: true,
      message: 'Koneksi ke spreadsheet berhasil',
      spreadsheetId
    }
  } catch (error) {
    console.error('[databaseConfigApi] testSpreadsheetConnection - Error:', error)
    throw error
  }
}

export default {
  getActiveDatabaseConfig,
  getAllDatabaseConfigs,
  switchDatabaseType,
  updateDatabaseConfig,
  testSpreadsheetConnection
}

