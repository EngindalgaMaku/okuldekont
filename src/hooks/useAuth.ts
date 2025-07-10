'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean
  adminRole?: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
    adminRole: undefined
  })
  const [isManualLogout, setIsManualLogout] = useState(false)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setAuthState({ user: null, loading: false, isAdmin: false, adminRole: undefined })
          return
        }

        if (session?.user) {
          // Check if user is admin
          const adminStatus = await checkAdminStatus(session.user)
          setAuthState({
            user: session.user,
            loading: false,
            isAdmin: adminStatus.isAdmin,
            adminRole: adminStatus.role
          })
        } else {
          setAuthState({ user: null, loading: false, isAdmin: false, adminRole: undefined })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthState({ user: null, loading: false, isAdmin: false, adminRole: undefined })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, { hasSession: !!session })
        
        // If this is after a manual logout, ignore any session restoration
        if (isManualLogout && session?.user) {
          console.log('Ignoring session restoration after manual logout')
          return
        }
        
        if (session?.user && !isManualLogout) {
          const adminStatus = await checkAdminStatus(session.user)
          setAuthState({
            user: session.user,
            loading: false,
            isAdmin: adminStatus.isAdmin,
            adminRole: adminStatus.role
          })
        } else {
          setAuthState({ user: null, loading: false, isAdmin: false, adminRole: undefined })
          // Reset manual logout flag after processing
          if (event === 'SIGNED_OUT') {
            setIsManualLogout(false)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (user: User): Promise<{ isAdmin: boolean; role?: string }> => {
    try {
      const { data, error } = await supabase
        .from('admin_kullanicilar')
        .select('yetki_seviyesi')
        .eq('id', user.id)
        .eq('aktif', true)

      if (error) {
        return { isAdmin: false }
      }

      if (data && data.length > 0) {
        return { isAdmin: true, role: data[0].yetki_seviyesi }
      }

      return { isAdmin: false }
    } catch (error) {
      console.error('Yönetici durumu kontrol edilirken beklenmedik bir hata oluştu:', error)
      return { isAdmin: false }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        const adminStatus = await checkAdminStatus(data.user)
        if (!adminStatus.isAdmin) {
          // Sign out if not admin
          await supabase.auth.signOut()
          setAuthState({ user: null, loading: false, isAdmin: false, adminRole: undefined })
          throw new Error('Bu hesap admin paneline erişim yetkisine sahip değil.')
        }
        
        // Update auth state immediately with admin status
        setAuthState({
          user: data.user,
          loading: false,
          isAdmin: adminStatus.isAdmin,
          adminRole: adminStatus.role
        })
      }

      return { data, error: null }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false }))
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔐 Starting sign out process...')
      setIsManualLogout(true) // Set flag to prevent auto re-login
      setAuthState(prev => ({ ...prev, loading: true }))
      
      // Use the most aggressive signOut method to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Supabase signOut error:', error)
      }
      
      // Clear local storage manually to ensure no session persistence
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-guqwqbxsfvddwwczwljp-auth-token') // Replace with your project ref
      sessionStorage.clear()
      
      // Force clear all auth state immediately
      setAuthState({
        user: null,
        loading: false,
        isAdmin: false,
        adminRole: undefined
      })
      
      console.log('✅ Auth state and storage cleared successfully')
      return { error: null }
    } catch (error: any) {
      console.error('SignOut error:', error)
      setIsManualLogout(true) // Set flag even on error
      
      // Even on error, force clear everything
      try {
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-guqwqbxsfvddwwczwljp-auth-token')
        sessionStorage.clear()
      } catch (storageError) {
        console.error('Storage clear error:', storageError)
      }
      
      // Force clear state even on error
      setAuthState({
        user: null,
        loading: false,
        isAdmin: false,
        adminRole: undefined
      })
      return { error }
    }
  }

  const createAdminUser = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin'
          }
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  return {
    ...authState,
    signIn,
    signOut,
    createAdminUser
  }
}