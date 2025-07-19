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
    '/admin/((?!login).)*',  // Exclude /admin/login from middleware
    // Remove /ogretmen from matcher since it uses its own auth system
    // Remove /isletme from matcher since it uses its own auth system
    '/api/admin/((?!teachers|dekontlar|belgeler|internships).)*', // Exclude teacher-related APIs from middleware
    // Remove /api/ogretmen from matcher since teachers use their own auth
    // Remove /api/isletme from matcher since companies use their own auth
    // Remove /api/system-settings from matcher since both teacher and company panels use it
    '/api/search/:path*'
  ]
}