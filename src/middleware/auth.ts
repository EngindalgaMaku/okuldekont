import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
// Geçici olarak rate limiting'i devre dışı bırakıyoruz
// import {
//   applyRateLimit,
//   RATE_LIMIT_CONFIGS,
//   keyGenerators,
//   createRateLimitHeaders,
//   rateLimiters
// } from '@/lib/rate-limiting'

const secret = process.env.NEXTAUTH_SECRET

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth',
  '/api/health',
  '/login',
  '/ogretmen/login',
  '/isletme/login',
  '/admin/login',
  '/api/maintenance-check'
]

// API routes that require specific roles
const protectedApiRoutes = {
  '/api/admin': ['ADMIN'],
  '/api/teachers': ['ADMIN', 'TEACHER'],
  '/api/companies': ['ADMIN', 'COMPANY'],
  '/api/students': ['ADMIN', 'TEACHER'],
  '/api/dekontlar': ['ADMIN', 'TEACHER', 'COMPANY'],
  '/api/messaging': ['ADMIN', 'TEACHER', 'COMPANY'],
  '/api/reports': ['ADMIN', 'TEACHER']
}

// Semi-protected routes that require authentication but allow multiple roles
const semiProtectedApiRoutes = {
  '/api/search/teachers': ['ADMIN', 'TEACHER', 'COMPANY'],
  '/api/search/companies': ['ADMIN', 'TEACHER', 'COMPANY'],
  '/api/admin/fields': ['ADMIN', 'TEACHER', 'COMPANY'],
  '/api/admin/internships': ['ADMIN', 'TEACHER'],
  '/api/admin/teachers/': ['ADMIN', 'TEACHER'], // Öğretmenler de öğretmen detaylarını görebilir
  '/api/admin/teachers': ['ADMIN', 'TEACHER'], // Öğretmenler de öğretmen listesini görebilir
  '/api/admin/students': ['ADMIN', 'TEACHER'],
  '/api/admin/companies': ['ADMIN', 'TEACHER'], // Öğretmenler de company listesini görebilir
  // Company specific routes - allow companies to access their own data
  '/api/companies/': ['ADMIN', 'COMPANY'],
  // Teacher specific routes - allow teachers to access student data
  '/api/teachers/': ['ADMIN', 'TEACHER'],
  // General data routes that multiple roles might need
  '/api/data/': ['ADMIN', 'TEACHER', 'COMPANY']
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log(`🔍 MIDDLEWARE START:`, {
    pathname,
    method: request.method,
    timestamp: new Date().toISOString()
  })
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route) || pathname === route
  )
  
  console.log(`🌐 PUBLIC ROUTE CHECK:`, {
    pathname,
    isPublicRoute,
    publicRoutes,
    checkResults: publicRoutes.map(route => ({
      route,
      startsWith: pathname.startsWith(route),
      exact: pathname === route
    }))
  })
    
  // Allow specific search routes without authentication (for dropdown data)
  if (pathname === '/api/search/teachers' || pathname === '/api/search/companies') {
    console.log(`🔍 SEARCH API BYPASS:`, pathname)
    return NextResponse.next()
  }
    
  if (isPublicRoute) {
    console.log(`✅ PUBLIC ROUTE ALLOWED:`, pathname)
    return NextResponse.next()
  }

  console.log(`🔒 PROTECTED ROUTE:`, pathname)

  try {
    console.log(`🔍 GETTING TOKEN:`, {
      pathname,
      secret: secret ? 'SET' : 'NOT_SET',
      secureCookie: process.env.NODE_ENV === 'production'
    })

    // Get the token from the request
    const token = await getToken({
      req: request,
      secret,
      secureCookie: process.env.NODE_ENV === 'production'
    })

    console.log(`🔑 TOKEN RESULT:`, {
      pathname,
      tokenExists: !!token,
      tokenKeys: token ? Object.keys(token) : null,
      tokenData: token ? {
        sub: token.sub,
        role: token.role,
        companyId: token.companyId,
        teacherId: token.teacherId,
        email: token.email,
        name: token.name
      } : null
    })

    // If no token found, redirect to login
    if (!token) {
      console.warn(`🔒 NO TOKEN - REDIRECTING:`, {
        pathname,
        reason: 'No token found',
        timestamp: new Date().toISOString()
      })
      
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        console.log(`🚫 API ROUTE - RETURN 401:`, pathname)
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            path: pathname
          },
          { status: 401 }
        )
      }
      
      // Web routes redirect to appropriate login
      const loginUrl = pathname.startsWith('/admin')
        ? '/admin/login'
        : pathname.startsWith('/ogretmen')
        ? '/ogretmen/login'
        : pathname.startsWith('/isletme')
        ? '/isletme/login'
        : '/'
        
      const redirectUrl = new URL(loginUrl, request.url)
      redirectUrl.searchParams.set('callbackUrl', pathname)
      
      console.log(`🔄 WEB ROUTE - REDIRECTING:`, {
        from: pathname,
        to: loginUrl,
        redirectUrl: redirectUrl.toString(),
        reason: 'No token found'
      })
      
      return NextResponse.redirect(redirectUrl)
    }

    console.log(`✅ TOKEN FOUND:`, {
      pathname,
      role: token.role,
      userId: token.sub,
      companyId: token.companyId,
      teacherId: token.teacherId
    })

    // Check role-based access for API routes
    if (pathname.startsWith('/api/')) {
      const hasAccess = checkApiAccess(pathname, token.role as string)
      
      if (!hasAccess) {
        console.warn(`🚫 Forbidden access attempt by ${token.role} to: ${pathname}`)
        return NextResponse.json(
          { 
            error: 'Forbidden', 
            message: 'Insufficient permissions',
            requiredRoles: getRequiredRoles(pathname),
            userRole: token.role,
            timestamp: new Date().toISOString(),
            path: pathname
          }, 
          { status: 403 }
        )
      }
    }

    // Check role-based access for web routes
    if (!checkWebAccess(pathname, token.role as string, token)) {
      console.warn(`🚫 Forbidden web access attempt by ${token.role} to: ${pathname}`)
      
      // Redirect to appropriate dashboard
      const dashboardUrl = token.role === 'ADMIN'
        ? '/admin'
        : token.role === 'TEACHER'
        ? '/ogretmen/panel'
        : token.role === 'COMPANY'
        ? '/isletme'
        : '/'
        
      console.log(`🔄 DASHBOARD REDIRECT:`, {
        from: pathname,
        to: dashboardUrl,
        userRole: token.role,
        reason: 'Forbidden access'
      })
        
      return NextResponse.redirect(new URL(dashboardUrl, request.url))
    }

    // Add security headers
    const response = NextResponse.next()
    
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // Add user info to request headers for API routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('X-User-Id', token.sub || '')
      response.headers.set('X-User-Role', token.role as string || '')
      response.headers.set('X-User-Email', token.email || '')
    }

    return response

  } catch (error) {
    console.error('🔥 Authentication middleware error:', error)
    
    // API routes return 500
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Internal Server Error', 
          message: 'Authentication service temporarily unavailable',
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      )
    }
    
    // Web routes redirect to login
    return NextResponse.redirect(new URL('/', request.url))
  }
}

