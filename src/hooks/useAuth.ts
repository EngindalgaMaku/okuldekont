'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

export interface AuthState {
  user: any | null
  loading: boolean
  isAdmin: boolean
  adminRole?: string
  adminId?: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
    adminRole: undefined,
    adminId: undefined
  })

  // Function to map database roles to frontend roles
  const mapDatabaseRoleToFrontendRole = (dbRole: string): string | undefined => {
    switch (dbRole) {
      case 'ADMIN':
        return 'super_admin'  // ADMIN users get super_admin privileges
      case 'USER':
        return 'operator'     // Regular users get operator privileges
      case 'TEACHER':
        return 'operator'     // Teachers get operator privileges
      case 'COMPANY':
        return 'operator'     // Companies get operator privileges
      default:
        return undefined
    }
  }

  useEffect(() => {
    if (status === 'loading') {
      setAuthState({
        user: null,
        loading: true,
        isAdmin: false,
        adminRole: undefined,
        adminId: undefined
      })
    } else if (status === 'authenticated' && session?.user) {
      const frontendRole = mapDatabaseRoleToFrontendRole(session.user.role)
      setAuthState({
        user: session.user,
        loading: false,
        isAdmin: session.user.role === 'ADMIN',
        adminRole: frontendRole,
        adminId: session.user.role === 'ADMIN' ? session.user.id : undefined
      })
    } else {
      setAuthState({
        user: null,
        loading: false,
        isAdmin: false,
        adminRole: undefined,
        adminId: undefined
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