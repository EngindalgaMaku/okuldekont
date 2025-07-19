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
        
        if (pathname.startsWith('/ogretmen')) {
          return token.role === 'TEACHER'
        }
        
        if (pathname.startsWith('/isletme')) {
          return token.role === 'COMPANY'
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/((?!login).)*',  // Exclude /admin/login from middleware
    '/ogretmen/((?!login).)*',
    '/isletme/((?!login).)*',
    '/api/admin/:path*',
    '/api/ogretmen/:path*',
    '/api/isletme/:path*',
    '/api/search/:path*'
  ]
}