function checkApiAccess(pathname: string, userRole: string): boolean {
  // Check semi-protected routes first (more specific)
  for (const [routePrefix, allowedRoles] of Object.entries(semiProtectedApiRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      return allowedRoles.includes(userRole)
    }
  }
  
  // Check fully protected routes
  for (const [routePrefix, allowedRoles] of Object.entries(protectedApiRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      return allowedRoles.includes(userRole)
    }
  }
  
  // Default deny for unspecified API routes
  return false
}

function checkWebAccess(pathname: string, userRole: string, token?: any): boolean {
  // Debug: Web access kontrolü
  console.log(`🌐 WEB ACCESS CHECK:`, {
    pathname,
    userRole,
    hasToken: !!token,
    tokenInfo: token ? {
      sub: token.sub,
      companyId: token.companyId,
      teacherId: token.teacherId
    } : null
  })

  // Admin routes
  if (pathname.startsWith('/admin')) {
    return userRole === 'ADMIN'
  }
  
  // Teacher routes
  if (pathname.startsWith('/ogretmen')) {
    const isTeacher = userRole === 'TEACHER'
    console.log(`🎓 TEACHER ACCESS:`, { isTeacher, teacherId: token?.teacherId })
    return isTeacher
  }
  
  // Company routes
  if (pathname.startsWith('/isletme')) {
    const isCompany = userRole === 'COMPANY'
    console.log(`🏢 COMPANY ACCESS:`, { isCompany, companyId: token?.companyId })
    return isCompany
  }
  
  // Public web routes
  return true
}

