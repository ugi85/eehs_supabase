<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { usePermissions } from '@/composables/usePermissions'
import { userStore } from '@/stores/userStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'login-success'])

const { login } = useUsers()
const permission = usePermissions()

// Form state
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// Handle login
const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const result = await login(email.value, password.value)

    console.log('[LoginModal] Login result:', result)

    if (result.success && result.user) {
      // Set user ke global store (akan load permissions otomatis)
      permission.setUser(result.user)

      // Force refresh permissions dari storage
      const freshPermissions = userStore.state.permissions
      console.log('[LoginModal] User logged in with permissions:', freshPermissions)

      // Close modal
      emit('update:modelValue', false)

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil!',
        text: 'Selamat datang di sistem',
        timer: 1500,
        showConfirmButton: false
      })

      emit('login-success', result.user)

      // Reset form
      email.value = ''
      password.value = ''
      error.value = ''
    } else {
      // Login failed
      error.value = result.message || 'Email atau password salah'
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal!',
        text: error.value,
        timer: 2000,
        showConfirmButton: false,
        willClose: () => {
          error.value = ''
        }
      })
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = 'Terjadi kesalahan saat login'
    Swal.fire({
      icon: 'error',
      title: 'Login Gagal!',
      text: 'Email atau password salah',
      confirmButtonText: 'OK'
    })
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    error.value = ''
    email.value = ''
    password.value = ''
  }
})

// Listen for router guard event
const handleOpenLoginModal = () => {
  emit('update:modelValue', true)
}

onMounted(() => {
  window.addEventListener('open-login-modal', handleOpenLoginModal)
})

onUnmounted(() => {
  window.removeEventListener('open-login-modal', handleOpenLoginModal)
})
</script>

<template>
  <div 
    class="modal fade" 
    :class="{ show: modelValue }" 
    :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1"
    aria-modal="true"
    role="dialog"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fas fa-sign-in-alt mr-2"></i>
            Login
          </h5>
          <button 
            type="button" 
            class="close" 
            @click="emit('update:modelValue', false)"
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleLogin">
            <div class="form-group">
              <label for="email">
                <i class="fas fa-envelope mr-1"></i>
                Email
              </label>
              <input
                v-model="email"
                type="email"
                id="email"
                class="form-control"
                placeholder="Masukkan email Anda"
                required
              />
            </div>
            <div class="form-group">
              <label for="password">
                <i class="fas fa-lock mr-1"></i>
                Password
              </label>
              <input
                v-model="password"
                type="password"
                id="password"
                class="form-control"
                placeholder="Masukkan password"
                required
              />
            </div>
            
            <div v-if="error" class="alert alert-danger">
              <i class="fas fa-exclamation-circle mr-1"></i>
              {{ error }}
            </div>

            <div class="d-grid">
              <button
                type="submit"
                class="btn btn-primary btn-block"
                :disabled="loading"
              >
                <span v-if="loading">
                  <span class="spinner-border spinner-border-sm mr-2"></span>
                  Loading...
                </span>
                <span v-else>
                  <i class="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </span>
              </button>
            </div>
          </form>
        </div>
        <div class="modal-footer justify-content-center">
          <small>
            <a href="#">Jika Lupa password, Silahkan hubungi admin !</a>
          </small>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Backdrop -->
  <div
    v-if="modelValue"
    class="modal-backdrop fade show"
    @click="emit('update:modelValue', false)"
  ></div>
</template>

<style scoped>
.modal-content {
  border-radius: 10px;
  border: none;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.modal-header .close {
  color: white;
  opacity: 1;
  text-shadow: none;
}

.modal-header .close:hover {
  opacity: 0.8;
}

.modal-title {
  font-weight: 600;
  margin: 0;
}

.form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  padding: 10px;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.modal-footer {
  border-top: 1px solid #dee2e6;
  padding: 0.75rem 1rem;
}

.modal-footer a {
  color: #667eea;
  text-decoration: none;
}

.modal-footer a:hover {
  text-decoration: underline;
}
</style>
