<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

onMounted(() => {
  // Inisialisasi database dari localstorage
  settings.initializeDatabase()

  // Cek status database ke API Sheets setiap 60 detik agar sinkron antar device
  setInterval(() => {
    settings.checkRemoteConfig()
  }, 60000)
})
</script>

