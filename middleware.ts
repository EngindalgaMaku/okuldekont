import { NextRequest } from 'next/server'
import { authMiddleware } from './src/middleware/auth'

export function middleware(request: NextRequest) {
  console.log('🚀 MIDDLEWARE TOPLEVEL ÇALIŞIYOR:', request.nextUrl.pathname)
  return authMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Basit matcher - tüm route'ları yakala
     */
    '/(.*)',
  ],
}