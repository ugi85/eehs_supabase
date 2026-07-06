// src/composables/useConfig.js
import { ref, computed } from 'vue'
import { configApi } from '@/api'
import { useSettingsStore } from '@/stores/settings'

// ✅ DEFAULT CONFIG
const DEFAULT_CONFIG = {
  systemName: 'EeHS Board',
  systemVersion: '1.0',
  companyName: 'PT Anugrah Amartha Global',
  addressLine1: 'Jl. Raya Industri No. 123',
  addressLine2: 'Kawasan Industri MM2100',
  city: 'Cikarang Barat',
  postalCode: '17520',
  province: 'Bekasi',
  country: 'Indonesia',
  phone: '(021) 897-1234',
  email: 'info@agis.co.id',

  // ✅ 2 JENIS NO. REFERENSI
  documentRefEquipment: 'AGIS-WI-ENG-001-LD1_v5.0',
  documentRefCalibration: 'AGIS-WI-ENG-016-LD1_v5.0',

  logoUrl: '',
  faviconUrl: '',
  logoDataUrl: '',
  faviconDataUrl: '',
  print: {
    orientation: 'landscape',
    margin: '10mm',
    headerHeight: '30mm',
    showLogo: true,
    showAddress: true,
    showDocumentRef: true,
    fontFamily: 'Arial, sans-serif'
  },
  lastUpdated: null
}

const CONFIG_KEY = 'qms_frontend_config_v2'

// Auto-refresh interval (dalam milliseconds)
const AUTO_REFRESH_INTERVAL = 30000 // 30 detik

// singleton reactive state
const config = ref({ ...DEFAULT_CONFIG })
const isSaving = ref(false)
const previewLogo = ref(null)
const isLoading = ref(false)
let refreshInterval = null

// ✅ Mapping key dari Supabase (deskripsi) ke format config frontend
const SUPABASE_TO_FRONTEND_MAPPING = {
  'nama sistem': 'systemName',
  'versi sistem': 'systemVersion',
  'nama perusahaan': 'companyName',
  'noref daftaralat': 'documentRefEquipment',
  'noref kalibrasi': 'documentRefCalibration',
  'logo sistem': 'logoUrl',
  'logo perusahaan': 'logoPerusahaanUrl',
  'favicon': 'faviconUrl'
}

// ✅ Mapping dari frontend ke Supabase
const FRONTEND_TO_SUPABASE_MAPPING = {}
Object.keys(SUPABASE_TO_FRONTEND_MAPPING).forEach(supabaseKey => {
  FRONTEND_TO_SUPABASE_MAPPING[SUPABASE_TO_FRONTEND_MAPPING[supabaseKey]] = supabaseKey
})

// ✅ Transform data dari Supabase ke format frontend
function transformSupabaseToFrontend(supabaseData) {
  const frontendData = {}
  
  Object.keys(SUPABASE_TO_FRONTEND_MAPPING).forEach(supabaseKey => {
    const frontendKey = SUPABASE_TO_FRONTEND_MAPPING[supabaseKey]
    if (supabaseData[supabaseKey] !== undefined) {
      frontendData[frontendKey] = supabaseData[supabaseKey]
    }
  })
  
  return frontendData
}

// ✅ Transform data dari frontend ke format Supabase
function transformFrontendToSupabase(frontendData) {
  const supabaseData = {}
  
  Object.keys(FRONTEND_TO_SUPABASE_MAPPING).forEach(frontendKey => {
    const supabaseKey = FRONTEND_TO_SUPABASE_MAPPING[frontendKey]
    if (frontendData[frontendKey] !== undefined) {
      supabaseData[supabaseKey] = frontendData[frontendKey]
    }
  })
  
  return supabaseData
}

