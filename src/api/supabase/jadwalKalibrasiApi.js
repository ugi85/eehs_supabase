// src/api/supabase/jadwalKalibrasiApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Jadwal Kalibrasi API - Supabase Integration
 * Table: kalibrasi
 * Columns: no, no_id, description, calibration_id, parameter, process_range, 
 *          reject_error_limit, int, due_date, remark, criticality
 */

// Helper untuk fix encoding simbol khusus
const fixEncoding = (text) => {
  if (!text) return text
  
  let fixed = String(text)
  
  // Fix degree symbol (°C, °F) - harus dicek dulu sebelum plus-minus
  fixed = fixed
    .replace(/�\s*C/gi, '°C')
    .replace(/�C/gi, '°C')
    .replace(/�\s*F/gi, '°F')
    .replace(/�F/gi, '°F')
    .replace(/\?\s*C/gi, '°C')
    .replace(/\?C/gi, '°C')
    .replace(/\?\s*F/gi, '°F')
    .replace(/\?F/gi, '°F')
  
  // Fix plus-minus symbol (± angka)
  fixed = fixed
    .replace(/�\s*\d/g, (match) => match.replace('�', '±'))
    .replace(/\?\s*\d/g, (match) => match.replace('?', '±'))
  
  // HTML entities
  fixed = fixed
    .replace(/&plusmn;/g, '±')
    .replace(/&#177;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&#176;/g, '°')
    .replace(/&micro;/g, 'µ')
    .replace(/&#181;/g, 'µ')
  
  return fixed
}

export const jadwalKalibrasiApi = {
  /**
   * GET: Fetch all jadwal kalibrasi (excludes obsolete equipment)
   */
  async fetchList() {
    try {
      // Fetch kalibrasi data
      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .order('no', { ascending: true })

      if (error) throw error

      // Fetch obsolete no_ids to filter out
      const { data: obsoleteData } = await supabase
        .from('daftaralat')
        .select('no_id')
        .eq('status', 'obsolete')

      const obsoleteIds = new Set((obsoleteData || []).map(d => d.no_id))

      // Map and filter out obsolete equipment
      const mappedData = (data || [])
        .filter(item => !obsoleteIds.has(item.no_id))
        .map(item => ({
          no: item.no,
          no_id: item.no_id,
          description: item.description,
          cal_id: item.calibration_id,
          parameter: item.parameter,
          process_range: fixEncoding(item.process_range),
          reject_error: fixEncoding(item.reject_error_limit),
          interval: item.int,
          due_date: item.due_date,
          remark: item.remark,
          criticality: item.criticality
        }))

      return {
        success: true,
        data: mappedData
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Get kalibrasi by ID
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .eq('no', id)
        .single()

      if (error) throw error

      return {
        success: true,
        data
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Get kalibrasi by no_id (equipment ID)
   */
  async getByNoId(no_id) {
    try {
      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .eq('no_id', no_id)

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Get kalibrasi by calibration_id
   */
  async getByCalibrationId(calibration_id) {
    try {
      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .eq('calibration_id', calibration_id)
        .single()

      if (error) throw error

      return {
        success: true,
        data
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * UPSERT BATCH: Import banyak baris sekaligus
   * mode: 'upsert' = tambah+update, 'insert_only' = hanya data baru saja
   */
  async upsertBatch(jadwals, mode = 'upsert') {
    const calIds = jadwals.map(j => j.cal_id).filter(Boolean)

    const existingMap = {}
    if (calIds.length) {
      const { data: existingRows } = await supabase
        .from('kalibrasi')
        .select('no, calibration_id, no_id, description, parameter, process_range, reject_error_limit, int, due_date, remark, criticality')
        .in('calibration_id', calIds)
      ;(existingRows || []).forEach(r => { existingMap[r.calibration_id] = r })
    }

    const toInsert = jadwals.filter(j => !existingMap[j.cal_id])
    const toUpdate = mode === 'insert_only'
      ? []
      : jadwals.filter(j => {
          if (!existingMap[j.cal_id]) return false
          const ex = existingMap[j.cal_id]
          return (
            (j.no_id || '') !== (ex.no_id || '') ||
            (j.description || '') !== (ex.description || '') ||
            (j.parameter || '') !== (ex.parameter || '') ||
            (j.process_range || '') !== (ex.process_range || '') ||
            (j.reject_error || '') !== (ex.reject_error_limit || '') ||
            (j.interval || '') !== (String(ex.int) || '') ||
            (j.due_date || '') !== (ex.due_date || '') ||
            (j.remark || '') !== (ex.remark || '') ||
            (j.criticality || '') !== (ex.criticality || '')
          )
        })

    const skipped = mode === 'insert_only'
      ? jadwals.filter(j => existingMap[j.cal_id])
      : jadwals.filter(j => existingMap[j.cal_id] && !toUpdate.find(u => u.cal_id === j.cal_id))

    const buildData = (jadwal) => ({
      no_id: jadwal.no_id,
      description: jadwal.description,
      calibration_id: jadwal.cal_id,
      parameter: jadwal.parameter,
      process_range: jadwal.process_range,
      reject_error_limit: jadwal.reject_error,
      int: jadwal.interval,
      due_date: jadwal.due_date,
      remark: jadwal.remark,
      criticality: jadwal.criticality
    })

    // Fetch MAX(no) untuk assign manual ke data baru (bypass sequence issue)
    let nextNo = 0
    if (toInsert.length > 0) {
      const { data: maxRow } = await supabase
        .from('kalibrasi')
        .select('no')
        .order('no', { ascending: false })
        .limit(1)
        .single()
      nextNo = (maxRow?.no || 0) + 1
    }

    const results = await Promise.allSettled([
      ...toUpdate.map(async (jadwal) => {
        const result = await supabase.from('kalibrasi').update(buildData(jadwal)).eq('no', existingMap[jadwal.cal_id].no).select().single()
        if (result.error) throw new Error(result.error.message)
        return { action: 'updated', no_id: jadwal.no_id }
      }),
      ...toInsert.map(async (jadwal, i) => {
        const result = await supabase.from('kalibrasi').insert([{ ...buildData(jadwal), no: nextNo + i }]).select().single()
        if (result.error) throw new Error(result.error.message)
        return { action: 'inserted', no_id: jadwal.no_id }
      })
    ])

    const processed = [...toUpdate, ...toInsert]
    const processedResults = results.map((r, i) => ({
      no_id: processed[i].no_id,
      success: r.status === 'fulfilled',
      action: r.status === 'fulfilled' ? r.value.action : null,
      error: r.status === 'rejected' ? r.reason?.message : null
    }))

    const skippedResults = skipped.map(j => ({
      no_id: j.no_id,
      success: true,
      action: 'skipped',
      error: null
    }))

    return [...processedResults, ...skippedResults]
  },

  /**
   * UPSERT: Insert or update berdasarkan calibration_id (untuk import Excel)
   */
  async upsertByCalId(jadwal) {
    try {
      const jadwalData = {
        no_id: jadwal.no_id,
        description: jadwal.description,
        calibration_id: jadwal.cal_id,
        parameter: jadwal.parameter,
        process_range: jadwal.process_range,
        reject_error_limit: jadwal.reject_error,
        int: jadwal.interval,
        due_date: jadwal.due_date,
        remark: jadwal.remark,
        criticality: jadwal.criticality
      }

      // Cek apakah calibration_id sudah ada (jika ada cal_id)
      let existing = null
      if (jadwal.cal_id) {
        const { data } = await supabase
          .from('kalibrasi')
          .select('no')
          .eq('calibration_id', jadwal.cal_id)
          .maybeSingle()
        existing = data
      }

      let result
      if (existing) {
        result = await supabase
          .from('kalibrasi')
          .update(jadwalData)
          .eq('no', existing.no)
          .select()
          .single()
      } else {
        result = await supabase
          .from('kalibrasi')
          .insert([jadwalData])
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
      throw new Error(error.message || 'Gagal upsert jadwal kalibrasi')
    }
  },

  /**
   * POST: Create jadwal kalibrasi
   */
  async create(jadwal) {
    try {
      const jadwalData = {
        no_id: jadwal.no_id,
        description: jadwal.description,
        calibration_id: jadwal.cal_id,
        parameter: jadwal.parameter,
        process_range: jadwal.process_range,
        reject_error_limit: jadwal.reject_error,
        int: jadwal.interval,
        due_date: jadwal.due_date,
        remark: jadwal.remark,
        criticality: jadwal.criticality
      }

      // Cek duplikat calibration_id
      if (jadwal.cal_id) {
        const { data: existing } = await supabase
          .from('kalibrasi')
          .select('calibration_id')
          .eq('calibration_id', jadwal.cal_id)
          .maybeSingle()

        if (existing) {
          const err = new Error(`Calibration ID "${jadwal.cal_id}" sudah ada di database. Gunakan ID yang berbeda atau edit data yang sudah ada.`)
          err.isDuplicate = true
          throw err
        }
      }

      // Fetch MAX(no) untuk bypass sequence issue
      const { data: maxRow } = await supabase
        .from('kalibrasi')
        .select('no')
        .order('no', { ascending: false })
        .limit(1)
        .single()
      const nextNo = (maxRow?.no || 0) + 1

      const { data, error } = await supabase
        .from('kalibrasi')
        .insert([{ ...jadwalData, no: nextNo }])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Jadwal kalibrasi berhasil dibuat',
        data: {
          no: data.no,
          no_id: data.no_id,
          description: data.description,
          cal_id: data.calibration_id,
          parameter: data.parameter,
          process_range: fixEncoding(data.process_range),
          reject_error: fixEncoding(data.reject_error_limit),
          interval: data.int,
          due_date: data.due_date,
          remark: data.remark,
          criticality: data.criticality
        }
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * PUT: Update jadwal kalibrasi
   */
  async update(no, jadwal) {
    try {
      const jadwalData = {
        no_id: jadwal.no_id,
        description: jadwal.description,
        calibration_id: jadwal.cal_id,
        parameter: jadwal.parameter,
        process_range: jadwal.process_range,
        reject_error_limit: jadwal.reject_error,
        int: jadwal.interval,
        due_date: jadwal.due_date,
        remark: jadwal.remark,
        criticality: jadwal.criticality
      }

      const { data, error } = await supabase
        .from('kalibrasi')
        .update(jadwalData)
        .eq('no', no)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Jadwal kalibrasi berhasil diupdate',
        data: {
          no: data.no,
          no_id: data.no_id,
          description: data.description,
          cal_id: data.calibration_id,
          parameter: data.parameter,
          process_range: fixEncoding(data.process_range),
          reject_error: fixEncoding(data.reject_error_limit),
          interval: data.int,
          due_date: data.due_date,
          remark: data.remark,
          criticality: data.criticality
        }
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * DELETE: Delete jadwal kalibrasi
   */
  async delete(no) {
    try {
      const { error } = await supabase
        .from('kalibrasi')
        .delete()
        .eq('no', no)

      if (error) throw error

      return {
        success: true,
        message: 'Jadwal kalibrasi berhasil dihapus'
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Filter by due date (upcoming calibrations)
   */
  async getUpcoming(months = 3) {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + months)

      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true })

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Filter by criticality
   */
  async getByCriticality(criticality) {
    try {
      const { data, error } = await supabase
        .from('kalibrasi')
        .select('*')
        .eq('criticality', criticality)
        .order('due_date', { ascending: true })

      if (error) throw error

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  }
}
