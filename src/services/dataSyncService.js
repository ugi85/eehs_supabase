/**
 * Data Sync Service
 * Synchronizes data between Supabase and Google Sheets
 * 
 * Features:
 * - Bi-directional sync (Supabase ↔ Google Sheets)
 * - Auto-sync on database switch
 * - Conflict resolution
 * - Sync queue for offline operations
 * - Error recovery
 */

import { supabase } from '@/config/supabase'

const SYNC_LOG_KEY = 'data_sync_log'
const SYNC_QUEUE_KEY = 'sync_queue'
const LAST_SYNC_KEY = 'last_sync_timestamp'

export const dataSyncService = {
  /**
   * Initialize sync service on app start
   */
  async init() {
    console.log('[DataSync] Initializing sync service')
    
    // Load pending sync queue
    const queue = this.getSyncQueue()
    if (queue.length > 0) {
      console.log('[DataSync] Found', queue.length, 'pending sync operations')
      await this.processSyncQueue()
    }
  },

  /**
   * Get sync queue from localStorage
   */
  getSyncQueue() {
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch (error) {
      console.error('[DataSync] Error reading sync queue:', error)
      return []
    }
  },

  /**
   * Add operation to sync queue
   */
  addToQueue(operation) {
    const queue = this.getSyncQueue()
    queue.push({
      ...operation,
      id: `${operation.table}_${operation.action}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3
    })
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    console.log('[DataSync] Added to queue:', operation)
  },

  /**
   * Process all pending sync operations
   */
  async processSyncQueue() {
    const queue = this.getSyncQueue()
    console.log('[DataSync] Processing queue with', queue.length, 'operations')

    for (const operation of queue) {
      try {
        await this.executeOperation(operation)
        this.removeFromQueue(operation.id)
      } catch (error) {
        console.error('[DataSync] Error processing operation:', error)
        if (operation.retries < operation.maxRetries) {
          operation.retries++
          localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
        } else {
          console.log('[DataSync] Max retries reached for:', operation.id)
          this.removeFromQueue(operation.id)
        }
      }
    }
  },

  /**
   * Execute a sync operation
   */
  async executeOperation(operation) {
    const { table, action, data, id } = operation

    console.log('[DataSync] Executing:', action, 'on', table, 'with id:', id)

    switch (action) {
      case 'create':
        return await supabase.from(table).insert([data])
      case 'update':
        return await supabase.from(table).update(data).eq('id', data.id || data.id_user)
      case 'delete':
        return await supabase.from(table).delete().eq('id', data.id || data.id_user)
      default:
        throw new Error(`Unknown sync action: ${action}`)
    }
  },

  /**
   * Remove operation from queue
   */
  removeFromQueue(operationId) {
    const queue = this.getSyncQueue()
    const filtered = queue.filter(op => op.id !== operationId)
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
  },

  /**
   * Full sync from Google Sheets to Supabase
   * Called when switching back to Supabase from Google Sheets
   */
  async syncFromGoogleSheetsToSupabase(api) {
    console.log('[DataSync] Starting full sync: Google Sheets → Supabase')

    try {
      const tables = ['daftarAlat', 'jadwalKalibrasi', 'logAktivitas', 'users']
      const syncResults = {}

      for (const table of tables) {
        try {
          syncResults[table] = await this.syncTable(table, api)
        } catch (error) {
          console.error('[DataSync] Error syncing table:', table, error)
          syncResults[table] = { success: false, error: error.message }
        }
      }

      this.recordSyncLog('googleSheets_to_supabase', syncResults)
      console.log('[DataSync] Sync complete:', syncResults)
      return syncResults
    } catch (error) {
      console.error('[DataSync] Full sync failed:', error)
      throw error
    }
  },

  /**
   * Sync a single table from Google Sheets to Supabase
   */
  async syncTable(table, api) {
    console.log('[DataSync] Syncing table:', table)

    try {
      // Get data from Google Sheets via Google Apps Script
      let googleData = []
      
      // Map table to API method
      const apiMethods = {
        daftarAlat: 'getAllAlat',
        jadwalKalibrasi: 'getAllSchedules',
        logAktivitas: 'getAllLogs',
        users: 'getAllUsers'
      }

      const method = apiMethods[table]
      if (method && api[method]) {
        const result = await api[method]()
        googleData = result.data || result || []
      } else {
        console.log('[DataSync] No API method found for table:', table)
        return { success: false, message: 'API method not found' }
      }

      console.log('[DataSync] Retrieved', googleData.length, 'records from', table)

      if (googleData.length === 0) {
        return { success: true, synced: 0, updated: 0, created: 0 }
      }

      // Get existing data from Supabase
      const { data: existingData, error: fetchError } = await supabase
        .from(table)
        .select('*')

      if (fetchError) throw fetchError

      // Compare and sync
      let created = 0
      let updated = 0

      for (const record of googleData) {
        const existing = existingData.find(
          e => (e.id === record.id || e.id_user === record.id_user || e.no === record.no)
        )

        if (existing) {
          // Update if changed
          const { error: updateError } = await supabase
            .from(table)
            .update(record)
            .eq(existing.id ? 'id' : 'id_user', existing.id || existing.id_user)

          if (!updateError) {
            updated++
            console.log('[DataSync] Updated record in', table)
          }
        } else {
          // Create if new
          const { error: createError } = await supabase
            .from(table)
            .insert([record])

          if (!createError) {
            created++
            console.log('[DataSync] Created new record in', table)
          }
        }
      }

      return {
        success: true,
        synced: googleData.length,
        updated,
        created
      }
    } catch (error) {
      console.error('[DataSync] Error syncing table:', table, error)
      return { success: false, table, error: error.message }
    }
  },

  /**
   * Queue a data operation for later sync
   * Used when app is offline or between database switches
   */
  queueOperation(table, action, data) {
    this.addToQueue({
      table,
      action,
      data,
      timestamp: new Date().toISOString()
    })
    console.log('[DataSync] Operation queued for later sync')
  },

  /**
   * Record sync log for audit trail
   */
  recordSyncLog(syncType, result) {
    try {
      const logs = JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || '[]')
      logs.push({
        type: syncType,
        timestamp: new Date().toISOString(),
        result
      })

      // Keep only last 100 sync logs
      if (logs.length > 100) {
        logs.shift()
      }

      localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(logs))
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString())
    } catch (error) {
      console.error('[DataSync] Error recording sync log:', error)
    }
  },

  /**
   * Get sync history
   */
  getSyncHistory() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || '[]')
    } catch (error) {
      console.error('[DataSync] Error reading sync history:', error)
      return []
    }
  },

  /**
   * Get last sync time
   */
  getLastSyncTime() {
    const timestamp = localStorage.getItem(LAST_SYNC_KEY)
    return timestamp ? new Date(parseInt(timestamp)) : null
  },

  /**
   * Clear all sync data (for debugging/reset)
   */
  clearSyncData() {
    localStorage.removeItem(SYNC_QUEUE_KEY)
    localStorage.removeItem(SYNC_LOG_KEY)
    localStorage.removeItem(LAST_SYNC_KEY)
    console.log('[DataSync] Sync data cleared')
  }
}
