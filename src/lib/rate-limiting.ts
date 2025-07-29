/**
 * OKUL STAJ YÖNETİM SİSTEMİ - GELİŞMİŞ RATE LIMITİNG SİSTEMİ
 * 
 * Bu dosya sistemin güvenliği için kritik olan rate limiting implementasyonunu içerir.
 * DDoS saldırıları, brute force saldırıları ve API abuse'unu önlemek için kullanılır.
 * 
 * Özellikler:
 * - Sliding window rate limiting
 * - Role-based rate limits
 * - Endpoint-specific limits
 * - IP-based ve user-based rate limiting
 * - Memory-efficient storage
 * 
 * @version 1.0.0
 * @author Okul Staj Sistemi
 */

import { NextRequest } from 'next/server'

// Rate limiting configuration types
export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  message?: string
}

export interface UserRole {
  ADMIN: 'ADMIN'
  TEACHER: 'TEACHER'
  COMPANY: 'COMPANY'
  USER: 'USER'
}

// Different rate limits for different user roles and endpoints
export const RATE_LIMIT_CONFIGS = {
  // Genel API rate limits (role-based)
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,         // Admin'ler için yüksek limit
    message: 'Admin rate limit exceeded'
  },
  TEACHER: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,          // Öğretmenler için orta limit
    message: 'Teacher rate limit exceeded'
  },
  COMPANY: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300,          // Şirketler için orta limit
    message: 'Company rate limit exceeded'
  },
  USER: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,          // Kullanıcılar için düşük limit
    message: 'User rate limit exceeded'
  },
  
  // Endpoint-specific rate limits
  AUTHENTICATION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // Login attempts - very restrictive
    message: 'Too many authentication attempts. Please try again later.'
  },
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,           // File uploads per hour
    message: 'File upload rate limit exceeded'
  },
  FINANCIAL_OPERATIONS: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 10,           // Financial operations - very restrictive
    message: 'Financial operations rate limit exceeded'
  },
  MESSAGING: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,           // Messages per minute
    message: 'Messaging rate limit exceeded'
  },
  SEARCH: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,           // Search requests per minute
    message: 'Search rate limit exceeded'
  },
  
  // IP-based rate limits (for unauthenticated requests)
  IP_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,          // General IP limit
    message: 'IP rate limit exceeded'
  },
  IP_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // Login attempts per IP
    message: 'Too many login attempts from this IP'
  }
} as const

// In-memory store for rate limiting (production'da Redis kullanılmalı)
interface RateLimitStore {
  [key: string]: {
    requests: number[]
    lastReset: number
  }
}

class RateLimitManager {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Her 5 dakikada bir eski kayıtları temizle
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Rate limit kontrolü yapar
   */
  async checkRateLimit(
    key: string, 
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Store'dan kullanıcının request history'sini al
    if (!this.store[key]) {
      this.store[key] = {
        requests: [],
        lastReset: now
      }
    }

    const userStore = this.store[key]

    // Window dışındaki eski request'leri temizle
    userStore.requests = userStore.requests.filter(timestamp => timestamp > windowStart)

    // Mevcut request sayısını kontrol et
    const currentRequests = userStore.requests.length
    const allowed = currentRequests < config.maxRequests

    if (allowed) {
      // Yeni request'i ekle
      userStore.requests.push(now)
    }

    const remaining = Math.max(0, config.maxRequests - currentRequests - (allowed ? 1 : 0))
    const resetTime = Math.max(...userStore.requests, windowStart) + config.windowMs

    return {
      allowed,
      remaining,
      resetTime
    }
  }

  /**
   * Belirli bir key için rate limit'i sıfırlar
   */
  resetRateLimit(key: string): void {
    delete this.store[key]
  }

  /**
   * Eski kayıtları temizler
   */
  private cleanup(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 saat

    Object.keys(this.store).forEach(key => {
      const userStore = this.store[key]
      if (now - userStore.lastReset > maxAge) {
        delete this.store[key]
      }
    })

    console.log(`🧹 RATE LIMITING: Cleanup completed. Active keys: ${Object.keys(this.store).length}`)
  }

