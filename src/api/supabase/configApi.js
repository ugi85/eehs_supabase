// src/api/supabase/configApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * Config API - Supabase Integration
 * Table: config
 * Columns: id (int8), deskripsi (text), value (text)
 */
export const configApi = {
  /**
   * GET: Get config from Supabase
   */
  async getConfig() {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('*')

      if (error) throw error

      // Convert array of {deskripsi, value} to single object
      const configData = {}
      data.forEach(item => {
        configData[item.deskripsi] = item.value
      })

      console.log('[Config API] Config loaded:', configData)

      return configData
    } catch (error) {
      console.error('[Config API] Error getConfig:', error)
      return handleSupabaseError(error)
    }
  },

  /**
   * SET: Save config to Supabase
   * Note: If you have added unique constraint on 'deskripsi' column,
   * you can use the simpler upsert method (see commented code below)
   */
  async setConfig(configData) {
    try {
      // Convert object to array of {deskripsi, value} for upsert
      const configArray = Object.entries(configData).map(([deskripsi, value]) => ({
        deskripsi,
        value
      }))

      // Method 1: Manual check and update/insert (works without unique constraint)
      for (const item of configArray) {
        // Check if record exists
        const { data: existing, error: selectError } = await supabase
          .from('config')
          .select('id')
          .eq('deskripsi', item.deskripsi)
          .single()

        if (selectError && selectError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine
          throw selectError
        }

        if (existing) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('config')
            .update({ value: item.value })
            .eq('deskripsi', item.deskripsi)

          if (updateError) throw updateError
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('config')
            .insert({ deskripsi: item.deskripsi, value: item.value })

          if (insertError) throw insertError
        }
      }

      /* Method 2: Use upsert (requires unique constraint on 'deskripsi')
       * Run supabase-config-constraint.sql first, then uncomment this:
       * 
       * const { error } = await supabase
       *   .from('config')
       *   .upsert(configArray, { onConflict: 'deskripsi' })
       * 
       * if (error) throw error
       */

      return {
        success: true,
        message: 'Konfigurasi berhasil disimpan',
        data: configData
      }
    } catch (error) {
      console.error('[Config API] Error setConfig:', error)
      return handleSupabaseError(error)
    }
  },

  /**
   * UPLOAD: Upload logo (save base64 to config)
   */
  async uploadLogo(file, deskripsi = 'logo sistem') {
    return new Promise((resolve, reject) => {
      // Validasi
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('File harus berupa gambar (PNG, JPG, SVG)'))
        return
      }

      // No size limit check - we compress on client side

      // Convert ke base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        try {
          const base64 = reader.result

          console.log('[Config API] Uploading logo:', file.name)
          console.log('[Config API] Deskripsi:', deskripsi)

          // Save base64 ke Supabase config table
          const saveData = {
            [deskripsi]: base64
          }
          
          // Update favicon jika yang diupload adalah logo sistem
          if (deskripsi === 'logo sistem') {
            saveData['favicon'] = base64
          }

          const result = await this.setConfig(saveData)

          if (!result.success) {
            throw new Error(result.message)
          }

          resolve({
            success: true,
            message: 'Logo berhasil diupload',
            data: {
              fileUrl: base64,
              fileName: file.name,
              mimeType: file.type
            }
          })
        } catch (error) {
          console.error('[Config API] Upload error:', error)
          reject(error)
        }
      }
      reader.onerror = reject
    })
  },

  /**
   * DELETE: Delete logo
   */
  async deleteLogo(deskripsi = 'logo sistem') {
    const deleteData = {
      [deskripsi]: ''
    }
    
    // Also delete favicon if deleting logo sistem
    if (deskripsi === 'logo sistem') {
      deleteData['favicon'] = ''
    }
    
    return this.setConfig(deleteData)
  }
}
