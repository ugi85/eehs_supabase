<script setup>
import { ref, computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'
import LoginModal from '@/components/LoginModal.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'

const permission = usePermissions()
const showLoginModal = ref(false)
const showChangePasswordModal = ref(false)

// Computed untuk login status - akses .value karena permission.isLoggedIn sudah computed
const isLoggedIn = computed(() => permission.isLoggedIn.value)
const user = computed(() => permission.user.value)

const handleLoginSuccess = (userData) => {
  console.log('User logged in:', userData)
}

const handleLogout = () => {
  permission.logout()
}

const openChangePassword = () => {
  showChangePasswordModal.value = true
}
</script>

<template>
  <nav class="main-header navbar navbar-expand navbar-dark">
    <!-- Left navbar links -->
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
      </li>
    </ul>

    <!-- Right navbar links -->
    <ul class="navbar-nav ml-auto">
      <!-- Navbar Search -->
      <li class="nav-item">
        <div class="navbar-search-block">
          <form class="form-inline">
            <div class="input-group input-group-sm">
              <input class="form-control form-control-navbar" type="search" placeholder="Search" aria-label="Search">
              <div class="input-group-append">
                <button class="btn btn-navbar" type="submit">
                  <i class="fas fa-search"></i>
                </button>
                <button class="btn btn-navbar" type="button" data-widget="navbar-search">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </li>

      <!-- Login Button / User Menu -->
      <li v-if="!isLoggedIn" class="nav-item">
        <a
          class="nav-link cursor-pointer"
          @click="showLoginModal = true"
          role="button"
        >
          <i class="fas fa-sign-in-alt"></i>
          <span class="ml-1">Login</span>
        </a>
      </li>

      <!-- User Menu (when logged in) -->
      <li v-else class="nav-item dropdown">
        <a
          class="nav-link dropdown-toggle"
          data-toggle="dropdown"
          href="#"
          role="button"
        >
          <i class="fas fa-user-circle"></i>
          <span class="ml-1">{{ user?.nama || 'User' }}</span>
        </a>
        <div class="dropdown-menu dropdown-menu-right">
          <a href="#" class="dropdown-item" @click.prevent="openChangePassword">
            <i class="fas fa-key mr-2"></i>
            Ubah Password
          </a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item" @click.prevent="handleLogout">
            <i class="fas fa-sign-out-alt mr-2"></i>
            Logout
          </a>
        </div>
      </li>

      <!-- Fullscreen Button -->
      <li class="nav-item">
        <a class="nav-link" data-widget="fullscreen" href="#" role="button">
          <i class="fas fa-expand-arrows-alt"></i>
        </a>
      </li>
    </ul>
  </nav>

  <!-- Login Modal -->
  <LoginModal
    v-model="showLoginModal"
    @login-success="handleLoginSuccess"
  />

  <!-- Change Password Modal -->
  <ChangePasswordModal
    v-model="showChangePasswordModal"
  />
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
