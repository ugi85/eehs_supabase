// src/api/supabase/daftarAlatApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Daftar Alat API - Supabase Integration
 * Table: daftaralat (no underscore)
 * Columns: no, no_id, description, type_model, sn, year, product, process, safety, 
 *          environment, pm_yn, 6_monthly, yearly, internal_external, y_n, schedule, area, location
 */
export const daftarAlatApi = {
  /**
   * GET: Fetch all tools
   */
  async fetchList(statusFilter = 'active') {
    try {
      let query = supabase
        .from('daftaralat')
        .select('*')
        .order('no', { ascending: true })

      if (statusFilter === 'active') {
        query = query.or('status.is.null,status.neq.obsolete')
      } else if (statusFilter === 'obsolete') {
        query = query.eq('status', 'obsolete')
      }
      // statusFilter === 'all' → tidak ada filter tambahan

      const { data, error } = await query

      if (error) throw error

      // Map field names dari Supabase ke format yang diharapkan view
      const mappedData = (data || []).map(item => ({
        no: item.no,
        no_id: item.no_id,
        description: item.description,
        type_model: item.type_model,
        sn: item.sn,
        year: item.year,
        crit_product: item.product,
        crit_process: item.process,
        crit_safety: item.safety,
        crit_env: item.environment,
        pm_overall: item.pm_yn,
        pm_6monthly: item['6_monthly'],
        pm_yearly: item.yearly,
        pm_internal_external: item.internal_external,
        calib_yesno: item.y_n,
        calib_schedule: item.schedule,
        location: item.location,
        area: item.area,
        status: item.status || 'active',
        status_pm: '',
        status_calibration: ''
      }))

      return mappedData
    } catch (error) {
      console.error('[Daftar Alat API] Error fetchList:', error)
      return []
    }
  },

  /**
   * GET: Get tool by number
   */
  async getToolByNo(no) {
    try {
      const { data, error } = await supabase
        .from('daftaralat')
        .select('*')
        .eq('no', no)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('[Daftar Alat API] Error getToolByNo:', error)
      return null
    }
  },

  /**
   * UPSERT BATCH: Import banyak baris sekaligus
   * mode: 'upsert' = tambah+update, 'insert_only' = hanya data baru saja
   */
  async upsertBatch(tools, mode = 'upsert') {
    const noIds = tools.map(t => t.no_id).filter(Boolean)

    // Ambil semua data existing sekaligus untuk diff comparison
    const { data: existingRows } = await supabase
      .from('daftaralat')
      .select('no, no_id, description, type_model, sn, year, product, process, safety, environment, pm_yn, "6_monthly", yearly, internal_external, y_n, schedule, location, area')
      .in('no_id', noIds)

    const existingMap = {}
    ;(existingRows || []).forEach(r => { existingMap[r.no_id] = r })

    // Pisahkan berdasarkan mode
    const toInsert = tools.filter(t => !existingMap[t.no_id])
    const toUpdate = mode === 'insert_only'
      ? [] // mode insert_only: skip semua yang sudah ada
      : tools.filter(t => {
          if (!existingMap[t.no_id]) return false
          // Diff check: hanya update jika ada field yang berubah
          const ex = existingMap[t.no_id]
          return (
            (t.description || '') !== (ex.description || '') ||
            (t.type_model || '') !== (ex.type_model || '') ||
            (t.sn || '') !== (ex.sn || '') ||
            (t.year || '') !== (ex.year || '') ||
            (t.crit_product || '') !== (ex.product || '') ||
            (t.crit_process || '') !== (ex.process || '') ||
            (t.crit_safety || '') !== (ex.safety || '') ||
            (t.crit_env || '') !== (ex.environment || '') ||
            (t.pm_overall || '') !== (ex.pm_yn || '') ||
            (t.pm_6monthly || '') !== (ex['6_monthly'] || '') ||
            (t.pm_yearly || '') !== (ex.yearly || '') ||
            (t.pm_internal_external || '') !== (ex.internal_external || '') ||
            (t.calib_yesno || '') !== (ex.y_n || '') ||
            (t.calib_schedule || '') !== (ex.schedule || '') ||
            (t.area || '') !== (ex.area || '') ||
            (t.location || '') !== (ex.location || '')
          )
        })

    // Data yang tidak berubah (skip)
    const skipped = mode === 'insert_only'
      ? tools.filter(t => existingMap[t.no_id])
      : tools.filter(t => existingMap[t.no_id] && !toUpdate.find(u => u.no_id === t.no_id))

    // Ambil MAX(no) untuk insert baru
    let nextNo = 0
    if (toInsert.length > 0) {
      const { data: maxRow } = await supabase
        .from('daftaralat')
        .select('no')
        .order('no', { ascending: false })
        .limit(1)
        .single()
      nextNo = (maxRow?.no || 0) + 1
    }

    const buildToolData = (tool, preserveStatus = false) => {
      const data = {
        no_id: tool.no_id,
        description: tool.description,
        type_model: tool.type_model,
        sn: tool.sn,
        year: tool.year,
        product: tool.crit_product || tool.product,
        process: tool.crit_process || tool.process,
        safety: tool.crit_safety || tool.safety,
        environment: tool.crit_env || tool.environment,
        pm_yn: tool.pm_overall || tool.pm_yn,
        '6_monthly': tool.pm_6monthly || tool['6_monthly'],
        yearly: tool.pm_yearly || tool.yearly,
        internal_external: tool.pm_internal_external || tool.internal_external,
        y_n: tool.calib_yesno || tool.y_n,
        schedule: tool.calib_schedule || tool.schedule,
        area: tool.area || null,
        location: tool.location
      }
      // Hanya set status jika eksplisit ada nilainya dan bukan preserve mode
      // preserveStatus = true saat update via import (jangan overwrite status existing)
      if (!preserveStatus && tool.status) {
        data.status = tool.status
      }
      return data
    }

    const results = await Promise.allSettled([
      ...toUpdate.map(async (tool) => {
        const result = await supabase
          .from('daftaralat')
          .update(buildToolData(tool, true))  // preserveStatus: jangan overwrite status existing
          .eq('no', existingMap[tool.no_id].no)
          .select('no').single()
        if (result.error) throw new Error(result.error.message)
        return { action: 'updated', no_id: tool.no_id }
      }),
      ...toInsert.map(async (tool, i) => {
        const result = await supabase
          .from('daftaralat')
          .insert({ ...buildToolData(tool, false), no: nextNo + i })  // insert baru: status boleh di-set
          .select('no').single()
        if (result.error) throw new Error(result.error.message)
        return { action: 'inserted', no_id: tool.no_id }
      })
    ])

    if (toInsert.length > 0) {
      try { await supabase.rpc('reset_daftaralat_sequence') } catch {}
    }

    const processed = [...toUpdate, ...toInsert]
    const processedResults = results.map((r, i) => ({
      no_id: processed[i].no_id,
      success: r.status === 'fulfilled',
      action: r.status === 'fulfilled' ? r.value.action : null,
      error: r.status === 'rejected' ? r.reason?.message : null
    }))

    // Tambahkan skipped sebagai success dengan action 'skipped'
    const skippedResults = skipped.map(t => ({
      no_id: t.no_id,
      success: true,
      action: 'skipped',
      error: null
    }))

    return [...processedResults, ...skippedResults]
  },

  /**
   * UPSERT: Insert or update berdasarkan no_id (untuk import Excel)
   * Jika no_id sudah ada → update, jika belum → insert
   */
  async upsertByNoId(tool) {
    try {
      const toolData = {
        no_id: tool.no_id,
        description: tool.description,
        type_model: tool.type_model,
        sn: tool.sn,
        year: tool.year,
        product: tool.product || tool.crit_product,
        process: tool.process || tool.crit_process,
        safety: tool.safety || tool.crit_safety,
        environment: tool.environment || tool.crit_env,
        pm_yn: tool.pm_yn || tool.pm_overall,
        '6_monthly': tool['6_monthly'] || tool.pm_6monthly,
        yearly: tool.yearly || tool.pm_yearly,
        internal_external: tool.internal_external || tool.pm_internal_external,
        y_n: tool.y_n || tool.calib_yesno,
        schedule: tool.schedule || tool.calib_schedule,
        area: tool.area,
        location: tool.location,
        status: tool.status || null
      }

      // Cek apakah no_id sudah ada
      const { data: existing } = await supabase
        .from('daftaralat')
        .select('no')
        .eq('no_id', tool.no_id)
        .maybeSingle()

      let result
      if (existing) {
        result = await supabase
          .from('daftaralat')
          .update(toolData)
          .eq('no', existing.no)
          .select()
          .single()
      } else {
        result = await supabase
          .from('daftaralat')
          .insert([toolData])
          .select()
          .single()
      }

      if (result.error) throw result.error

      return {
        success: true,
        action: existing ? 'updated' : 'inserted',
        item: result.data
      }
    } catch (error) {
      throw new Error(error.message || 'Gagal upsert data alat')
    }
  },

  /**
   * POST: Save tool (create or update)
   */
  async saveTool(tool) {
    try {
      const toolData = {
        no_id: tool.no_id,
        description: tool.description,
        type_model: tool.type_model,
        sn: tool.sn,
        year: tool.year,
        product: tool.product || tool.crit_product,
        process: tool.process || tool.crit_process,
        safety: tool.safety || tool.crit_safety,
        environment: tool.environment || tool.crit_env,
        pm_yn: tool.pm_yn || tool.pm_overall,
        '6_monthly': tool['6_monthly'] || tool.pm_6monthly,
        yearly: tool.yearly || tool.pm_yearly,
        internal_external: tool.internal_external || tool.pm_internal_external,
        y_n: tool.y_n || tool.calib_yesno,
        schedule: tool.schedule || tool.calib_schedule,
        area: tool.area,
        location: tool.location,
        status: tool.status || null
      }

      let result

      if (tool.no) {
        // Update existing tool
        result = await supabase
          .from('daftaralat')
          .update(toolData)
          .eq('no', tool.no)
          .select()
          .single()
      } else {
        // Create new tool — cek duplikat no_id dulu
        const { data: existing } = await supabase
          .from('daftaralat')
          .select('no_id')
          .eq('no_id', tool.no_id)
          .maybeSingle()

        if (existing) {
          const err = new Error(`No.ID "${tool.no_id}" sudah ada di database. Gunakan No.ID yang berbeda atau edit data yang sudah ada.`)
          err.isDuplicate = true
          throw err
        }

        // Fetch MAX(no) untuk bypass sequence issue
        const { data: maxRow } = await supabase
          .from('daftaralat')
          .select('no')
          .order('no', { ascending: false })
          .limit(1)
          .single()
        const nextNo = (maxRow?.no || 0) + 1

        result = await supabase
          .from('daftaralat')
          .insert([{ ...toolData, no: nextNo }])
          .select()
          .single()
      }

      if (result.error) throw result.error

      return {
        success: true,
        message: tool.no ? 'Data alat berhasil diupdate' : 'Data alat berhasil dibuat',
        item: result.data
      }
    } catch (error) {
      console.error('[Daftar Alat API] Error saveTool:', error)
      throw new Error(error.message || 'Gagal menyimpan data alat')
    }
  },

  /**
   * DELETE: Delete tool by number
   */
  async deleteTool(no) {
    try {
      const { error } = await supabase
        .from('daftaralat')
        .delete()
        .eq('no', no)

      if (error) throw error

      return {
        success: true,
        message: 'Data alat berhasil dihapus'
      }
    } catch (error) {
      console.error('[Daftar Alat API] Error deleteTool:', error)
      throw new Error(error.message || 'Gagal menghapus data alat')
    }
  },

  /**
   * DELETE: Bulk delete tools by no (supports large payload via chunking)
   */
  async bulkDeleteTools(ids = [], chunkSize = 200) {
    try {
      const normalizedIds = [...new Set((ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id)))]

      if (normalizedIds.length === 0) {
        return {
          success: true,
          totalRequested: 0,
          deletedCount: 0,
          failedChunks: []
        }
      }

      let deletedCount = 0
      const failedChunks = []

      for (let i = 0; i < normalizedIds.length; i += chunkSize) {
        const chunkIds = normalizedIds.slice(i, i + chunkSize)

        const { error, count } = await supabase
          .from('daftaralat')
          .delete({ count: 'exact' })
          .in('no', chunkIds)

        if (error) {
          failedChunks.push({
            startIndex: i,
            size: chunkIds.length,
            error: error.message
          })
          continue
        }

        deletedCount += (count ?? chunkIds.length)
      }

      return {
        success: failedChunks.length === 0,
        totalRequested: normalizedIds.length,
        deletedCount,
        failedChunks
      }
    } catch (error) {
      console.error('[Daftar Alat API] Error bulkDeleteTools:', error)
      throw new Error(error.message || 'Gagal menghapus data alat secara massal')
    }
  }
}
