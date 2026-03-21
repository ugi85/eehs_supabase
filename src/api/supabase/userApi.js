// src/api/supabase/userApi.js
import { supabase, handleSupabaseError } from '@/config/supabase'

/**
 * User API - Supabase Integration
 * Table: users
 * Columns: id_user, nama, inisial, email, password (hashed), role, createdAt, updatedAt
 */

// Helper function to hash password using SHA-256
const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export const userApi = {
  /**
   * GET: Read all users
   */
  async readUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false })

      if (error) throw error

      // Map field names dari Supabase ke format yang diharapkan view
      const mappedData = (data || []).map(user => ({
        id: user.id_user,
        nama: user.nama,
        inisial: user.inisial,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))

      return {
        success: true,
        data: mappedData
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * GET: Read user by ID
   */
  async getUserById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id_user', id)
        .single()

      if (error) throw error

      // Map field names
      const mappedUser = {
        id: data.id_user,
        nama: data.nama,
        inisial: data.inisial,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }

      return {
        success: true,
        user: mappedUser
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Create new user
   */
  async createUser(user) {
    try {
      // Hash password sebelum disimpan
      const hashedPassword = await hashPassword(user.password)
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          nama: user.nama,
          inisial: user.inisial,
          email: user.email,
          password: hashedPassword,
          role: user.role
        }])
        .select()
        .single()

      if (error) throw error

      // Map field names
      const mappedUser = {
        id: data.id_user,
        nama: data.nama,
        inisial: data.inisial,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }

      return {
        success: true,
        message: 'User berhasil dibuat',
        user: mappedUser
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Update existing user
   */
  async updateUser(user) {
    try {
      const updateData = {
        nama: user.nama,
        inisial: user.inisial,
        email: user.email,
        role: user.role,
        updatedAt: new Date().toLocaleString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', '')
      }

      // Only update password if provided - hash it first
      if (user.password) {
        updateData.password = await hashPassword(user.password)
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id_user', user.id)
        .select()
        .single()

      if (error) throw error

      // Map field names
      const mappedUser = {
        id: data.id_user,
        nama: data.nama,
        inisial: data.inisial,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }

      return {
        success: true,
        message: 'User berhasil diupdate',
        user: mappedUser
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Delete user by ID
   */
  async deleteUser(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id_user', id)

      if (error) throw error

      return {
        success: true,
        message: 'User berhasil dihapus'
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Login user
   */
  async login(email, password) {
    try {
      // Query user by email
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !data) {
        return {
          success: false,
          message: 'Email atau password salah'
        }
      }

      // Hash password yang diinput untuk dibandingkan dengan yang di database
      const hashedPassword = await hashPassword(password)
      
      if (data.password !== hashedPassword) {
        return {
          success: false,
          message: 'Email atau password salah'
        }
      }

      // Map field names and remove password from response
      const mappedUser = {
        id: data.id_user,
        nama: data.nama,
        inisial: data.inisial,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }

      return {
        success: true,
        message: 'Login berhasil',
        user: mappedUser
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  },

  /**
   * POST: Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Verify old password first
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('id_user', userId)
        .single()

      if (fetchError || !user) throw new Error('User tidak ditemukan')

      // Hash old password untuk verifikasi
      const hashedOldPassword = await hashPassword(oldPassword)
      
      if (user.password !== hashedOldPassword) {
        return {
          success: false,
          message: 'Password lama salah'
        }
      }

      // Hash new password sebelum disimpan
      const hashedNewPassword = await hashPassword(newPassword)

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedNewPassword,
          updatedAt: new Date().toLocaleString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(',', '')
        })
        .eq('id_user', userId)

      if (updateError) throw updateError

      return {
        success: true,
        message: 'Password berhasil diubah'
      }
    } catch (error) {
      return handleSupabaseError(error)
    }
  }
}
