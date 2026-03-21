// src/api/configApi.js
import { useSettingsStore } from '@/stores/settings'

/**
 * Config API - Google Apps Script Integration
 * Optimized for EEHS QMS API v2.1.0
 */

export const configApi = {
  /**
   * GET Config dari Google Sheets
   */
  async getConfig() {
    const settingsStore = useSettingsStore()
    const url = settingsStore.api.config

    try {
      console.log('[Config API] Fetching config from:', url)
      
      const response = await fetch(`${url}?action=getConfig`, {
        method: 'GET',
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log('[Config API] Raw response:', text.substring(0, 500) + '...')

      const result = JSON.parse(text)
      console.log('[Config API] Parsed result:', result)

      if (!result.success) {
        throw new Error(result.message || 'Gagal mengambil konfigurasi')
      }

      // Handle nested response: result.data.data
      let configData = result.data || {}
      if (result.data?.data) {
        configData = result.data.data
        console.log('[Config API] Using nested data:', configData)
      }

      return configData
    } catch (error) {
      console.error('[Config API] Error getConfig:', error)
      throw error
    }
  },

  /**
   * SET Config ke Google Sheets
   */
  async setConfig(configData) {
    const settingsStore = useSettingsStore()
    const url = settingsStore.api.config

    try {
      const timestamp = Date.now()
      const fullUrl = `${url}?action=setConfig&t=${timestamp}`

      await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: JSON.stringify({ data: configData }),
        mode: 'no-cors'
      })

      return {
        success: true,
        message: 'Konfigurasi berhasil disimpan',
        data: configData
      }
    } catch (error) {
      console.error('[Config API] Error setConfig:', error)
      throw error
    }
  },

  /**
   * UPLOAD Logo - Save base64 langsung ke Google Sheets
   */
  async uploadLogo(file, deskripsi = 'logo sistem') {
    return new Promise((resolve, reject) => {
      // Validasi
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('File harus berupa gambar (PNG, JPG, SVG)'))
        return
      }

      if (file.size > 100 * 1024) {
        reject(new Error('Ukuran file maksimal 100KB'))
        return
      }

      // Convert ke base64
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        try {
          const base64 = reader.result
          const settingsStore = useSettingsStore()
          const url = settingsStore.api.config
          const timestamp = Date.now()

          console.log('[Config API] Uploading logo:', file.name)
          console.log('[Config API] Deskripsi:', deskripsi)

          // Save base64 ke Google Sheets - HANYA field yang sesuai
          const saveData = {
            [deskripsi]: base64
          }
          
          // Hanya update favicon jika yang diupload adalah logo sistem
          if (deskripsi === 'logo sistem') {
            saveData['favicon'] = base64
          }

          const response = await fetch(`${url}?t=${timestamp}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=UTF-8'
            },
            body: JSON.stringify({
              action: 'setConfig',
              data: saveData
            }),
            mode: 'no-cors'
          })

          console.log('[Config API] Save response status:', response.status)
          console.log('[Config API] Data saved:', saveData)
          console.log('[Config API] Logo saved to Google Sheets')

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
   * DELETE Logo
   */
  async deleteLogo(deskripsi = 'logo sistem') {
    return this.setConfig({
      [deskripsi]: '',
      'favicon': ''
    })
  }
}