  /**
   * İstatistikleri döndürür
   */
  getStats(): { totalKeys: number; totalRequests: number } {
    const totalKeys = Object.keys(this.store).length
    const totalRequests = Object.values(this.store).reduce(
      (sum, userStore) => sum + userStore.requests.length, 
      0
    )

    return { totalKeys, totalRequests }
  }

  /**
   * Cleanup interval'ını temizler
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Global rate limit manager instance
export const rateLimitManager = new RateLimitManager()

/**
 * Key generator functions
 */
export const keyGenerators = {
  /**
   * IP-based key generator
   */
  byIP: (req: NextRequest): string => {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               req.headers.get('x-real-ip') || 
               'unknown'
    return `ip:${ip}`
  },

  /**
   * User-based key generator
   */
  byUser: (req: NextRequest, userId: string): string => {
    return `user:${userId}`
  },

  /**
   * User + endpoint key generator
   */
  byUserEndpoint: (req: NextRequest, userId: string, endpoint: string): string => {
    return `user:${userId}:endpoint:${endpoint}`
  },

  /**
   * IP + endpoint key generator
   */
  byIPEndpoint: (req: NextRequest, endpoint: string): string => {
    const ip = keyGenerators.byIP(req).replace('ip:', '')
    return `ip:${ip}:endpoint:${endpoint}`
  }
}

/**
 * Rate limiting result interface
 */
export interface RateLimitResult {
  success: boolean
  error?: string
  remaining?: number
  resetTime?: number
  retryAfter?: number
}

/**
 * Ana rate limiting function
 */
export async function applyRateLimit(
  req: NextRequest,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const result = await rateLimitManager.checkRateLimit(key, config)

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
      
      console.warn(`🚨 RATE LIMIT: Exceeded for key ${key}`, {
        limit: config.maxRequests,
        window: config.windowMs,
        resetTime: new Date(result.resetTime).toISOString(),
        retryAfter,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        error: config.message || 'Rate limit exceeded',
        remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter
      }
    }

    return {
      success: true,
      remaining: result.remaining,
      resetTime: result.resetTime
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Rate limiting hatası durumunda request'e izin ver
    return { success: true }
  }
}

/**
 * Express-style rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (req: NextRequest, key?: string): Promise<RateLimitResult> => {
    const rateLimitKey = key || (config.keyGenerator ? config.keyGenerator(req) : keyGenerators.byIP(req))
    return applyRateLimit(req, rateLimitKey, config)
  }
}

/**
 * Endpoint-specific rate limiting helpers
 */
export const rateLimiters = {
  authentication: createRateLimit(RATE_LIMIT_CONFIGS.AUTHENTICATION),
  fileUpload: createRateLimit(RATE_LIMIT_CONFIGS.FILE_UPLOAD),
  financial: createRateLimit(RATE_LIMIT_CONFIGS.FINANCIAL_OPERATIONS),
  messaging: createRateLimit(RATE_LIMIT_CONFIGS.MESSAGING),
  search: createRateLimit(RATE_LIMIT_CONFIGS.SEARCH),
  ipGeneral: createRateLimit(RATE_LIMIT_CONFIGS.IP_GENERAL),
  ipLogin: createRateLimit(RATE_LIMIT_CONFIGS.IP_LOGIN)
}

/**
 * Rate limit headers oluşturur
 */
export function createRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig) {
  const headers = new Headers()
  
  if (result.remaining !== undefined) {
    headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
  }
  
  if (result.resetTime) {
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  }
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return headers
}

/**
 * Development/debugging için rate limit bilgilerini loglar
 */
export function logRateLimitInfo(): void {
  const stats = rateLimitManager.getStats()
  console.log(`📊 RATE LIMITING: Current stats - Keys: ${stats.totalKeys}, Requests: ${stats.totalRequests}`)
}