// src/views/pages/examples/login.vue
<script setup>
import { ref } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { usePermissions } from '@/composables/usePermissions'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login } = useUsers()
const { setUser } = usePermissions()

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

    if (result.success) {
      // Set user dari API response (sudah include id, nama, email, role, dll)
      setUser(result.user)

      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil!',
        text: `Selamat datang, ${result.user.nama}!`,
        timer: 1500,
        showConfirmButton: false
      })

      // Redirect ke dashboard
      router.push('/')
    } else {
      error.value = result.message || 'Email atau password salah'
      Swal.fire('Error!', error.value, 'error')
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = 'Terjadi kesalahan saat login'
    Swal.fire('Error!', error.value, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <div class="card">
        <div class="card-body login-card-body">
          <p class="login-box-msg">Sign in to start your session</p>

          <form @submit.prevent="handleLogin">
            <div class="input-group mb-3">
              <input
                v-model="email"
                type="email"
                class="form-control"
                placeholder="Email"
                required
              />
              <div class="input-group-append">
                <div class="input-group-text">
                  <span class="fas fa-envelope"></span>
                </div>
              </div>
            </div>
            <div class="input-group mb-3">
              <input
                v-model="password"
                type="password"
                class="form-control"
                placeholder="Password"
                required
              />
              <div class="input-group-append">
                <div class="input-group-text">
                  <span class="fas fa-lock"></span>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-12">
                <button
                  type="submit"
                  class="btn btn-primary btn-block"
                  :disabled="loading"
                >
                  <span v-if="loading">
                    <span class="spinner-border spinner-border-sm mr-1"></span>
                    Loading...
                  </span>
                  <span v-else>Sign In</span>
                </button>
              </div>
            </div>
          </form>

          <p class="mb-1 mt-3">
            <a href="#">I forgot my password</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card-body {
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.input-group-text {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}
</style>