// ✅ Load config dari Supabase
const loadConfig = async (silent = false) => {


  const settings = useSettingsStore()
  if (settings.isUsingGoogleSheets) {
    console.log('[useConfig] Mode Google Sheets aktif, memuat dari fallback lokal...')
    return loadFromLocalStorage(silent)
  }
  

    if (!silent) {

    isLoading.value = true
    }
    
    try {
        if (!silent) {
      console.log('[useConfig] Loading config from Supabase...')
        }

    // Load dari API
    const supabaseData = await configApi.getConfig()

    if (!silent) {
      console.log('[useConfig] Raw data from Supabase:', supabaseData)
      console.log('[useConfig] logo sistem dari Supabase:', supabaseData['logo sistem'])
      console.log('[useConfig] favicon dari Supabase:', supabaseData['favicon'])
    }

    // Transform ke format frontend
    const frontendConfig = transformSupabaseToFrontend(supabaseData)

    if (!silent) {
      console.log('[useConfig] Transformed config:', frontendConfig)
      console.log('[useConfig] logoUrl setelah transform:', frontendConfig.logoUrl)
    }
    
    // Cek apakah ada perubahan
    const hasChanges = JSON.stringify(config.value) !== JSON.stringify({ ...DEFAULT_CONFIG, ...frontendConfig })
    
    config.value = { ...DEFAULT_CONFIG, ...frontendConfig }
    
    if (!silent) {
      console.log('[useConfig] Final config:', config.value)
      console.log('[useConfig] Final logoUrl:', config.value.logoUrl ? 'ADA' : 'KOSONG')
      console.log('[useConfig] Has changes:', hasChanges)
    }

    // Set preview logo
    const logoValue = config.value.logoUrl || config.value.logoDataUrl
    if (logoValue) {
      previewLogo.value = logoValue
      if (!silent) {
        console.log('[useConfig] Logo loaded, length:', logoValue.length)
        console.log('[useConfig] Logo preview:', logoValue.substring(0, 50) + '...')
      }
      updateFavicon(logoValue)
    } else {
      if (!silent) {
        console.log('[useConfig] No logo found in config!')
      }
    }
    
    // Update title
    if (config.value.systemName) {
      updateTitle(config.value.systemName)
    }

    // Backup to localStorage
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
    if (!silent) {
      console.log('[useConfig] Config backed up to localStorage')
    }
    
    return hasChanges
  } catch (error) {
    console.error('[useConfig] Error loading config from Supabase:', error)



























    return loadFromLocalStorage(silent)
  } finally {
    if (!silent) {
      isLoading.value = false


  }
}
}

// Helper untuk load dari local storage
const loadFromLocalStorage = (silent) => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      config.value = { ...DEFAULT_CONFIG, ...parsed }
      if (!silent) console.log('[useConfig] Loaded from localStorage fallback')
    } else {
        config.value = { ...DEFAULT_CONFIG }
    }
  } catch (localError) {
    config.value = { ...DEFAULT_CONFIG }
  }
  return false
}

// ✅ Start auto-refresh config
const startAutoRefresh = () => {
  if (refreshInterval) {
    return
  }
  
  // Set interval lebih panjang (misal 5 menit) agar tidak spamming dan flicker
  refreshInterval = setInterval(async () => {



    const settings = useSettingsStore()
    if (settings.isUsingSupabase) {
      await loadConfig(true)
    }
  }, 300000) // 300 detik = 5 menit
}

// ✅ Stop auto-refresh
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
    console.log('[useConfig] Auto-refresh stopped')
  }
}

// ✅ Manual refresh
const refreshConfig = async () => {
  console.log('[useConfig] Manual refresh triggered')
  return await loadConfig(false)
}

// ✅ Save config ke Supabase
const saveConfig = async () => {
  const settings = useSettingsStore()
  if (settings.isUsingGoogleSheets) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
    return true
  }

  isSaving.value = true
  try {
    config.value.lastUpdated = new Date().toISOString()

    // Update previewLogo
    if (config.value.logoUrl || config.value.logoDataUrl) {
      previewLogo.value = config.value.logoUrl || config.value.logoDataUrl
    }

    // Transform config ke format Supabase
    const supabaseData = transformFrontendToSupabase(config.value)

    // Save via API
    const result = await configApi.setConfig(supabaseData)

    // Update favicon
    if (config.value.faviconUrl || config.value.faviconDataUrl) {
      updateFavicon(config.value.faviconUrl || config.value.faviconDataUrl)
    }
    
    // Update title
    if (config.value.systemName) {
      updateTitle(config.value.systemName)
    }

    // Backup to localStorage
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))

    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: result.message || 'Konfigurasi sistem berhasil disimpan',
        timer: 1500,
        showConfirmButton: false
      })
    }
    return true
  } catch (e) {
    console.error('Gagal simpan config:', e)
    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Gagal Simpan!',
        text: e.message || 'Terjadi kesalahan saat menyimpan konfigurasi',
        confirmButtonText: 'OK'
      })
    }
    return false
  } finally {
    isSaving.value = false
  }
}

