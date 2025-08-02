import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG, SECURITY_HEADERS, validateSecurityConfig } from '@/lib/security-config';
import { logSecurityEvent, SecurityLimits } from '@/lib/security-validation';

// IP validation
function validateClientIP(request: NextRequest): { isValid: boolean; reason?: string } {
  const clientIp = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  
  // Whitelist kontrolü
  if (SECURITY_CONFIG.IP_SECURITY.WHITELIST_IPS.length > 0) {
    if (!SECURITY_CONFIG.IP_SECURITY.WHITELIST_IPS.includes(clientIp)) {
      return { isValid: false, reason: 'IP not in whitelist' };
    }
  }
  
  // Blacklist kontrolü
  if (SECURITY_CONFIG.IP_SECURITY.BLACKLIST_IPS.includes(clientIp)) {
    return { isValid: false, reason: 'IP is blacklisted' };
  }
  
  // Production'da localhost kontrolü
  if (SECURITY_CONFIG.IP_SECURITY.BLOCK_LOCALHOST_PRODUCTION && 
      process.env.NODE_ENV === 'production' && 
      (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost')) {
    return { isValid: false, reason: 'Localhost access blocked in production' };
  }
  
  return { isValid: true };
}

// Request validation
function validateRequest(request: NextRequest): { isValid: boolean; reason?: string } {
  // User-Agent kontrolü
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    return { isValid: false, reason: 'Invalid or missing User-Agent' };
  }
  
  // Suspicious user agents
  const suspiciousUAs = ['curl', 'wget', 'python', 'bot', 'spider', 'crawler'];
  const lowerUA = userAgent.toLowerCase();
  if (suspiciousUAs.some(ua => lowerUA.includes(ua))) {
    // Allow in development, block in production
    if (process.env.NODE_ENV === 'production') {
      return { isValid: false, reason: 'Suspicious User-Agent detected' };
    }
  }
  
  // Content-Length kontrolü (DoS protection)
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const length = parseInt(contentLength);
    if (length > SECURITY_CONFIG.FILE_SECURITY.MAX_FILE_SIZE * 2) { // 2x buffer
      return { isValid: false, reason: 'Request too large' };
    }
  }
  
  // Suspicious headers kontrolü
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-forwarded-proto', 
    'x-forwarded-server',
    'x-cluster-client-ip'
  ];
  
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && value !== request.headers.get('host')) {
      console.warn(`⚠️ SECURITY: Suspicious header detected: ${header}=${value}`);
    }
  }
  
  return { isValid: true };
}

// Security headers uygula
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Security headers ekle
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // CORS headers
  if (SECURITY_CONFIG.CORS.ORIGIN !== '*') {
    response.headers.set('Access-Control-Allow-Origin', SECURITY_CONFIG.CORS.ORIGIN);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', SECURITY_CONFIG.CORS.CREDENTIALS.toString());
  response.headers.set('Access-Control-Allow-Methods', SECURITY_CONFIG.CORS.METHODS);
  response.headers.set('Access-Control-Allow-Headers', SECURITY_CONFIG.CORS.HEADERS);
  
  return response;
}

