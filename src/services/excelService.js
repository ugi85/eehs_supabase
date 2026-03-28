// src/services/excelService.js
import * as XLSX from 'xlsx'

/**
 * Download template Excel kosong dengan header yang benar
 */
export function downloadTemplate(filename, headers, exampleRow = null) {
  const ws_data = [headers]
  if (exampleRow) ws_data.push(exampleRow)

  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Style header row (bold) — SheetJS community edition tidak support style penuh,
  // tapi kita bisa set column widths
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, filename)
}

/**
 * Export data ke Excel
 */
export function exportToExcel(data, filename, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data)

  // Auto column width
  const keys = Object.keys(data[0] || {})
  ws['!cols'] = keys.map(k => ({ wch: Math.max(k.length + 4, 15) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

/**
 * Parse file Excel yang diupload, return array of objects
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(new Error('File tidak valid atau format tidak didukung'))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}
