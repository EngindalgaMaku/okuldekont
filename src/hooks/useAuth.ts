'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

export interface AuthState {
  user: any | null
  loading: boolean
  isAdmin: boolean
  adminRole?: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
    adminRole: undefined
  })

  useEffect(() => {
    if (status === 'loading') {
      setAuthState({
        user: null,
        loading: true,
        isAdmin: false,
        adminRole: undefined
      })
    } else if (status === 'authenticated' && session?.user) {
      setAuthState({
        user: session.user,
        loading: false,
        isAdmin: session.user.role === 'ADMIN',
        adminRole: session.user.role
      })
    } else {
      setAuthState({
        user: null,
        loading: false,
        isAdmin: false,
        adminRole: undefined
      })
    }
  }, [session, status])

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      return { data: result, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  const signOutUser = async () => {
    try {
      await signOut({ redirect: false })
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const createAdminUser = async (email: string, password: string, fullName: string) => {
    // This would need to be implemented as an API endpoint
    // For now, return a placeholder
    return { data: null, error: new Error('Admin user creation needs to be implemented via API') }
  }

  return {
    ...authState,
    signIn: signInWithPassword,
    signOut: signOutUser,
    createAdminUser
  }
}