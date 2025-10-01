import { NextRequest } from 'next/server'
import { authMiddleware } from './src/middleware/auth'

export function middleware(request: NextRequest) {
  // Static dosyalar ve public uploads için auth'a sokma
  return authMiddleware(request)
}

// Public statics ve uploads hariç tut: _next, favicon, PWA dosyaları, uploads
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|robots.txt|sitemap.xml|sw.js|workbox-.*.js|uploads/).*)',
  ],
}