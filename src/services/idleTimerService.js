// src/services/idleTimerService.js

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 menit dalam milliseconds
const WARNING_BEFORE = 1 * 60 * 1000 // Peringatan 2 menit sebelum timeout

let idleTimer = null
let warningTimer = null
let warningShown = false
let lastActivityTime = Date.now()

// Event yang dianggap sebagai aktivitas
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'wheel'
]

/**
 * Reset timer setelah ada aktivitas
 */
const resetTimer = () => {
  lastActivityTime = Date.now()
  warningShown = false
  
  // Clear timer yang ada
  if (idleTimer) clearTimeout(idleTimer)
  if (warningTimer) clearTimeout(warningTimer)
  
  // Set warning timer (2 menit sebelum timeout)
  warningTimer = setTimeout(() => {
    if (!warningShown) {
      showWarning()
    }
  }, IDLE_TIMEOUT - WARNING_BEFORE)
  
  // Set idle timer (logout otomatis)
  idleTimer = setTimeout(() => {
    performLogout()
  }, IDLE_TIMEOUT)
}

/**
 * Tampilkan peringatan sebelum logout
 */
const showWarning = () => {
  warningShown = true
  const remainingSeconds = Math.floor(WARNING_BEFORE / 1000)
  
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'warning',
      title: 'Peringatan Idle',
      html: `
        <p>Anda tidak aktif selama beberapa waktu.</p>
        <p class="text-danger">
          <strong>Sesi akan berakhir dalam <span id="countdown">${remainingSeconds}</span> detik.</strong>
        </p>
        <p class="text-muted small">Gerakkan mouse atau tekan tombol untuk tetap login.</p>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Saya Masih Di Sini',
      confirmButtonColor: '#3085d6',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: WARNING_BEFORE,
      timerProgressBar: true,
      didOpen: () => {
        // Start countdown
        const countdownElement = document.getElementById('countdown')
        let seconds = remainingSeconds
        
        const countdownInterval = setInterval(() => {
          seconds--
          if (countdownElement) {
            countdownElement.textContent = seconds
          }
          if (seconds <= 0) {
            clearInterval(countdownInterval)
          }
        }, 1000)
        
        // Reset timer saat tombol ditekan
        Swal.getConfirmButton().addEventListener('click', () => {
          clearInterval(countdownInterval)
          resetTimer()
        })
      },
      willClose: () => {
        // Jika modal ditutup (user masih aktif), reset timer
        resetTimer()
      }
    })
  } else {
    // Fallback tanpa SweetAlert
    alert(`Peringatan: Sesi Anda akan berakhir dalam ${remainingSeconds} detik karena tidak aktif.`)
  }
}

/**
 * Perform logout otomatis
 */
const performLogout = () => {
  // Clear timers
  if (idleTimer) clearTimeout(idleTimer)
  if (warningTimer) clearTimeout(warningTimer)
  
  // Hapus data user
  localStorage.removeItem('current_user')
  
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'info',
      title: 'Auto Logout',
      text: 'Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali.',
      timer: 2000,
      showConfirmButton: false,
      willClose: () => {
        window.location.href = '/dashChart'
      }
    }).then(() => {
      window.location.href = '/dashChart'
    })
  } else {
    alert('Sesi Anda telah berakhir karena tidak ada aktivitas.')
    window.location.href = '/dashChart'
  }
}

/**
 * Start idle timer - dipanggil saat user login
 */
export const startIdleTimer = () => {
  console.log('[IdleTimer] Starting idle timer for 15 minutes')
  
  // Reset waktu terakhir
  lastActivityTime = Date.now()
  
  // Remove event listeners yang ada (untuk menghindari duplikasi)
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, resetTimer, { passive: true, capture: true })
  })
  
  // Add event listeners untuk semua aktivitas
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true, capture: true })
  })
  
  // Start timer pertama kali
  resetTimer()
}

/**
 * Stop idle timer - dipanggil saat user logout manual
 */
export const stopIdleTimer = () => {
  console.log('[IdleTimer] Stopping idle timer')
  
  // Clear timers
  if (idleTimer) clearTimeout(idleTimer)
  if (warningTimer) clearTimeout(warningTimer)
  
  // Remove event listeners
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, resetTimer, { passive: true, capture: true })
  })
  
  idleTimer = null
  warningTimer = null
  warningShown = false
}

/**
 * Check if timer is running
 */
export const isTimerRunning = () => {
  return idleTimer !== null
}

/**
 * Get last activity time
 */
export const getLastActivityTime = () => {
  return lastActivityTime
}

export default {
  startIdleTimer,
  stopIdleTimer,
  isTimerRunning,
  getLastActivityTime
}
