import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default withAuth(
  function middleware(req: NextRequest) {
    // Force HTTPS in production
    if (process.env.NODE_ENV === 'production' && 
        req.headers.get('x-forwarded-proto') !== 'https' &&
        !req.headers.get('host')?.includes('localhost')) {
      return NextResponse.redirect(`https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`)
    }

    // Security headers for SSL
    const response = NextResponse.next()
    
    // Strict Transport Security
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    // Upgrade insecure requests
    response.headers.set('Content-Security-Policy', 'upgrade-insecure-requests')
    
    // X-Forwarded-Proto header handling for Coolify
    if (req.headers.get('x-forwarded-proto') === 'https') {
      response.headers.set('X-Forwarded-Proto', 'https')
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to login pages without authentication
        if (pathname === '/admin/login' ||
            pathname === '/ogretmen/login' ||
            pathname === '/isletme/login') {
          return true
        }
        
        // Admin routes need admin role
        if (pathname.startsWith('/admin')) {
          return token?.role === 'ADMIN'
        }
        
        // Teacher routes need teacher role
        if (pathname.startsWith('/ogretmen')) {
          return token?.role === 'TEACHER'
        }
        
        // Company routes need company role
        if (pathname.startsWith('/isletme')) {
          return token?.role === 'COMPANY'
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/ogretmen/:path*',
    '/isletme/:path*',
    '/api/admin/:path*',
    '/api/companies/:path*'
  ]
}