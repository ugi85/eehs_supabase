// src/services/googleSheetsService.js
/**
 * Service untuk sinkronisasi data ke Google Sheets
 * Menggunakan Proxy API agar API Key/Token tidak bocor di frontend
 */

const GOOGLE_SHEETS_PROXY_URL = import.meta.env.VITE_GOOGLE_SHEETS_PROXY_URL; // URL backend/cloud function Anda

export async function syncToSheets(action, table, data) {
  if (!GOOGLE_SHEETS_PROXY_URL) {
    console.warn('[GoogleSheetsService] Proxy URL tidak dikonfigurasi');
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action, // 'INSERT', 'UPDATE', 'DELETE'
        table,
        data,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) throw new Error('Gagal sync ke Google Sheets');
    return await response.json();
  } catch (error) {
    console.error('[GoogleSheetsService] Error:', error);
    // Masukkan ke queue di localStorage untuk retri nanti
    saveToQueue(action, table, data);
    return false;
  }
}

function saveToQueue(action, table, data) {
  const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
  queue.push({ action, table, data, timestamp: Date.now() });
  localStorage.setItem('sync_queue', JSON.stringify(queue));
}

/**
 * Fungsi untuk mencoba mengirim ulang data yang gagal
 */
export async function processQueue() {
  const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
  if (queue.length === 0) return;

  // Coba proses satu per satu
  const remaining = [];
  for (const item of queue) {
    const success = await syncToSheets(item.action, item.table, item.data);
    if (!success) remaining.push(item);
  }
  
  localStorage.setItem('sync_queue', JSON.stringify(remaining));
}
