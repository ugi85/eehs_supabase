<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { usePermissions } from '@/composables/usePermissions'
import { useFrontendConfig } from '@/composables/useConfig'

const permission = usePermissions()
const { config, getLogoUrl } = useFrontendConfig()

// Key untuk force re-render saat permission berubah
const renderKey = ref(0)

// System name and logo from config composable
const systemName = computed(() => config.value.systemName || 'EEHS Dashboard')
const logoUrl = computed(() => getLogoUrl.value || '/favicon.ico')
const logoKey = ref(0)

// Computed untuk login status - akses .value karena permission.isLoggedIn sudah computed
const isLoggedIn = computed(() => permission.isLoggedIn.value)

// Computed untuk permission checks
const canViewUsers = computed(() => permission.can('user:view'))
const canViewDaftarAlat = computed(() => permission.can('daftarAlat:view'))
const canViewJadwalKalibrasi = computed(() => permission.can('jadwalKalibrasi:view'))
const canViewLogAktivitas = computed(() => permission.can('logAktivitas:view'))
const canViewConfig = computed(() => permission.can('config:view'))

// Computed untuk cek apakah user adalah superadmin
const isSuperAdmin = computed(() => {
  if (!isLoggedIn.value) {
    console.log('[Sidebar] isSuperAdmin - Not logged in')
    return false
  }
  const user = permission.user.value
  console.log('[Sidebar] isSuperAdmin - User:', user, 'Role:', user?.role)
  // Check role = 'superadmin' OR email starts with 'super@'
  return user && (
    (user.role && user.role.toLowerCase() === 'superadmin') ||
    (user.email && user.email.toLowerCase().startsWith('super@'))
  )
})

// Force refresh sidebar saat permission berubah
const handlePermissionChange = () => {
  console.log('[Sidebar] Permission changed - forcing re-render')
  renderKey.value++
}

// Watch for logo changes to force re-render
watch(
  () => config.value.logoUrl || config.value.logoDataUrl,
  () => {
    logoKey.value++
  }
)

// Load config on mount
onMounted(() => {
  // Listen untuk permission changes
  window.addEventListener('permissions-changed', handlePermissionChange)
  
  console.log('[Sidebar] Mounted - watching for permission changes')
})

onUnmounted(() => {
  window.removeEventListener('permissions-changed', handlePermissionChange)
})
</script>

<template>
  <aside class="main-sidebar sidebar-dark-primary elevation-4">
    <!-- Brand Logo -->
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

    <!-- Sidebar -->
    <div class="sidebar">
      <!-- Sidebar Menu -->
      <nav class="mt-2">
        <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
          <li class="nav-item menu-open">
            <ul class="nav nav-treeview">
              <!-- Dashboard - Selalu tampil untuk semua orang -->
              <li class="nav-item">
                <RouterLink to="/dashChart" class="nav-link">
                  <i class="fas fa-tachometer-alt nav-icon"></i>
                  <p>Dashboard Chart</p>
                </RouterLink>
              </li>

              <!-- Menu di bawah ini tampil untuk semua (public + login) -->
              <li class="nav-item" v-if="canViewUsers" :key="'users-' + renderKey">
                <RouterLink to="/user" class="nav-link">
                  <i class="fas fa-users nav-icon"></i>
                  <p>Data Users</p>
                </RouterLink>
              </li>
              <li class="nav-item" v-if="canViewDaftarAlat" :key="'daftarAlat-' + renderKey">
                <RouterLink to="/daftarAlat" class="nav-link">
                  <i class="fas fa-tools nav-icon"></i>
                  <p>Daftar Alat</p>
                </RouterLink>
              </li>
              <li class="nav-item" v-if="canViewJadwalKalibrasi" :key="'jadwalKalibrasi-' + renderKey">
                <RouterLink to="/jadwalKalibrasi" class="nav-link">
                  <i class="fas fa-balance-scale nav-icon"></i>
                  <p>Jadwal Kalibrasi</p>
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Log Aktifitas - Tampil untuk semua (public + login) -->
          <li class="nav-item" v-if="canViewLogAktivitas" :key="'logAktivitas-' + renderKey">
            <a href="#" class="nav-link">
              <i class="nav-icon fas fa-edit"></i>
              <p>
                Log Aktifitas
                <i class="fas fa-angle-left right"></i>
              </p>
            </a>
            <ul class="nav nav-treeview">
              <li class="nav-item">
                <RouterLink to="/logCal" class="nav-link">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Log Kalibrasi</p>
                </RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/logPm" class="nav-link">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Log PM</p>
                </RouterLink>
              </li>
              <li class="nav-item" v-if="isLoggedIn">
                <RouterLink to="/allAktivitas" class="nav-link">
                  <i class="far fa-circle nav-icon"></i>
                  <p>All Aktivitas</p>
                </RouterLink>
              </li>
            </ul>
          </li>

          <!-- Settings - Hanya untuk LOGIN -->
          <li class="nav-item" v-if="isLoggedIn && canViewConfig" :key="'settings-' + renderKey">
            <a href="#" class="nav-link">
              <i class="fas fa-cogs nav-icon"></i>
              <p>
                Settings
                <i class="right fas fa-angle-left"></i>
              </p>
            </a>
            <ul class="nav nav-treeview">
              <li class="nav-item" v-if="canViewConfig" :key="'configurasi-' + renderKey">
                <RouterLink to="/configurasi" class="nav-link">
                  <i class="far fa-circle nav-icon"></i>
                  <p>Konfigurasi Sistem</p>
                </RouterLink>
              </li>
              <li class="nav-item" v-if="isSuperAdmin" :key="'roles-' + renderKey">
                <RouterLink to="/roles" class="nav-link">
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
