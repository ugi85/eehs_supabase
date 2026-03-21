// helper to build printable HTML for kalibrasi log
export function buildKalibrasiHtml(tableContent, selectedMonth, selectedYear) {
  const now = new Date()
  const printDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`

  // build full HTML with styles and inserted table content
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Log Kalibrasi - ${selectedMonth} ${selectedYear}</title>
  <style>
    @page {
      size: landscape;
      margin: 10mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 15mm;
      color: #333;
      line-height: 1.5;
    }
    .print-header {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 3px solid #0056b3;
      padding-bottom: 20px;
    }
    .company-logo {
      font-size: 36px;
      font-weight: bold;
      color: #003366;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #003366;
      margin-bottom: 5px;
    }
    .company-address {
      font-size: 14px;
      color: #555;
      line-height: 1.4;
      margin-bottom: 3px;
    }
    .report-title {
      color: #0056b3;
      margin: 15px 0 10px;
      font-size: 26px;
      font-weight: bold;
    }
    .report-subtitle {
      color: #666;
      font-size: 16px;
      margin: 5px 0;
      font-weight: 500;
    }
    .report-period {
      background: #e9ecef;
      padding: 8px 20px;
      border-radius: 25px;
      display: inline-block;
      margin-top: 12px;
      font-weight: bold;
      font-size: 18px;
      color: #0056b3;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12px;
    }
    .print-table th {
      background-color: #f0f4f7;
      font-weight: 600;
      padding: 10px 8px;
      text-align: left;
      border: 1px solid #ddd;
      font-size: 13px;
    }
    .print-table td {
      padding: 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    .print-table .text-center {
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-success {
      background-color: #28a745;
      color: white;
    }
    .status-danger {
      background-color: #dc3545;
      color: white;
    }
    .completed-row {
      background-color: #f8fdfa !important;
    }
    .print-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .footer-timestamp {
      font-weight: 500;
      color: #0056b3;
      margin-bottom: 5px;
    }
    .footer-page {
      margin-top: 3px;
    }
    .footer-disclaimer {
      margin-top: 15px;
      font-style: italic;
      color: #888;
      font-size: 11px;
    }
    @media print {
      body {
        padding: 8mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      .print-table {
        font-size: 11px;
      }
      .print-table th {
        padding: 8px 6px;
        font-size: 12px;
      }
      .print-table td {
        padding: 6px;
      }
      .status-badge {
        padding: 2px 6px;
        font-size: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="company-logo">AGIS</div>
    <div class="company-name">PT. AGIS INSTRUMENT SERVICES</div>
    <div class="company-address">Jl. Raya Industri No. 123, Kawasan Industri MM2100</div>
    <div class="company-address">Cikarang Barat, Bekasi 17520 - Indonesia</div>
    <div class="company-address">Telp: (021) 897-1234 | Email: info@agis.co.id</div>
    <h1 class="report-title">LAPORAN LOG KALIBRASI</h1>
    <div class="report-subtitle">No. Reff: AGIS-WI-ENG-016-LD1_v5.0</div>
    <div class="report-period">
      Periode: ${selectedMonth} ${selectedYear}
    </div>
  </div>
  ${tableContent}
  <div class="print-footer">
    <div class="footer-timestamp">Dicetak pada: ${printDate}</div>
    <div class="footer-page">Halaman 1 dari 1</div>
    <div class="footer-disclaimer">
      Dokumen ini dihasilkan secara otomatis oleh sistem QMS AGIS. 
      Setiap perubahan harus melalui prosedur kontrol dokumen yang berlaku.
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
</html>`
}
