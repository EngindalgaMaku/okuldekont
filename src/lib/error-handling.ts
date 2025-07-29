/**
 * OKUL STAJ YÖNETİM SİSTEMİ - GELİŞMİŞ ERROR HANDLING VE LOGGING SİSTEMİ
 * 
 * Bu dosya sistemin güvenilirliği ve debugging için kritik olan error handling
 * ve logging implementasyonunu içerir.
 * 
 * Özellikler:
 * - Standardized error response format
 * - Correlation ID tracking
 * - Error categorization ve severity levels
 * - Security event logging
 * - Performance monitoring
 * - Production-ready error masking
 * 
 * @version 1.0.0
 * @author Okul Staj Sistemi
 */

import { NextResponse } from 'next/server'

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Standard error interface
export interface AppError {
  code: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  statusCode: number
  correlationId?: string
  context?: Record<string, any>
  stack?: string
  timestamp: string
  userId?: string
  userRole?: string
  endpoint?: string
  details?: Record<string, any>
}

// Error response format for clients
export interface ErrorResponse {
  error: {
    code: string
    message: string
    correlationId: string
    timestamp: string
    details?: Record<string, any>
  }
  success: false
}

// Security event interface  
export interface SecurityEvent {
  eventType: 'authentication_failed' | 'authorization_failed' | 'rate_limit_exceeded' | 
             'suspicious_activity' | 'file_upload_blocked' | 'sql_injection_attempt' |
             'xss_attempt' | 'csrf_attempt' | 'brute_force_attempt'
  severity: ErrorSeverity
  userId?: string
  userRole?: string
  ip: string
  userAgent?: string
  endpoint: string
  details: Record<string, any>
  timestamp: string
  correlationId: string
}

// Performance metrics interface
export interface PerformanceMetrics {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  userId?: string
  userRole?: string
  correlationId: string
  timestamp: string
  memoryUsage?: number
  dbQueryCount?: number
  dbQueryTime?: number
}

/**
 * Correlation ID generator for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Custom error classes
 */
export class AppErrorBase extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly statusCode: number
  public readonly correlationId: string
  public readonly context: Record<string, any>
  public readonly timestamp: string

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number,
    context: Record<string, any> = {},
    correlationId?: string
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.category = category
    this.severity = severity
    this.statusCode = statusCode
    this.correlationId = correlationId || generateCorrelationId()
    this.context = context
    this.timestamp = new Date().toISOString()

    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error classes
export class AuthenticationError extends AppErrorBase {
  constructor(message: string = 'Authentication failed', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'AUTH_FAILED',
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      context,
      correlationId
    )
  }
}

export class AuthorizationError extends AppErrorBase {
  constructor(message: string = 'Access denied', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'ACCESS_DENIED',
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      context,
      correlationId
    )
  }
}

export class ValidationError extends AppErrorBase {
  constructor(message: string = 'Validation failed', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'VALIDATION_FAILED',
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      context,
      correlationId
    )
  }
}

export class BusinessLogicError extends AppErrorBase {
  constructor(message: string, context: Record<string, any> = {}, correlationId?: string) {
    super(
      'BUSINESS_LOGIC_ERROR',
      message,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      422,
      context,
      correlationId
    )
  }
}

export class DatabaseError extends AppErrorBase {
  constructor(message: string = 'Database operation failed', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'DATABASE_ERROR',
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      context,
      correlationId
    )
  }
}

export class ExternalServiceError extends AppErrorBase {
  constructor(message: string = 'External service unavailable', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      message,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.MEDIUM,
      503,
      context,
      correlationId
    )
  }
}

export class RateLimitError extends AppErrorBase {
  constructor(message: string = 'Rate limit exceeded', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'RATE_LIMIT_EXCEEDED',
      message,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      429,
      context,
      correlationId
    )
  }
}

export class SecurityError extends AppErrorBase {
  constructor(message: string = 'Security violation detected', context: Record<string, any> = {}, correlationId?: string) {
    super(
      'SECURITY_VIOLATION',
      message,
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      403,
      context,
      correlationId
    )
  }
}

/**
 * Enhanced logger class
 */
export class Logger {
  private static instance: Logger
  private isDevelopment = process.env.NODE_ENV === 'development'

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Log general information
   */
  info(message: string, context: Record<string, any> = {}): void {
    const logEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }

