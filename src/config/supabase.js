// src/config/supabase.js
// Supabase connection removed.
// The system now exclusively uses Google Sheets API.
export const supabase = null;
export const handleSupabaseError = (error) => {
  console.error('[Supabase Error]', error)
  const err = new Error(error.message || 'Terjadi kesalahan pada database')
  err.originalError = error
  throw err
}

