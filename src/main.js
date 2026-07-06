import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

// Initialize database configuration on app start
const settings = useSettingsStore()
settings.initializeDatabase()

console.log('[main.js] App initialized with database:', settings.database.type)

app.mount('#app')
