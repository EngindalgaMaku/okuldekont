import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public API routes that don't require authentication
        if (pathname.startsWith('/api/search') || pathname.startsWith('/api/public')) {
          return true
        }

        // Check if user is authenticated for all other routes
        if (!token) return false
        
        // Check role-based access for protected routes
        if (pathname.startsWith('/admin')) {
          return token.role === 'ADMIN'
        }
        
        // Öğretmen ve işletme rotaları kendi auth sistemlerini kullanıyor
        // sessionStorage tabanlı authentication
        if (pathname.startsWith('/ogretmen') || pathname.startsWith('/isletme')) {
          return true
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/((?!login).)*',  // Protect all admin routes except login
    '/api/admin/:path*'  // Protect all admin API routes
  ]
}