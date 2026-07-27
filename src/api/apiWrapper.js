// src/api/apiWrapper.js
import axios from 'axios';
import { useSettingsStore } from '@/stores/settings';
import { SyncQueue } from '@/utils/syncQueue';

export const withSync = async (tableName, operation, apiCall, data) => {
  const settings = useSettingsStore();

  // Mapping harus tepat dengan key di settings._deprecated_api
  const apiMap = {
    'users': settings._deprecated_api.users,
    'daftar_alat': settings._deprecated_api.daftarAlat,
    'log_aktivitas': settings._deprecated_api.logAktivitas,
    'jadwal_kalibrasi': settings._deprecated_api.jadwalKalibrasi,
    'config': settings._deprecated_api.config
  };

  // 1. Eksekusi Operasi Utama (Supabase)
  const result = await apiCall();

  // 2. Sinkronisasi (Asinkron / Fire and Forget)
  // Hanya sync jika operasi Supabase berhasil
  if (result && result.success) {
  const url = apiMap[tableName];
  if (url) {
      // Menggunakan fetch mode 'no-cors' untuk menghindari blokir CORS dari Google
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, data })
      })
      .then(() => console.log(`[Sync] Request terkirim ke ${tableName}`))
      .catch((err) => {
        console.error(`[Sync] Gagal sync ke ${tableName}, menambahkan ke queue...`, err);
          SyncQueue.add(tableName, operation, data);
        });
  }
  }
  
  return result;
};

