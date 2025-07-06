'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setAuthState({ user: null, loading: false, isAdmin: false })
          return
        }

        if (session?.user) {
          // Check if user is admin
          const isAdmin = await checkAdminStatus(session.user)
          setAuthState({ 
            user: session.user, 
            loading: false, 
            isAdmin 
          })
        } else {
          setAuthState({ user: null, loading: false, isAdmin: false })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthState({ user: null, loading: false, isAdmin: false })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const isAdmin = await checkAdminStatus(session.user)
          setAuthState({ 
            user: session.user, 
            loading: false, 
            isAdmin 
          })
        } else {
          setAuthState({ user: null, loading: false, isAdmin: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (user: User): Promise<boolean> => {
    try {
      // Check if user exists in admin users or has admin role
      // For now, check if email matches admin pattern or exists in admin table
      const adminEmails = [
        'admin@okul.com',
        'yonetici@hozdilek.edu.tr',
        'koordinator@mtal.gov.tr'
      ]

      // Check if email is in admin list or has admin metadata
      if (adminEmails.includes(user.email || '') || 
          user.user_metadata?.role === 'admin' ||
          user.app_metadata?.role === 'admin') {
        return true
      }

      // TODO: In production, check against admin users table in database
      // const { data } = await supabase
      //   .from('admin_users')
      //   .select('id')
      //   .eq('email', user.email)
      //   .single()
      // 
      // return !!data

      return false
    } catch (error) {
      console.error('Admin status check error:', error)
      return false
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
        const isAdmin = await checkAdminStatus(data.user)
        if (!isAdmin) {
          // Sign out if not admin
          await supabase.auth.signOut()
          throw new Error('Bu hesap admin paneline erişim yetkisine sahip değil.')
        }
      }

      return { data, error: null }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false }))
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setAuthState({ user: null, loading: false, isAdmin: false })
      return { error: null }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false }))
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