// ✅ Upload logo ke Supabase (as base64)
const uploadLogo = async (file, deskripsi = 'logo sistem') => {
  try {
    console.log('[useConfig] Uploading logo:', file.name, 'as', deskripsi)
    
    const result = await configApi.uploadLogo(file, deskripsi)
    const fileUrl = result.data.fileUrl // base64 string

    console.log('[useConfig] Logo uploaded successfully')
    console.log('[useConfig] Base64 length:', fileUrl.length)

    // Update config HANYA field yang sesuai dengan deskripsi
    if (deskripsi === 'logo sistem') {
      config.value.logoUrl = fileUrl
      config.value.logoDataUrl = fileUrl
      previewLogo.value = fileUrl
      
      // Generate favicon hanya untuk logo sistem
      generateFaviconFromImage(fileUrl)
      config.value.faviconUrl = fileUrl
      config.value.faviconDataUrl = fileUrl
      
      console.log('[useConfig] Logo sistem & favicon updated')
    } else if (deskripsi === 'logo perusahaan') {
      config.value.logoPerusahaanUrl = fileUrl
      config.value.logoPerusahaanDataUrl = fileUrl
      console.log('[useConfig] Logo perusahaan updated')
    }

    // Save to Supabase immediately
    await saveConfig()

    return {
      logoUrl: fileUrl,
      faviconUrl: config.value.faviconUrl || fileUrl
    }
  } catch (error) {
    console.error('[useConfig] Error uploading logo:', error)
    throw error
  }
}

// ✅ Delete logo
const deleteLogo = async (deskripsi = 'logo sistem') => {
  try {
    console.log('[useConfig] Deleting logo:', deskripsi)
    
    // Update config values
    if (deskripsi === 'logo sistem') {
      config.value.logoUrl = null
      config.value.faviconUrl = null
      config.value.logoDataUrl = null
      config.value.faviconDataUrl = null
      previewLogo.value = null
      updateFavicon('/favicon.ico')
    } else if (deskripsi === 'logo perusahaan') {
      config.value.logoPerusahaanUrl = null
      config.value.logoPerusahaanDataUrl = null
    }

    // Delete from Supabase
    await configApi.deleteLogo(deskripsi)
    
    // Save config
    await saveConfig()

    return true
  } catch (error) {
    console.error('[useConfig] Error deleting logo:', error)
    throw error
  }
}

// ✅ Update logo (helper)
const updateLogo = (logoDataUrl) => {
  config.value.logoDataUrl = logoDataUrl
  if (logoDataUrl) {
    previewLogo.value = logoDataUrl
    generateFaviconFromImage(logoDataUrl)
  }
}

// ✅ Generate favicon from image
const generateFaviconFromImage = (dataUrl) => {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, 32, 32)
    const faviconDataUrl = canvas.toDataURL('image/png')
    config.value.faviconDataUrl = faviconDataUrl
    updateFavicon(faviconDataUrl)
  }
  img.src = dataUrl
}

// ✅ Update favicon di browser
const updateFavicon = (url) => {
  if (!url) return

  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    document.head.appendChild(link)
  }

  // ✅ PENTING: Hanya update jika href-nya berbeda agar tidak flicker/reload terus
  if (link.href !== url) {
    link.href = url
  console.log('Favicon updated:', url)
}
}

// ✅ Update title di browser
const updateTitle = (title) => {
  if (!title) return
  document.title = title
  console.log('Title updated:', title)
}

// ✅ Reset config
const resetConfig = async () => {
  if (typeof window !== 'undefined' && window.Swal) {
    window.Swal.fire({
      title: 'Reset Konfigurasi?',
      text: 'Semua pengaturan akan dikembalikan ke nilai default.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Reset!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        config.value = { ...DEFAULT_CONFIG }
        previewLogo.value = null

        localStorage.removeItem(CONFIG_KEY)
        updateFavicon('/favicon.ico')
        await saveConfig()
      }
    })
  }
}

const getLogoUrl = computed(() => {
  return config.value.logoUrl || config.value.logoDataUrl || '/logo/agis-logo.png'
})

const getFullAddress = computed(() => {
  const parts = [
    config.value.addressLine1,
    config.value.addressLine2,
    `${config.value.city}, ${config.value.province} ${config.value.postalCode}`,
    config.value.country
  ].filter(Boolean)
  return parts.join('<br>')
})

// Initialize on module load
if (typeof window !== 'undefined') {
  loadConfig()
  startAutoRefresh() // Start auto-refresh
}

export function useFrontendConfig() {
  return {
    // State
    config,
    isSaving,
    previewLogo,
    isLoading,

    // Computed
    getLogoUrl,
    getFullAddress,

    // Actions
    saveConfig,
    uploadLogo,
    deleteLogo,
    resetConfig,
    loadConfig,
    refreshConfig,      // NEW: Manual refresh
    startAutoRefresh,   // NEW: Start auto-refresh
    stopAutoRefresh,    // NEW: Stop auto-refresh
    updateLogo,
    updateFavicon,
    updateTitle
  }
}

