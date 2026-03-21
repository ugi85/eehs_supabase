<script setup>
import { ref, computed } from 'vue'
import { useUsers } from '@/composables/useUsers'
import { userStore } from '@/stores/userStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const { changePassword } = useUsers()

// Form state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)

// Computed untuk cek apakah user sudah login
const currentUser = computed(() => userStore.state.user)
const isLoggedIn = computed(() => !!currentUser.value)

// Handle change password
const handleChangePassword = async () => {
  if (!isLoggedIn.value) {
    Swal.fire({
      icon: 'error',
      title: 'Belum Login',
      text: 'Silakan login terlebih dahulu untuk mengubah password',
      confirmButtonText: 'OK'
    })
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    Swal.fire({
      icon: 'error',
      title: 'Password Tidak Cocok',
      text: 'Password baru dan konfirmasi password tidak sama',
      confirmButtonText: 'OK'
    })
    return
  }

  if (newPassword.value.length < 6) {
    Swal.fire({
      icon: 'warning',
      title: 'Password Terlalu Pendek',
      text: 'Password minimal 6 karakter',
      confirmButtonText: 'OK'
    })
    return
  }

  if (currentPassword.value === newPassword.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Password Sama',
      text: 'Password baru tidak boleh sama dengan password saat ini',
      confirmButtonText: 'OK'
    })
    return
  }

  changingPassword.value = true

  try {
    const result = await changePassword(currentPassword.value, newPassword.value)
    
    if (result.success) {
      // Reset form
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      
      // Close modal
      emit('update:modelValue', false)
      
      Swal.fire({
        icon: 'success',
        title: 'Password Diubah',
        text: 'Password Anda berhasil diubah',
        timer: 2000,
        showConfirmButton: false
      })
    } else {
      // Backend reject (e.g., wrong current password)
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: result.message || 'Password saat ini salah',
        confirmButtonText: 'OK'
      })
    }
  } catch (error) {
    console.error('Change password error:', error)
    Swal.fire({
      icon: 'error',
      title: 'Gagal!',
      text: 'Password lama salah',
      confirmButtonText: 'OK'
    })
  } finally {
    changingPassword.value = false
  }
}

// Reset form when modal closes
const handleClose = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="modelValue"
    class="modal fade show"
    tabindex="-1"
    style="display: block; background-color: rgba(0, 0, 0, 0.5);"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-warning">
          <h5 class="modal-title">
            <i class="fas fa-key mr-2"></i>
            Ubah Password
          </h5>
          <button
            type="button"
            class="close"
            @click="handleClose"
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleChangePassword">
            <div class="form-group">
              <label for="currentPassword">
                <i class="fas fa-lock mr-1"></i>
                Password Saat Ini
              </label>
              <input
                v-model="currentPassword"
                type="password"
                id="currentPassword"
                class="form-control"
                placeholder="Masukkan password saat ini"
                required
                :disabled="changingPassword"
              />
            </div>
            <div class="form-group">
              <label for="newPassword">
                <i class="fas fa-lock mr-1"></i>
                Password Baru
              </label>
              <input
                v-model="newPassword"
                type="password"
                id="newPassword"
                class="form-control"
                placeholder="Masukkan password baru"
                required
                minlength="6"
                :disabled="changingPassword"
              />
              <small class="text-muted">Minimal 6 karakter</small>
            </div>
            <div class="form-group">
              <label for="confirmPassword">
                <i class="fas fa-lock mr-1"></i>
                Konfirmasi Password Baru
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                id="confirmPassword"
                class="form-control"
                placeholder="Konfirmasi password baru"
                required
                minlength="6"
                :disabled="changingPassword"
              />
            </div>

            <div class="d-grid gap-2">
              <button
                type="submit"
                class="btn btn-warning btn-block"
                :disabled="changingPassword || newPassword !== confirmPassword"
              >
                <span v-if="changingPassword">
                  <span class="spinner-border spinner-border-sm mr-2"></span>
                  Mengubah...
                </span>
                <span v-else>
                  <i class="fas fa-key mr-2"></i>
                  Ubah Password
                </span>
              </button>
              <!-- <button
                type="button"
                class="btn btn-secondary"
                @click="handleClose"
                :disabled="changingPassword"
              >
                Batal
              </button> -->
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  border-radius: 10px;
  border: none;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  background: linear-gradient(135deg, #f39c12 0%, #d68910 100%) !important;
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
  border-color: #f39c12;
  box-shadow: 0 0 0 0.2rem rgba(243, 156, 18, 0.25);
}

.btn-warning {
  background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
  border: none;
  font-weight: 600;
  padding: 10px;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #d68910 0%, #f39c12 100%);
}

.btn-warning:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
