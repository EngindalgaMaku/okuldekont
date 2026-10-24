import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { canAccessApi } from '@/lib/api-access'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (pathname.startsWith('/api/') && token && !canAccessApi(token, pathname, req.method)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        if (!token) return false

        if (pathname.startsWith('/admin')) {
          return token.role === 'ADMIN'
        }

        // API rol kontrolü yukarıdaki middleware fonksiyonunda yapılıyor
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/((?!login).)*',  // Protect all admin routes except login
    '/api/admin/:path*',
    '/api/companies/:path*',
  ]
}
