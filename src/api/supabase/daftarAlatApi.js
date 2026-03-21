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
        location: tool.location
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
        // Create new tool
        result = await supabase
          .from('daftaralat')
          .insert([toolData])
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
  }
}