// Ana security middleware
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const url = request.url;
  
  try {
    // Configuration validation (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      const configValidation = validateSecurityConfig();
      if (!configValidation.isValid) {
        console.error('❌ SECURITY: Invalid configuration:', configValidation.errors);
      }
    }
    
    // IP validation
    const ipValidation = validateClientIP(request);
    if (!ipValidation.isValid) {
      await logSecurityEvent('', 'IP_BLOCKED', {
        ip: clientIp,
        reason: ipValidation.reason,
        url,
        userAgent
      }, 'WARNING');
      
      return new NextResponse('Access Denied', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Request validation
    const requestValidation = validateRequest(request);
    if (!requestValidation.isValid) {
      await logSecurityEvent('', 'INVALID_REQUEST', {
        ip: clientIp,
        reason: requestValidation.reason,
        url,
        userAgent,
        method
      }, 'WARNING');
      
      return new NextResponse('Bad Request', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // API rate limiting (sadece API routes için)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const rateLimitCheck = SecurityLimits.checkFailedAttemptsRateLimit(clientIp);
      if (!rateLimitCheck.isValid) {
        await logSecurityEvent('', 'GLOBAL_RATE_LIMIT_EXCEEDED', {
          ip: clientIp,
          url,
          userAgent
        }, 'WARNING');
        
        return new NextResponse('Rate Limit Exceeded', { 
          status: 429,
          headers: { 
            'Content-Type': 'text/plain',
            'Retry-After': '3600' // 1 hour
          }
        });
      }
    }
    
    // Request devam etsin
    const response = NextResponse.next();
    
    // Security headers uygula
    const secureResponse = applySecurityHeaders(response);
    
    // Request süresini log et (performans monitoring)
    const duration = Date.now() - startTime;
    if (duration > 5000) { // 5 saniyeden uzun requestler
      console.warn(`⚠️ SECURITY: Slow request detected: ${method} ${url} (${duration}ms)`);
    }
    
    return secureResponse;
    
  } catch (error) {
    console.error('❌ SECURITY: Security middleware error:', error);
    
    await logSecurityEvent('', 'SECURITY_MIDDLEWARE_ERROR', {
      ip: clientIp,
      url,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'ERROR');
    
    // Güvenlik hatası durumunda erişimi engelle
    return new NextResponse('Internal Security Error', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Error boundary wrapper
export function withSecurityErrorBoundary<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('❌ SECURITY: Function error caught:', error);
      
      // Security eventini log et
      await logSecurityEvent('system', 'FUNCTION_ERROR', {
        functionName: fn.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'ERROR');
      
      throw error; // Re-throw to maintain error handling chain
    }
  };
}

// Rate limit decorator
export function withRateLimit(
  limitType: 'analysis' | 'batch' | 'failed_attempt',
  getUserId?: (request: NextRequest) => Promise<string>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
      let identifier = clientIp;
      
      // Kullanıcı ID'si varsa onu kullan
      if (getUserId) {
        try {
          identifier = await getUserId(request);
        } catch (error) {
          // Fallback to IP
          identifier = clientIp;
        }
      }
      
      // Rate limit kontrolü
      let rateLimitCheck;
      switch (limitType) {
        case 'analysis':
          rateLimitCheck = SecurityLimits.checkAnalysisRateLimit(identifier);
          break;
        case 'batch':
          rateLimitCheck = SecurityLimits.checkBatchAnalysisRateLimit(identifier);
          break;
        case 'failed_attempt':
          rateLimitCheck = SecurityLimits.checkFailedAttemptsRateLimit(identifier);
          break;
        default:
          rateLimitCheck = { isValid: true };
      }
      
      if (!rateLimitCheck.isValid) {
        await logSecurityEvent(identifier, 'RATE_LIMIT_EXCEEDED', {
          limitType,
          ip: clientIp,
          url: request.url
        }, 'WARNING');
        
        return NextResponse.json(
          { error: rateLimitCheck.error },
          { status: 429 }
        );
      }
      
      return method.apply(this, [request, ...args]);
    };
    
    return descriptor;
  };
}

// Input sanitization decorator
export function withInputSanitization(sanitizeBody: boolean = true) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      if (sanitizeBody && request.method !== 'GET') {
        try {
          const body = await request.json();
          const { sanitizeAnalysisInput } = await import('@/lib/security-validation');
          
          // Body'yi sanitize et
          const sanitizedBody = sanitizeAnalysisInput(body);
          
          // Request'i yeniden oluştur (immutable olduğu için)
          const sanitizedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(sanitizedBody)
          });
          
          return method.apply(this, [sanitizedRequest, ...args]);
        } catch (error) {
          // JSON parse hatası - orijinal request'i kullan
          console.warn('⚠️ SECURITY: Could not parse request body for sanitization');
        }
      }
      
      return method.apply(this, [request, ...args]);
    };
    
    return descriptor;
  };
}

// Yardımcı fonksiyonlar

// IP geolocation kontrolü (opsiyonel)
export async function checkGeolocation(ip: string): Promise<{ allowed: boolean; country?: string }> {
  if (!SECURITY_CONFIG.IP_SECURITY.ENABLE_GEO_BLOCKING) {
    return { allowed: true };
  }
  
  try {
    // Burada gerçek bir geolocation servisini entegre edebilirsiniz
    // Örnek: MaxMind, IP2Location, vb.
    console.log(`🌍 SECURITY: Geo-blocking enabled but not implemented for IP: ${ip}`);
    return { allowed: true };
  } catch (error) {
    console.error('❌ SECURITY: Geolocation check failed:', error);
    return { allowed: true }; // Hata durumunda izin ver
  }
}

// DDoS protection helper
export function isDDoSPattern(requests: Array<{ timestamp: number; ip: string; url: string }>): boolean {
  const now = Date.now();
  const lastMinute = requests.filter(req => now - req.timestamp < 60000);
  
  // Son 1 dakikada 100'den fazla request = şüpheli
  if (lastMinute.length > 100) {
    return true;
  }
  
  // Aynı IP'den çok fazla request
  const ipCounts = lastMinute.reduce((acc, req) => {
    acc[req.ip] = (acc[req.ip] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxRequestsPerIP = Math.max(...Object.values(ipCounts));
  if (maxRequestsPerIP > 50) {
    return true;
  }
  
  return false;
}