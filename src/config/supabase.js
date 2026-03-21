// src/config/supabase.js
import { createClient } from '@supabase/supabase-js'

// Supabase credentials - dari .env atau hardcoded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lycpmppwscxwgmifsnvx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Y3BtcHB3c2N4d2dtaWZzbnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg1NDcsImV4cCI6MjA4ODM5NDU0N30.pVjIE3IZwNbEt23VoRBZVBt0VwJUndM6dvA8SgVxY4Y'

// Log untuk debugging (hapus di production)
console.log('[Supabase Config] URL:', supabaseUrl)
console.log('[Supabase Config] Key:', supabaseAnonKey ? 'Loaded ✓' : 'Missing ✗')

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Helper function untuk error handling
export const handleSupabaseError = (error) => {
  console.error('[Supabase Error]', error)
  const err = new Error(error.message || 'Terjadi kesalahan pada database')
  err.originalError = error
  throw err
}
