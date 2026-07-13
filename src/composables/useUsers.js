// src/composables/useUsers.js
import { ref, nextTick, watch } from 'vue'
import { userApi } from '@/api'

// === Konfigurasi Cache ===
const CACHE_KEY = 'users_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

export function useUsers() {
  const users = ref([])
  const loading = ref(true)
  const isSaving = ref(false)
  const isDeleting = ref(false)
  let dataTableInstance = null

  // === Inisialisasi DataTables ===
  const initDataTable = async () => {
    await nextTick()
    if (dataTableInstance) {
      dataTableInstance.clear()
      dataTableInstance.destroy(true) // true = bersihkan wrapper
      dataTableInstance = null
    }

    const table = document.querySelector('.users-table')
    if (table) {
      // @ts-ignore
      dataTableInstance = $(table).DataTable({
        paging: true,
        lengthChange: true,
        searching: true,
        ordering: true,
        info: true,
        autoWidth: false,
        responsive: false,
        scrollX: true,
        lengthMenu: [
          [10, 25, 50, 100, -1],
          [10, 25, 50, 100, 'All']
        ],
        language: {
          search: '_INPUT_',
          searchPlaceholder: 'Cari user...',
          // lengthMenu: 'Tampilkan _MENU_ baris',
          // info: 'Menampilkan _START_ sampai _END_ dari _TOTAL_ entri',
          infoEmpty: 'Tidak ada entri',
          infoFiltered: '(difilter dari _MAX_ total entri)',
          zeroRecords: 'Tidak ada data yang ditemukan',
          paginate: {
            first: 'Pertama',
            last: 'Terakhir',
            next: 'Next',
            previous: 'Prev'
          }
        },
        dom: `
          <'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>
          <'row'<'col-sm-12'tr>>
          <'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>
        `.trim(),
        columnDefs: [
          { orderable: false, targets: -1 } // Disable ordering pada kolom Aksi
        ]
      })
    }
  }

  watch(
    users,
    () => {
      initDataTable()
    },
    { deep: true }
  )

  // === Fetch dengan Cache + Background Revalidate ===
  const fetchUsers = async (force = false) => {
    loading.value = true

    const cached = localStorage.getItem(CACHE_KEY)
    const now = Date.now()

    if (!force && cached) {
      try {
        const { data, timestamp } = JSON.parse(cached)
        if (now - timestamp < CACHE_DURATION) {
          users.value = data
          loading.value = false
          return
        }
      } catch (e) {
        console.warn('Cache corrupted, ignoring:', e)
      }
    }

    try {
      // Panggil readUsers()
      const result = await userApi.readUsers()

      // Karena readUsers() di userApi.js sudah mengembalikan result.data || []
      // Maka result di sini adalah array datanya langsung
      console.log('[useUsers] API readUsers result:', result)

      users.value = Array.isArray(result) ? result : []
      console.log('[useUsers] users state:', users.value)

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: users.value, timestamp: now })
      )
    } catch (error) {
      console.error('Gagal mengambil data user:', error)
      users.value = []
    } finally {
      loading.value = false
    }
  }

  // === CREATE: Tambah user baru ===
  const createUser = async (user) => {
    isSaving.value = true
    try {
      const result = await userApi.createUser(user)
      localStorage.removeItem(CACHE_KEY)
      await fetchUsers(true)
      Swal.fire('Berhasil!', 'User berhasil ditambahkan', 'success')
      return result
    } catch (error) {
      console.error('Gagal membuat user:', error)
      Swal.fire('Error!', error.message || 'Gagal membuat user', 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // === UPDATE: Edit user ===
  const updateUser = async (user) => {
    isSaving.value = true
    try {
      const result = await userApi.updateUser(user)
      localStorage.removeItem(CACHE_KEY)
      await fetchUsers(true)
      Swal.fire('Berhasil!', 'User berhasil diupdate', 'success')
      return result
    } catch (error) {
      console.error('Gagal mengupdate user:', error)
      Swal.fire('Error!', error.message || 'Gagal mengupdate user', 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // === DELETE: Hapus user ===
  const deleteUser = async (id, nama) => {
    const confirm = await Swal.fire({
      title: 'Hapus User?',
      text: `Yakin hapus user "${nama || id}"? Data tidak bisa dikembalikan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (!confirm.isConfirmed) return

    isDeleting.value = true
    try {
      const result = await userApi.deleteUser(id)
      if (!result || !result.success) {
        throw new Error(result?.message || 'Respons tidak valid dari server')
      }

      // Optimistic update
      users.value = users.value.filter(u => String(u.id) !== String(id))
      localStorage.removeItem(CACHE_KEY)
      await fetchUsers(true)

      Swal.fire('Berhasil!', 'User berhasil dihapus', 'success')
      return result
    } catch (error) {
      console.error('[ERROR] Gagal menghapus user:', error)
      Swal.fire('Gagal Menghapus!', error.message || 'Terjadi kesalahan', 'error')
      throw error
    } finally {
      isDeleting.value = false
    }
  }

  // === LOGIN: User authentication ===
  const login = async (email, password) => {
    try {
      console.log('[useUsers] Login started for:', email)
      const result = await userApi.login(email, password)
      console.log('[useUsers] Login result:', { success: result.success, message: result.message })
      return result
    } catch (error) {
      console.error('[useUsers] Login error:', error)
      return {
        success: false,
        message: error.message || 'Login gagal'
      }
    }
  }

  // === CHANGE PASSWORD: Ubah password user yang sedang login ===
  const changePassword = async (oldPassword, newPassword) => {
    isSaving.value = true
    try {
      // Dapatkan user yang sedang login dari userStore
      const { userStore } = await import('@/stores/userStore')
      const currentUser = userStore.state.user
      
      if (!currentUser || !currentUser.id) {
        throw new Error('User belum login')
      }
      
      // Validasi old password dengan login dulu
      const loginResult = await login(currentUser.email, oldPassword)
      if (!loginResult.success) {
        throw new Error('Password saat ini salah')
      }
      
      // Update password user
      const updatePayload = {
        id: currentUser.id,
        nama: currentUser.nama,
        inisial: currentUser.inisial || '',
        email: currentUser.email,
        role: currentUser.role,
        password: newPassword // Hanya update password
      }
      
      const result = await userApi.updateUser(updatePayload)
      
      Swal.fire('Berhasil!', 'Password berhasil diubah', 'success')
      return result
    } catch (error) {
      console.error('Gagal mengubah password:', error)
      Swal.fire('Error!', error.message || 'Gagal mengubah password', 'error')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    users,
    loading,
    isSaving,
    isDeleting,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    login,
    changePassword
  }
}