function getRequiredRoles(pathname: string): string[] {
  // Check semi-protected routes first
  for (const [routePrefix, allowedRoles] of Object.entries(semiProtectedApiRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      return allowedRoles
    }
  }
  
  // Check fully protected routes
  for (const [routePrefix, allowedRoles] of Object.entries(protectedApiRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      return allowedRoles
    }
  }
  return ['ADMIN']
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}

// Cleanup expired rate limit records
setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  })
}, 5 * 60 * 1000) // Clean every 5 minutes

// GEÇICI OLARAK RATE LIMITING KODLARI KAPATILDI - MIDDLEWARE'İN ÇALIŞMASINI TEST EDİYORUZ
// Enhanced authentication and authorization validation for API routes with advanced rate limiting
export async function validateAuthAndRole(
  request: Request,
  allowedRoles: string[],
  options: {
    requireCompanyAccess?: boolean
    companyId?: string
    requireStudentAccess?: boolean
    studentId?: string
    endpoint?: 'auth' | 'file-upload' | 'financial' | 'messaging' | 'search' // Rate limiting endpoint type
  } = {}
): Promise<{ success: boolean; error?: string; status?: number; headers?: Headers; user?: any }> {
  try {
    const nextRequest = request as NextRequest
    
    // Get the token from the request
    const token = await getToken({
      req: nextRequest,
      secret,
      secureCookie: process.env.NODE_ENV === 'production'
    })

    // RATE LIMITING GEÇICI OLARAK DEVRE DIŞI
    // const rateLimitResult = await checkAdvancedRateLimit(
    //   nextRequest,
    //   token as any,
    //   options.endpoint
    // )
    
    const rateLimitResult = { allowed: true, headers: new Headers() }

    // Check if user is authenticated
    if (!token) {
      console.warn(`🚨 AUTH: No token found for ${nextRequest.url}`, {
        ip: nextRequest.headers.get('x-forwarded-for') || 'unknown',
        userAgent: nextRequest.headers.get('user-agent')?.substring(0, 100),
        timestamp: new Date().toISOString()
      })
      
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
        headers: rateLimitResult.headers
      }
    }

    // Check if user has required role
    const userRole = token.role as string
    if (!allowedRoles.includes(userRole)) {
      console.warn(`🚨 AUTHORIZATION: Role access denied`, {
        requiredRoles: allowedRoles,
        userRole,
        userId: token.sub,
        endpoint: options.endpoint,
        timestamp: new Date().toISOString()
      })
      
      return {
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`,
        status: 403,
        headers: rateLimitResult.headers
      }
    }

    console.log(`✅ AUTH SUCCESS: ${userRole} authenticated for ${options.endpoint || 'general'}`, {
      userId: token.sub,
      endpoint: options.endpoint,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      user: {
        id: token.sub,
        email: token.email,
        role: userRole,
        companyId: token.companyId,
        name: token.name
      },
      headers: rateLimitResult.headers
    }

  } catch (error) {
    console.error('🔥 Authentication validation error:', error)
    return {
      success: false,
      error: 'Authentication service temporarily unavailable',
      status: 500
    }
  }
}

export default authMiddleware