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

// ✅ Mapping key dari Google Sheet ke format config frontend
const SHEET_TO_FRONTEND_MAPPING = {
  'nama sistem': 'systemName',
  'versi sistem': 'systemVersion',
  'nama perusahaan': 'companyName',
  'noref daftaralat': 'documentRefEquipment',
  'noref kalibrasi': 'documentRefCalibration',
  'logo sistem': 'logoUrl',
  'logo perusahaan': 'logoPerusahaanUrl',
  'favicon': 'faviconUrl'
}

// ✅ Mapping dari frontend ke Google Sheet
const FRONTEND_TO_SHEET_MAPPING = {}
Object.keys(SHEET_TO_FRONTEND_MAPPING).forEach(sheetKey => {
  FRONTEND_TO_SHEET_MAPPING[SHEET_TO_FRONTEND_MAPPING[sheetKey]] = sheetKey
})

// ✅ Transform data dari sheet ke format frontend
function transformSheetToFrontend(sheetData) {
  const frontendData = {}
  
  Object.keys(SHEET_TO_FRONTEND_MAPPING).forEach(sheetKey => {
    const frontendKey = SHEET_TO_FRONTEND_MAPPING[sheetKey]
    if (sheetData[sheetKey] !== undefined) {
      frontendData[frontendKey] = sheetData[sheetKey]
    }
  })
  
  return frontendData
}

// ✅ Transform data dari frontend ke format sheet
function transformFrontendToSheet(frontendData) {
  const sheetData = {}
  
  Object.keys(FRONTEND_TO_SHEET_MAPPING).forEach(frontendKey => {
    const sheetKey = FRONTEND_TO_SHEET_MAPPING[frontendKey]
    if (frontendData[frontendKey] !== undefined) {
      sheetData[sheetKey] = frontendData[frontendKey]
    }
  })
  
  return sheetData
}

// ✅ Load config dari Google Sheets
const loadConfig = async (silent = false) => {
    if (!silent) {
    isLoading.value = true
    }
    
    try {
    if (!silent) console.log('[useConfig] Loading config from Google Sheets...')
    // Load dari API
    const sheetData = await configApi.getConfig()

    // Transform ke format frontend
    const frontendConfig = transformSheetToFrontend(sheetData)

    // Cek apakah ada perubahan
    const hasChanges = JSON.stringify(config.value) !== JSON.stringify({ ...DEFAULT_CONFIG, ...frontendConfig })
    
    config.value = { ...DEFAULT_CONFIG, ...frontendConfig }
    
    // Set preview logo
    const logoValue = config.value.logoUrl || config.value.logoDataUrl
    if (logoValue) {
      previewLogo.value = logoValue
      updateFavicon(logoValue)
      }
    // Update title
    if (config.value.systemName) updateTitle(config.value.systemName)
    // Backup to localStorage
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
    return hasChanges
  } catch (error) {
    console.error('[useConfig] Error loading config from Sheets:', error)
    return loadFromLocalStorage(silent)
  } finally {
    if (!silent) isLoading.value = false
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
  
  // Set interval lebih panjang (misal 30 menit) agar tidak spamming dan flicker
  refreshInterval = setInterval(async () => {
      await loadConfig(true)
  }, AUTO_REFRESH_INTERVAL)
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

// ✅ Save config ke Google Sheets
const saveConfig = async () => {
  isSaving.value = true
  try {
    config.value.lastUpdated = new Date().toISOString()

    // Transform config ke format sheet
    const sheetData = transformFrontendToSheet(config.value)
    // Save via API
    const result = await configApi.setConfig(sheetData)

    // Backup to localStorage
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))

    if (typeof window !== 'undefined' && window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Konfigurasi berhasil disimpan ke Google Sheets',
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
        text: e.message || 'Terjadi kesalahan pada Google Sheets',
        confirmButtonText: 'OK'
      })
    }
    return false
  } finally {
    isSaving.value = false
  }
}

// ✅ Upload logo ke Google Sheets
const uploadLogo = async (file, deskripsi = 'logo sistem') => {
  try {
    const result = await configApi.uploadLogo(file, deskripsi)
    const fileUrl = result.data.fileUrl

    if (deskripsi === 'logo sistem') {
      config.value.logoUrl = fileUrl
      previewLogo.value = fileUrl
      generateFaviconFromImage(fileUrl)
    } else if (deskripsi === 'logo perusahaan') {
      config.value.logoPerusahaanUrl = fileUrl
    }

    await saveConfig()
    return { logoUrl: fileUrl }
  } catch (error) {
    throw error
  }
}

// ✅ Delete logo
const deleteLogo = async (deskripsi = 'logo sistem') => {
  try {
    if (deskripsi === 'logo sistem') {
      config.value.logoUrl = null
      previewLogo.value = null
      updateFavicon('/favicon.ico')
    } else if (deskripsi === 'logo perusahaan') {
      config.value.logoPerusahaanUrl = null
    }

    await configApi.deleteLogo(deskripsi)
    await saveConfig()
    return true
  } catch (error) {
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
  const url = config.value.logoUrl || config.value.logoDataUrl || '/logo/agis-logo.png'
  // Tambahkan timestamp agar browser melakukan reload gambar jika terjadi perubahan
  return url + (url.startsWith('http') ? `?t=${Date.now()}` : '')
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
  // Tunggu sedikit agar Pinia ter-initialize atau pastikan dipanggil setelah app.use(pinia)
  // Cara aman adalah memanggilnya setelah aplikasi ter-mount atau di nextTick
  import('vue').then(({ nextTick }) => {
    nextTick(() => {
  loadConfig()
  startAutoRefresh() // Start auto-refresh
    })
  })
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