    console.log(`ℹ️ INFO: ${message}`, this.isDevelopment ? logEntry : '')
  }

  /**
   * Log warning messages
   */
  warn(message: string, context: Record<string, any> = {}): void {
    const logEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }

    console.warn(`⚠️ WARN: ${message}`, this.isDevelopment ? logEntry : '')
  }

  /**
   * Log application errors
   */
  error(error: AppErrorBase | Error, context: Record<string, any> = {}): void {
    const logEntry: Record<string, any> = {
      level: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: this.isDevelopment ? error.stack : undefined,
      ...context
    }

    if (error instanceof AppErrorBase) {
      logEntry.code = error.code
      logEntry.category = error.category
      logEntry.severity = error.severity
      logEntry.correlationId = error.correlationId
      logEntry.context = error.context
    }

    console.error(`🚨 ERROR: ${error.message}`, logEntry)

    // Production'da external logging service'e gönderebiliriz
    if (!this.isDevelopment) {
      // this.sendToExternalLogger(logEntry)
    }
  }

  /**
   * Log security events
   */
  security(event: SecurityEvent): void {
    const logEntry = {
      level: 'security',
      ...event
    }

    console.error(`🛡️ SECURITY: ${event.eventType}`, logEntry)

    // Production'da derhal alert gönderilmeli
    if (!this.isDevelopment && event.severity === ErrorSeverity.CRITICAL) {
      // this.sendSecurityAlert(event)
    }
  }

  /**
   * Log performance metrics
   */
  performance(metrics: PerformanceMetrics): void {
    const logEntry = {
      level: 'performance',
      ...metrics
    }

    // Yavaş endpoint'leri logla
    if (metrics.duration > 1000) {
      console.warn(`🐌 SLOW: ${metrics.endpoint} took ${metrics.duration}ms`, logEntry)
    }

    // Development'da her request'i logla
    if (this.isDevelopment) {
      console.log(`📊 PERF: ${metrics.method} ${metrics.endpoint} - ${metrics.duration}ms`, logEntry)
    }
  }

  /**
   * Log database operations
   */
  database(operation: string, context: Record<string, any> = {}): void {
    const logEntry = {
      level: 'database',
      operation,
      timestamp: new Date().toISOString(),
      ...context
    }

    if (this.isDevelopment) {
      console.log(`🗄️ DB: ${operation}`, logEntry)
    }
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  private static logger = Logger.getInstance()

  /**
   * Handle application errors and return standardized response
   */
  static handleError(error: Error | AppErrorBase, correlationId?: string): NextResponse<ErrorResponse> {
    const finalCorrelationId = correlationId || generateCorrelationId()

    // Log the error
    this.logger.error(error, { correlationId: finalCorrelationId })

    // Create standardized error response
    if (error instanceof AppErrorBase) {
      return NextResponse.json<ErrorResponse>(
        {
          error: {
            code: error.code,
            message: this.sanitizeErrorMessage(error.message, error.severity),
            correlationId: error.correlationId,
            timestamp: error.timestamp,
            details: process.env.NODE_ENV === 'development' ? error.context : undefined
          },
          success: false
        },
        { status: error.statusCode }
      )
    }

    // Handle unknown errors
    const sanitizedMessage = this.sanitizeErrorMessage(error.message, ErrorSeverity.HIGH)
    
    return NextResponse.json<ErrorResponse>(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: sanitizedMessage,
          correlationId: finalCorrelationId,
          timestamp: new Date().toISOString()
        },
        success: false
      },
      { status: 500 }
    )
  }

  /**
   * Sanitize error messages for production
   */
  private static sanitizeErrorMessage(message: string, severity: ErrorSeverity): string {
    // Development'da tüm mesajları göster
    if (process.env.NODE_ENV === 'development') {
      return message
    }

    // Production'da hassas bilgileri gizle
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
      return 'An internal error occurred. Please try again later.'
    }

    // Low ve medium severity'lerde orijinal mesajı göster
    return message
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: any, correlationId?: string): NextResponse<ErrorResponse> {
    const finalCorrelationId = correlationId || generateCorrelationId()
    
    const validationError = new ValidationError(
      'Input validation failed',
      {
        issues: error.issues ? error.issues.map((issue: any) => ({
          path: issue.path ? issue.path.join('.') : 'unknown',
          message: issue.message || 'Validation error',
          code: issue.code || 'VALIDATION_ERROR'
        })) : [{ path: 'unknown', message: error.message || 'Validation failed', code: 'VALIDATION_ERROR' }]
      },
      finalCorrelationId
    )

    return this.handleError(validationError, finalCorrelationId)
  }

  /**
   * Handle Prisma database errors
   */
  static handlePrismaError(error: any, correlationId?: string): NextResponse<ErrorResponse> {
    const finalCorrelationId = correlationId || generateCorrelationId()
    
    let message = 'Database operation failed'
    let context: Record<string, any> = {}

    // Prisma-specific error handling
    if (error.code === 'P2002') {
      message = 'Record already exists'
      context = { constraint: error.meta?.target }
    } else if (error.code === 'P2025') {
      message = 'Record not found'
    } else if (error.code === 'P2003') {
      message = 'Foreign key constraint failed'
    }

    const dbError = new DatabaseError(message, context, finalCorrelationId)
    return this.handleError(dbError, finalCorrelationId)
  }

  /**
   * Log security events
   */
  static logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'correlationId'>, correlationId?: string): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || generateCorrelationId()
    }

    this.logger.security(securityEvent)
  }

  /**
   * Log performance metrics
   */
  static logPerformance(metrics: Omit<PerformanceMetrics, 'timestamp' | 'correlationId'>, correlationId?: string): void {
    const performanceMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
      correlationId: correlationId || generateCorrelationId()
    }

    this.logger.performance(performanceMetrics)
  }
}

/**
 * Async error wrapper for API routes
 */
export function asyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await fn(...args)
    } catch (error) {
      return ErrorHandler.handleError(error as Error)
    }
  }
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  endpoint: string,
  method: string = 'unknown'
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const correlationId = generateCorrelationId()
    
    try {
      const result = await fn(...args)
      
      const duration = Date.now() - startTime
      ErrorHandler.logPerformance({
        endpoint,
        method,
        duration,
        statusCode: 200
      }, correlationId)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      ErrorHandler.logPerformance({
        endpoint,
        method,
        duration,
        statusCode: error instanceof AppErrorBase ? error.statusCode : 500
      }, correlationId)
      
      throw error
    }
  }
}

/**
 * Export singleton logger instance
 */
export const logger = Logger.getInstance()