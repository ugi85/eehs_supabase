<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { SyncQueue } from '@/utils/syncQueue'
import { useSettingsStore } from '@/stores/settings'

onMounted(() => {
  const settings = useSettingsStore()
  SyncQueue.process({
    'alat': settings._deprecated_api.daftarAlat,
    'log': settings._deprecated_api.logAktivitas,
    'jadwalKalibrasi': settings._deprecated_api.jadwalKalibrasi,
    'users': settings._deprecated_api.users
  })
})
</script>

