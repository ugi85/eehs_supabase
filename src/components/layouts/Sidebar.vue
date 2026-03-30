<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { usePermissions } from '@/composables/usePermissions'
import { useFrontendConfig } from '@/composables/useConfig'
import { useRoute } from 'vue-router'

const permission = usePermissions()
const { config, getLogoUrl } = useFrontendConfig()
const route = useRoute()

const renderKey = ref(0)
const systemName = computed(() => config.value.systemName || 'EEHS Dashboard')
const logoUrl = computed(() => getLogoUrl.value || '/favicon.ico')
const logoKey = ref(0)

const isLoggedIn = computed(() => permission.isLoggedIn.value)
const canViewUsers = computed(() => permission.can('user:view'))
const canViewDaftarAlat = computed(() => permission.can('daftarAlat:view'))
const canViewJadwalKalibrasi = computed(() => permission.can('jadwalKalibrasi:view'))
const canViewLogAktivitas = computed(() => permission.can('logAktivitas:view'))
const canViewConfig = computed(() => permission.can('config:view'))

const isSuperAdmin = computed(() => {
  if (!isLoggedIn.value) return false
  const user = permission.user.value
  return user && (
    (user.role && user.role.toLowerCase() === 'superadmin') ||
    (user.email && user.email.toLowerCase().startsWith('super@'))
  )
})

// Vue-native open state untuk setiap treeview group
const logAktivitasOpen = ref(false)
const settingsOpen = ref(false)

// Auto-open group berdasarkan route aktif
const logAktivitasRoutes = ['/logCal', '/logPm', '/allAktivitas']
const settingsRoutes = ['/configurasi', '/roles']

watch(
  () => route.path,
  (path) => {
    if (logAktivitasRoutes.includes(path)) logAktivitasOpen.value = true
    if (settingsRoutes.includes(path)) settingsOpen.value = true
  },
  { immediate: true }
)

watch(
  () => config.value.logoUrl || config.value.logoDataUrl,
  () => { logoKey.value++ }
)

const handlePermissionChange = () => { renderKey.value++ }

onMounted(() => {
  window.addEventListener('permissions-changed', handlePermissionChange)
})

onUnmounted(() => {
  window.removeEventListener('permissions-changed', handlePermissionChange)
})
</script>

<template>
  <aside class="main-sidebar sidebar-dark-primary elevation-4">
    <RouterLink to="/dashChart" class="brand-link">
      <img
        :key="logoKey"
        :src="logoUrl"
        :alt="systemName + ' Logo'"
        class="brand-image img-circle elevation-3"
        style="opacity: .8"
        @error="logoKey++"
      >
      <span class="brand-text font-weight-light">{{ systemName }}</span>
    </RouterLink>

    <div class="sidebar">
      <nav class="mt-2">
        <ul class="nav nav-pills nav-sidebar flex-column" role="menu">

          <!-- Dashboard -->
          <li class="nav-item">
            <RouterLink to="/dashChart" class="nav-link" :class="{ active: route.path === '/dashChart' || route.path === '/' }">
              <i class="fas fa-tachometer-alt nav-icon"></i>
              <p>Dashboard Chart</p>
            </RouterLink>
          </li>

          <!-- Data Users -->
          <li class="nav-item" v-if="canViewUsers">
            <RouterLink to="/user" class="nav-link" :class="{ active: route.path === '/user' }">
              <i class="fas fa-users nav-icon"></i>
              <p>Data Users</p>
            </RouterLink>
          </li>

          <!-- Daftar Alat -->
          <li class="nav-item" v-if="canViewDaftarAlat">
            <RouterLink to="/daftarAlat" class="nav-link" :class="{ active: route.path === '/daftarAlat' }">
              <i class="fas fa-tools nav-icon"></i>
              <p>Daftar Alat</p>
            </RouterLink>
          </li>

          <!-- Jadwal Kalibrasi -->
          <li class="nav-item" v-if="canViewJadwalKalibrasi">
            <RouterLink to="/jadwalKalibrasi" class="nav-link" :class="{ active: route.path === '/jadwalKalibrasi' }">
              <i class="fas fa-balance-scale nav-icon"></i>
              <p>Jadwal Kalibrasi</p>
            </RouterLink>
          </li>

          <!-- Log Aktifitas -->
          <li class="nav-item" v-if="canViewLogAktivitas" :class="{ 'menu-open': logAktivitasOpen }">
            <a
              href="#"
              class="nav-link"
              :class="{ active: logAktivitasOpen }"
              @click.prevent="logAktivitasOpen = !logAktivitasOpen"
            >
              <i class="nav-icon fas fa-edit"></i>
              <p>
                Log Aktifitas
                <i class="fas fa-angle-left right" :style="logAktivitasOpen ? 'transform:rotate(-90deg)' : ''"></i>
              </p>
            </a>
            <ul class="nav nav-treeview" v-show="logAktivitasOpen">
              <li class="nav-item">
                <RouterLink to="/logCal" class="nav-link" :class="{ active: route.path === '/logCal' }">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Log Kalibrasi</p>
                </RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/logPm" class="nav-link" :class="{ active: route.path === '/logPm' }">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Log PM</p>
                </RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/allAktivitas" class="nav-link" :class="{ active: route.path === '/allAktivitas' }">
                  <i class="far fa-circle nav-icon"></i>
                  <p>All Aktivitas</p>
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Settings -->
          <li class="nav-item" v-if="isLoggedIn && canViewConfig" :class="{ 'menu-open': settingsOpen }">
            <a
              href="#"
              class="nav-link"
              :class="{ active: settingsOpen }"
              @click.prevent="settingsOpen = !settingsOpen"
            >
              <i class="fas fa-cogs nav-icon"></i>
              <p>
                Settings
                <i class="right fas fa-angle-left" :style="settingsOpen ? 'transform:rotate(-90deg)' : ''"></i>
              </p>
            </a>
            <ul class="nav nav-treeview" v-show="settingsOpen">
              <li class="nav-item" v-if="canViewConfig">
                <RouterLink to="/configurasi" class="nav-link" :class="{ active: route.path === '/configurasi' }">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Konfigurasi Sistem</p>
                </RouterLink>
              </li>
              <li class="nav-item" v-if="isSuperAdmin">
                <RouterLink to="/roles" class="nav-link" :class="{ active: route.path === '/roles' }">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Roles & Permissions</p>
                </RouterLink>
              </li>
            </ul>
          </li>

        </ul>
      </nav>
    </div>
  </aside>
</template>
