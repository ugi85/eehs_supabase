/**
 * cacheManager.js
 *
 * Cache service dengan localStorage + TTL 30 menit.
 * Fallback ke in-memory Map jika localStorage tidak tersedia atau error.
 *
 * Storage format:
 * {
 *   "cache:daftarAlat:all": {
 *     "data": [...],
 *     "timestamp": 1700000000000,
 *     "ttl": 1800000
 *   }
 * }
 */

const KEY_PREFIX = 'cache:'
const DEFAULT_TTL = 1_800_000 // 30 menit dalam ms

// In-memory fallback jika localStorage tidak tersedia
const memoryStore = new Map()

/**
 * Cek apakah localStorage tersedia dan bisa digunakan.
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    const testKey = '__cache_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Buat full key dengan prefix.
 * @param {string} key
 * @returns {string}
 */
function buildKey(key) {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`
}

/**
 * Cek apakah entry sudah expired.
 * @param {{ timestamp: number, ttl: number }} entry
 * @returns {boolean}
 */
function isExpired(entry) {
  return Date.now() > entry.timestamp + entry.ttl
}

const cacheManager = {
  /**
   * Ambil data dari cache. Return null jika tidak ada atau sudah expired.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const fullKey = buildKey(key)

    // Coba localStorage dulu
    try {
      const raw = localStorage.getItem(fullKey)
      if (raw) {
        const entry = JSON.parse(raw)
        if (!isExpired(entry)) {
          return entry.data
        }
        // Sudah expired — hapus dari storage
        localStorage.removeItem(fullKey)
        return null
      }
    } catch {
      // localStorage error — fallback ke memory
    }

    // Cek memory fallback
    const memEntry = memoryStore.get(fullKey)
    if (memEntry) {
      if (!isExpired(memEntry)) {
        return memEntry.data
      }
      memoryStore.delete(fullKey)
    }

    return null
  },

  /**
   * Simpan data ke cache dengan TTL (default 30 menit).
   * @param {string} key
   * @param {any} data
   * @param {number} ttl - TTL dalam ms, default 1_800_000 (30 menit)
   */
  set(key, data, ttl = DEFAULT_TTL) {
    const fullKey = buildKey(key)
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    }

    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry))
        return
      } catch {
        // localStorage penuh atau error — fallback ke memory
        console.warn('[cacheManager] localStorage gagal, menggunakan memory cache:', fullKey)
      }
    }

    // Simpan ke memory fallback
    memoryStore.set(fullKey, entry)
  },

  /**
   * Hapus satu entry dari cache.
   * @param {string} key
   */
  invalidate(key) {
    const fullKey = buildKey(key)

    try {
      localStorage.removeItem(fullKey)
    } catch {
      // Abaikan error localStorage
    }

    memoryStore.delete(fullKey)
  },

  /**
   * Hapus semua cache entries yang memiliki prefix 'cache:'.
   * Tidak menghapus entries lain di localStorage.
   */
  invalidateAll() {
    // Hapus dari localStorage
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(KEY_PREFIX)) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k)
        } catch {
          // Abaikan error per-key
        }
      })
    } catch {
      // localStorage tidak tersedia
    }

    // Hapus dari memory store
    for (const k of memoryStore.keys()) {
      if (k.startsWith(KEY_PREFIX)) {
        memoryStore.delete(k)
      }
    }
  },
}

export default cacheManager

// ─── Demo / Quick Verification (development only) ───────────────────────────
// Uncomment blok ini di browser console untuk verifikasi manual:
//
// import cacheManager from '@/services/cacheManager'
//
// // 1. Set data
// cacheManager.set('daftarAlat:all', [{ id: 1, name: 'Alat A' }])
//
// // 2. Get data (sebelum expired)
// console.log(cacheManager.get('daftarAlat:all'))
// // → [{ id: 1, name: 'Alat A' }]
//
// // 3. Simulasi TTL expired
// cacheManager.set('test:expired', { msg: 'akan expired' }, 1) // TTL 1ms
// await new Promise(r => setTimeout(r, 10))
// console.log(cacheManager.get('test:expired'))
// // → null  (sudah expired)
//
// // 4. Invalidate spesifik
// cacheManager.invalidate('daftarAlat:all')
// console.log(cacheManager.get('daftarAlat:all'))
// // → null
//
// // 5. InvalidateAll — hanya hapus keys dengan prefix 'cache:'
// cacheManager.set('kalibrasi:all', [{ id: 2 }])
// localStorage.setItem('non-cache-key', 'should-survive')
// cacheManager.invalidateAll()
// console.log(cacheManager.get('kalibrasi:all'))     // → null
// console.log(localStorage.getItem('non-cache-key')) // → 'should-survive'
