// src/services/printService.js
import { useFrontendConfig } from '@/composables/useConfig'

export const printService = {
  // ✅ GENERATE PRINT HTML DENGAN KONFIGURASI DINAMIS
  generatePrintHtml(title, tableContent, period = '', isCalibration = false, periodLabel = '', showDocumentNumber = true) {
    const { config, getLogoUrl, getFullAddress } = useFrontendConfig()

    // Ambil nilai konfigurasi
    const systemName = config.value.systemName
    const systemVersion = config.value.systemVersion
    const companyName = config.value.companyName
    const logoUrl = getLogoUrl.value
    const logoPerusahaanUrl = config.value.logoPerusahaanUrl || config.value.logoPerusahaanDataUrl
    const addressHtml = getFullAddress.value
    const documentRef = isCalibration
      ? config.value.documentRefCalibration
      : config.value.documentRefEquipment
    const documentRefDisplay = showDocumentNumber ? documentRef : 'N/A'
    const orientation = config.value.print.orientation
    const margin = config.value.print.margin
    const headerHeight = config.value.print.headerHeight
    const fontFamily = config.value.print.fontFamily
    const showLogo = config.value.print.showLogo
    const showAddress = config.value.print.showAddress
    const showDocumentRef = config.value.print.showDocumentRef

    // Format tanggal cetak
    const now = new Date()
    const printDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${systemName}</title>
        <style>
          @page {
            size: ${orientation};
            margin: ${margin};
          }

          body {
            font-family: ${fontFamily};
            padding: 0;
            color: #333;
            line-height: 1.3;
            margin: 0;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }

          .print-table thead th {
            border: 1px solid #000;
            padding: 3px 5px;
            text-align: left;
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 7px;
            white-space: nowrap;
          }

          .print-table tbody td {
            border: 1px solid #000;
            padding: 3px 5px;
            text-align: left;
          }

          .print-table td.text-center {
            text-align: center;
          }

          .header-info {
            width: 100%;
            margin-bottom: 3px;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .header-left {
            flex: 1;
          }

          .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
          }

          .header-line {
            display: block;
            text-align: left;
            font-weight: bold;
            white-space: nowrap;
            margin: 0;
            padding: 0;
            line-height: 1.3;
          }

          .company-name {
            font-size: 14px;
            margin-bottom: 2px;
          }

          .doc-title {
            font-size: 10px;
            margin-bottom: 1px;
          }

          .doc-number {
            font-size: 10px;
          }

          .company-logo {
            max-height: 40px;
            max-width: 120px;
            object-fit: contain;
          }

          .period-label {
            font-size: 10px;
            font-weight: bold;
            margin-top: 2px;
            text-align: right;
          }

          .print-footer {
            margin-top: 8px;
            padding-top: 5px;
            border-top: 1px solid #000;
            font-size: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .footer-left {
            text-align: left;
          }

          .footer-right {
            text-align: right;
            font-weight: bold;
          }

          .footer-timestamp {
            font-weight: bold;
            margin-bottom: 2px;
          }

          @page {
            @bottom-right {
              content: "Hal " counter(page) " of  " counter(pages);
              font-size: 8px;
              font-weight: bold;
              margin-right: 0;
            }
          }

          @media print {
            body {
              padding: ${margin};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-table {
              font-size: 7px;
            }

            .print-table thead {
              display: table-header-group;
            }

            .print-table th, .print-table td {
              padding: 2px 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <div class="header-left">
            <div class="header-line company-name">${companyName}</div>
            <div class="header-line doc-title">Judul Dokumen : ${title}</div>
            <div class="header-line doc-number">Nomor Dokumen : ${documentRefDisplay}</div>
          </div>
          <div class="header-right">
            ${showLogo && logoPerusahaanUrl ? `<img src="${logoPerusahaanUrl}" alt="Logo Perusahaan" class="company-logo" />` : ''}
            ${period && periodLabel ? `<div class="period-label">${periodLabel} ${period}</div>` : ''}
          </div>
        </div>

        ${tableContent}

        <div class="print-footer">
          <div class="footer-left">
            <div class="footer-timestamp">Dicetak: ${printDate} | ${systemName} v${systemVersion}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 300);
          };
        </script>
      </body>
      </html>
    `
  },
  

  // ✅ PRINT DAFTAR ALAT
  printDaftarAlat(alat, title = 'Daftar Peralatan dan Jadwal Perawatannya') {
    // Generate table content dengan format lengkap
    let tableContent = `
      <table class="print-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 3%;">No.</th>
            <th rowspan="2" style="width: 8%;">No. ID</th>
            <th rowspan="2" style="width: 15%;">Description</th>
            <th rowspan="2" style="width: 10%;">Type/Model</th>
            <th rowspan="2" style="width: 10%;">SN</th>
            <th rowspan="2" style="width: 5%;">Year</th>
            <th rowspan="2" style="width: 5%;">Criticality<br>(Y/N)</th>
            <th colspan="4" style="width: 16%;">PM</th>
            <th colspan="3" style="width: 12%;">Calibration</th>
            <th rowspan="2" style="width: 5%;">PIC</th>
            <th rowspan="2" style="width: 5%;">Dikerjakan<br>tgl:</th>
            <th rowspan="2" style="width: 10%;">Keterangan</th>
          </tr>
          <tr>
            <th style="width: 4%;">Product</th>
            <th style="width: 4%;">Process</th>
            <th style="width: 4%;">Safety</th>
            <th style="width: 4%;">Enviroment</th>
            <th style="width: 4%;">Y/N</th>
            <th style="width: 4%;">6 Monthly</th>
            <th style="width: 4%;">Yearly</th>
            <th style="width: 4%;">6/12</th>
            <th style="width: 4%;">Y/N</th>
            <th style="width: 4%;">Schedule</th>
          </tr>
        </thead>
        <tbody>
    `

    alat.forEach((item, index) => {
      tableContent += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item['No. ID'] || ''}</td>
          <td>${item.Description || ''}</td>
          <td>${item['Type/Model'] || ''}</td>
          <td>${item.SN || ''}</td>
          <td class="text-center">${item.Year || ''}</td>
          <td class="text-center">${item.Criticality || ''}</td>
          <td class="text-center">${item['PM Product'] || ''}</td>
          <td class="text-center">${item['PM Process'] || ''}</td>
          <td class="text-center">${item['PM Safety'] || ''}</td>
          <td class="text-center">${item['PM Enviroment'] || ''}</td>
          <td class="text-center">${item['PM Y/N'] || ''}</td>
          <td class="text-center">${item['Calibration 6 Monthly'] || ''}</td>
          <td class="text-center">${item['Calibration Yearly'] || ''}</td>
          <td class="text-center">${item['Calibration 6/12'] || ''}</td>
          <td class="text-center">${item['Calibration Y/N'] || ''}</td>
          <td class="text-center">${item['Calibration Schedule'] || ''}</td>
          <td>${item.PIC || ''}</td>
          <td class="text-center">${item['Dikerjakan tgl'] || ''}</td>
          <td>${item.Keterangan || ''}</td>
        </tr>
      `
    })

    tableContent += `
        </tbody>
      </table>
    `

    // Generate print window
    const printWindow = window.open('', '_blank', 'width=1400,height=800')
    if (!printWindow) {
      alert('Popup blocker menghalangi pencetakan. Silakan izinkan popup.')
      return
    }

    const html = this.generatePrintHtml(
      title,
      tableContent,
      '', // Tidak ada periode
      false // BUKAN jadwal kalibrasi
    )

    printWindow.document.write(html)
    printWindow.document.close()
  },

  // ✅ PRINT JADWAL KALIBRASI
  printJadwalKalibrasi(jadwal, month, year) {
    // Generate table content
    let tableContent = `
      <table class="print-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 3%;">No</th>
            <th rowspan="2" style="width: 8%;">No.ID</th>
            <th rowspan="2" style="width: 15%;">Description</th>
            <th rowspan="2" style="width: 10%;">Calibration ID</th>
            <th rowspan="2" style="width: 12%;">Parameter</th>
            <th rowspan="2" style="width: 12%;">Process Range</th>
            <th rowspan="2" style="width: 12%;">Reject Error</th>
            <th rowspan="2" style="width: 10%;">Due Date</th>
            <th rowspan="2" style="width: 10%;">Remark</th>
            <th rowspan="2" style="width: 8%;">Criticality</th>
          </tr>
        </thead>
        <tbody>
    `

    jadwal.forEach((item, index) => {
      tableContent += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item['No.ID'] || ''}</td>
          <td>${item.Description || ''}</td>
          <td>${item['Calibration Id.'] || ''}</td>
          <td>${item.Parameter || ''}</td>
          <td>${item['Process Range'] || ''}</td>
          <td>${item['Reject Error Limit'] || ''}</td>
          <td class="text-center">${this.formatDate(item['Due Date']) || ''}</td>
          <td>${item.Remark || ''}</td>
          <td>${item.Criticality || ''}</td>
        </tr>
      `
    })

    tableContent += `
        </tbody>
      </table>
    `

    // Generate print window
    const printWindow = window.open('', '_blank', 'width=1400,height=800')
    if (!printWindow) {
      alert('Popup blocker menghalangi pencetakan. Silakan izinkan popup.')
      return
    }

    const html = this.generatePrintHtml(
      'Jadwal Kalibrasi',
      tableContent,
      `${month} ${year}`,
      false, // INI JADWAL KALIBRASI
    )

    printWindow.document.write(html)
    printWindow.document.close()
  },

  // ✅ PRINT LOG KALIBRASI
  printKalibrasiLogs(logs, month, year) {
    if (!logs || logs.length === 0) {
      alert('Tidak ada data untuk dicetak')
      return
    }

    // Generate table content
    let tableContent = `
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 4%;">No</th>
            <th style="width: 10%;">No.ID</th>
            <th style="width: 15%;">Description</th>
            <th style="width: 12%;">Calibration ID</th>
            <th style="width: 10%;">Parameter</th>
            <th style="width: 12%;">Proses Range</th>
            <th style="width: 12%;">Reject limit</th>
            <th style="width: 8%;">Due Date</th>
            <th style="width: 8%;">PIC</th>
            <th style="width: 9%;">Execute Date</th>
            <th style="width: 15%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
    `

    logs.forEach((item, index) => {
      // Format tanggal
      const dueDate = this.formatDate(item['Due Date'])
      const executeDate = this.formatDate(item.execute_date)

      tableContent += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item['No.ID'] || ''}</td>
          <td>${item.Description || ''}</td>
          <td>${item['Calibration Id.'] || ''}</td>
          <td>${item.Parameter || ''}</td>
          <td>${item['Process Range'] || ''}</td>
          <td>${item['Reject Error Limit'] || ''}</td>
          <td class="text-center">${dueDate}</td>
          <td>${item.pic || ''}</td>
          <td class="text-center">${executeDate}</td>
          <td>${item.ket || ''}</td>
        </tr>
      `
    })

    tableContent += `
        </tbody>
      </table>
    `

    // Generate print window
    const printWindow = window.open('', '_blank', 'width=1600,height=800')
    if (!printWindow) {
      alert('Popup blocker menghalangi pencetakan. Silakan izinkan popup.')
      return
    }

    const html = this.generatePrintHtml(
      'Monitoring Kalibrasi Bulanan',
      tableContent,
      `${month} ${year}`,
      true, // INI LOG KALIBRASI
      'Jadwal Kalibrasi'
    )

    printWindow.document.write(html)
    printWindow.document.close()
  },

  // ✅ PRINT LOG PM
  printPM(logs, month, year) {
    if (!logs || logs.length === 0) {
      alert('Tidak ada data untuk dicetak')
      return
    }

    // Generate table content
    let tableContent = `
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 10%;">No.ID</th>
            <th style="width: 15%;">Description</th>
            <th style="width: 12%;">Type/Model</th>
            <th style="width: 10%;">SN</th>
            <th style="width: 8%;">Interval</th>
            <th style="width: 10%;">Due Date</th>
            <th style="width: 10%;">PIC</th>
            <th style="width: 10%;">Execute Date</th>
            <th style="width: 15%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
    `

    logs.forEach((item, index) => {
      // Format tanggal
      const dueDate = this.formatDate(item['Due Date'])
      const executeDate = this.formatDate(item.execute_date)

      tableContent += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item['No.ID'] || ''}</td>
          <td>${item.Description || ''}</td>
          <td>${item['Type/Model'] || item.Parameter || ''}</td>
          <td>${item.SN || '-'}</td>
          <td class="text-center">${item.pm_interval || '-'}</td>
          <td class="text-center">${dueDate}</td>
          <td>${item.pic || ''}</td>
          <td class="text-center">${executeDate}</td>
          <td>${item.ket || ''}</td>
        </tr>
      `
    })

    tableContent += `
        </tbody>
      </table>
    `

    // Generate print window
    const printWindow = window.open('', '_blank', 'width=1600,height=800')
    if (!printWindow) {
      alert('Popup blocker menghalangi pencetakan. Silakan izinkan popup.')
      return
    }

    const html = this.generatePrintHtml(
      'Daftar Peralatan & Jadwal Perawatan',
      tableContent,
      `${month} ${year}`,
      false, // BUKAN LOG KALIBRASI
      'Jadwal PM'
    )

    printWindow.document.write(html)
    printWindow.document.close()
  },

  // ✅ PRINT ALL AKTIVITAS
  printAllActivity(logs, month, year) {
    if (!logs || logs.length === 0) {
      alert('Tidak ada data untuk dicetak')
      return
    }

    // Generate table content
    let tableContent = `
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 10%;">No.ID</th>
            <th style="width: 15%;">Description</th>
            <th style="width: 12%;">Log ID</th>
            <th style="width: 10%;">Jenis</th>
            <th style="width: 12%;">PIC</th>
            <th style="width: 12%;">Execute Date</th>
            <th style="width: 24%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
    `

    logs.forEach((item, index) => {
      // Format tanggal
      const executeDate = this.formatDate(item.execute_date) || this.formatDate(item.tanggal) || '-'

      tableContent += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item.no_id || '-'}</td>
          <td>${item.description || item.type_model || '-'}</td>
          <td>${item.cal_id || '-'}</td>
          <td class="text-center">${item.jenis || '-'}</td>
          <td>${item.petugas || '-'}</td>
          <td class="text-center">${executeDate}</td>
          <td>${item.keterangan || '-'}</td>
        </tr>
      `
    })

    tableContent += `
        </tbody>
      </table>
    `

    // Generate print window
    const printWindow = window.open('', '_blank', 'width=1600,height=800')
    if (!printWindow) {
      alert('Popup blocker menghalangi pencetakan. Silakan izinkan popup.')
      return
    }

    const html = this.generatePrintHtml(
      'Log Aktivitas',
      tableContent,
      `${month} ${year}`,
      false, // BUKAN LOG KALIBRASI
      '', // Tidak ada period label
      false // Tidak tampilkan nomor dokumen
    )

    printWindow.document.write(html)
    printWindow.document.close()
  },
  
  // Helper format tanggal
  formatDate(dateString) {
    if (!dateString) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      return `${day}/${month}/${year}`
    }
    try {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
    } catch (e) {}
    return dateString
  }
}