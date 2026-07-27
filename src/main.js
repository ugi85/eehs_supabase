import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { useSettingsStore } from '@/stores/settings'

const app = createApp(App)

app.use(router)
app.use(createPinia())

// Proses antrian saat aplikasi pertama kali dimuat
const settings = useSettingsStore()
SyncQueue.process({
  'users': settings._deprecated_api.users,
  'daftar_alat': settings._deprecated_api.daftarAlat,
  'log_aktivitas': settings._deprecated_api.logAktivitas,
  'jadwal_kalibrasi': settings._deprecated_api.jadwalKalibrasi,
  'config': settings._deprecated_api.config
})

app.mount('#app')

