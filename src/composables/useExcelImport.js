// src/composables/useExcelImport.js
import { ref } from 'vue'
import { parseExcelFile, downloadTemplate, exportToExcel } from '@/services/excelService'

// ===== DAFTAR ALAT =====
const DAFTAR_ALAT_HEADERS = [
  'No.ID', 'Description', 'Type/Model', 'SN', 'Year',
  'Crit Product (Y/N)', 'Crit Process (Y/N)', 'Crit Safety (Y/N)', 'Crit Environment (Y/N)',
  'PM Y/N', 'PM 6 Monthly', 'PM Yearly', 'PM Internal/External',
  'Calibration Y/N', 'Calibration Schedule', 'Location'
]

const DAFTAR_ALAT_EXAMPLE = [
  'EWT-01', 'Example Equipment', 'Type A', 'SN-001', '2023',
  'Y', 'Y', 'N', 'N',
  'Y', 'Jan, Jul', 'Jan', 'Internal',
  'Y', 'Jan', 'Lab'
]

// Map header Excel → field API
const DAFTAR_ALAT_MAP = {
  'No.ID': 'no_id',
  'Description': 'description',
  'Type/Model': 'type_model',
  'SN': 'sn',
  'Year': 'year',
  'Crit Product (Y/N)': 'crit_product',
  'Crit Process (Y/N)': 'crit_process',
  'Crit Safety (Y/N)': 'crit_safety',
  'Crit Environment (Y/N)': 'crit_env',
  'PM Y/N': 'pm_overall',
  'PM 6 Monthly': 'pm_6monthly',
  'PM Yearly': 'pm_yearly',
  'PM Internal/External': 'pm_internal_external',
  'Calibration Y/N': 'calib_yesno',
  'Calibration Schedule': 'calib_schedule',
  'Location': 'location'
}

// ===== JADWAL KALIBRASI =====
const JADWAL_KALIBRASI_HEADERS = [
  'No.ID', 'Description', 'Calibration ID', 'Parameter',
  'Process Range', 'Reject Error Limit', 'Interval', 'Due Date', 'Remark', 'Criticality'
]

const JADWAL_KALIBRASI_EXAMPLE = [
  'EWT-01', 'Example Equipment', 'EWT-01.CAL-01', 'Temperature',
  '0 - 100 °C', '±0.5 °C', '12', 'Jan', 'External calibration', 'High'
]

const JADWAL_KALIBRASI_MAP = {
  'No.ID': 'no_id',
  'Description': 'description',
  'Calibration ID': 'cal_id',
  'Parameter': 'parameter',
  'Process Range': 'process_range',
  'Reject Error Limit': 'reject_error',
  'Interval': 'interval',
  'Due Date': 'due_date',
  'Remark': 'remark',
  'Criticality': 'criticality'
}

export function useExcelImport() {
  const importing = ref(false)
  const importErrors = ref([])
  const importPreview = ref([])
  const showPreview = ref(false)

  // ===== DOWNLOAD TEMPLATE =====
  const downloadDaftarAlatTemplate = () => {
    downloadTemplate('template_daftar_alat.xlsx', DAFTAR_ALAT_HEADERS, DAFTAR_ALAT_EXAMPLE)
  }

  const downloadJadwalKalibrasiTemplate = () => {
    downloadTemplate('template_jadwal_kalibrasi.xlsx', JADWAL_KALIBRASI_HEADERS, JADWAL_KALIBRASI_EXAMPLE)
  }

  // ===== EXPORT DATA =====
  const exportDaftarAlat = (tools) => {
    if (!tools?.length) return
    const rows = tools.map(t => ({
      'No.ID': t.no_id || '',
      'Description': t.description || '',
      'Type/Model': t.type_model || '',
      'SN': t.sn || '',
      'Year': t.year || '',
      'Crit Product (Y/N)': t.crit_product || '',
      'Crit Process (Y/N)': t.crit_process || '',
      'Crit Safety (Y/N)': t.crit_safety || '',
      'Crit Environment (Y/N)': t.crit_env || '',
      'PM Y/N': t.pm_overall || '',
      'PM 6 Monthly': t.pm_6monthly || '',
      'PM Yearly': t.pm_yearly || '',
      'PM Internal/External': t.pm_internal_external || '',
      'Calibration Y/N': t.calib_yesno || '',
      'Calibration Schedule': t.calib_schedule || '',
      'Location': t.location || '',
      'Status': t.status || 'active'
    }))
    exportToExcel(rows, 'daftar_alat.xlsx', 'Daftar Alat')
  }

  const exportJadwalKalibrasi = (jadwals) => {
    if (!jadwals?.length) return
    const rows = jadwals.map(j => ({
      'No.ID': j.no_id || '',
      'Description': j.description || '',
      'Calibration ID': j.cal_id || '',
      'Parameter': j.parameter || '',
      'Process Range': j.process_range || '',
      'Reject Error Limit': j.reject_error || '',
      'Interval': j.interval || '',
      'Due Date': j.due_date || '',
      'Remark': j.remark || '',
      'Criticality': j.criticality || ''
    }))
    exportToExcel(rows, 'jadwal_kalibrasi.xlsx', 'Jadwal Kalibrasi')
  }

  // ===== PARSE & PREVIEW IMPORT =====
  const parseImportFile = async (file, type = 'daftarAlat') => {
    importing.value = true
    importErrors.value = []
    importPreview.value = []

    try {
      const rows = await parseExcelFile(file)
      if (!rows.length) throw new Error('File kosong atau tidak ada data')

      const fieldMap = type === 'daftarAlat' ? DAFTAR_ALAT_MAP : JADWAL_KALIBRASI_MAP
      const requiredField = type === 'daftarAlat' ? 'No.ID' : 'No.ID'

      const errors = []
      const mapped = rows.map((row, i) => {
        const rowNum = i + 2 // +2 karena row 1 = header
        if (!row[requiredField]) {
          errors.push(`Baris ${rowNum}: No.ID wajib diisi`)
        }
        // Map ke field API
        const obj = {}
        for (const [excelKey, apiKey] of Object.entries(fieldMap)) {
          obj[apiKey] = String(row[excelKey] ?? '').trim()
        }
        return obj
      })

      importErrors.value = errors
      importPreview.value = mapped
      showPreview.value = true
      return mapped
    } catch (err) {
      importErrors.value = [err.message]
      return []
    } finally {
      importing.value = false
    }
  }

  const resetImport = () => {
    importErrors.value = []
    importPreview.value = []
    showPreview.value = false
  }

  return {
    importing,
    importErrors,
    importPreview,
    showPreview,
    downloadDaftarAlatTemplate,
    downloadJadwalKalibrasiTemplate,
    exportDaftarAlat,
    exportJadwalKalibrasi,
    parseImportFile,
    resetImport
  }
}
