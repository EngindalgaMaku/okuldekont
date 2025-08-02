// Güvenlik konfigürasyonu ve sabitler

export const SECURITY_CONFIG = {
  // Rate limiting ayarları
  RATE_LIMITS: {
    ANALYSIS_PER_HOUR: parseInt(process.env.ANALYSIS_RATE_LIMIT_PER_HOUR || '50'),
    BATCH_ANALYSIS_PER_HOUR: parseInt(process.env.BATCH_ANALYSIS_RATE_LIMIT_PER_HOUR || '10'),
    FAILED_ATTEMPTS_PER_HOUR: parseInt(process.env.FAILED_ATTEMPTS_RATE_LIMIT_PER_HOUR || '20'),
    LOGIN_ATTEMPTS_PER_HOUR: parseInt(process.env.LOGIN_RATE_LIMIT_PER_HOUR || '10')
  },
  
  // Dosya güvenlik ayarları
  FILE_SECURITY: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024, // MB to bytes
    MAX_BATCH_SIZE: parseInt(process.env.MAX_BATCH_SIZE || '20'),
    ALLOWED_EXTENSIONS: (process.env.ALLOWED_FILE_EXTENSIONS || 'pdf,jpg,jpeg,png,webp').split(','),
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ]
  },
  
  // OCR güvenlik ayarları
  OCR_SECURITY: {
    MIN_CONFIDENCE_THRESHOLD: parseInt(process.env.OCR_MIN_CONFIDENCE || '60'),
    MAX_TEXT_LENGTH: parseInt(process.env.OCR_MAX_TEXT_LENGTH || '50000'),
    SUSPICIOUS_PATTERN_THRESHOLD: parseFloat(process.env.OCR_SUSPICIOUS_THRESHOLD || '0.8')
  },
  
  // AI analiz güvenlik ayarları
  AI_SECURITY: {
    MIN_RELIABILITY_THRESHOLD: parseFloat(process.env.AI_MIN_RELIABILITY || '0.3'),
    MAX_FORGERY_RISK_THRESHOLD: parseFloat(process.env.AI_MAX_FORGERY_RISK || '0.7'),
    SECURITY_FLAG_THRESHOLD: parseFloat(process.env.AI_SECURITY_FLAG_THRESHOLD || '0.5')
  },
  
  // Audit log ayarları
  AUDIT: {
    ENABLED: process.env.SECURITY_AUDIT_ENABLED === 'true',
    LOG_LEVEL: process.env.SECURITY_LOG_LEVEL || 'INFO', // INFO, WARNING, ERROR
    RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
    LOG_TO_FILE: process.env.AUDIT_LOG_TO_FILE === 'true',
    LOG_FILE_PATH: process.env.AUDIT_LOG_FILE_PATH || './logs/security-audit.log'
  },
  
  // IP güvenlik ayarları
  IP_SECURITY: {
    BLOCK_LOCALHOST_PRODUCTION: process.env.BLOCK_LOCALHOST_IN_PRODUCTION === 'true',
    WHITELIST_IPS: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [],
    BLACKLIST_IPS: process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [],
    ENABLE_GEO_BLOCKING: process.env.ENABLE_GEO_BLOCKING === 'true'
  },
  
  // CORS ve güvenlik headers
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
    CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
    METHODS: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
    HEADERS: process.env.CORS_HEADERS || 'Content-Type,Authorization,X-Requested-With'
  },
  
  // Encryption ayarları
  ENCRYPTION: {
    ALGORITHM: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    KEY_LENGTH: parseInt(process.env.ENCRYPTION_KEY_LENGTH || '32'),
    IV_LENGTH: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16')
  },
  
  // Session güvenlik ayarları
  SESSION: {
    MAX_AGE_HOURS: parseInt(process.env.SESSION_MAX_AGE_HOURS || '24'),
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
    SAME_SITE: process.env.COOKIE_SAME_SITE || 'strict',
    HTTP_ONLY: true
  }
};

// Environment validation
export function validateSecurityConfig() {
  const errors: string[] = [];
  
  // Required environment variables
  const required = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL'
  ];
  
  for (const env of required) {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  }
  
  // Validate numeric values
  if (SECURITY_CONFIG.FILE_SECURITY.MAX_FILE_SIZE < 1024) {
    errors.push('MAX_FILE_SIZE_MB must be at least 1MB');
  }
  
  if (SECURITY_CONFIG.FILE_SECURITY.MAX_BATCH_SIZE < 1 || SECURITY_CONFIG.FILE_SECURITY.MAX_BATCH_SIZE > 100) {
    errors.push('MAX_BATCH_SIZE must be between 1 and 100');
  }
  
  if (SECURITY_CONFIG.OCR_SECURITY.MIN_CONFIDENCE_THRESHOLD < 0 || SECURITY_CONFIG.OCR_SECURITY.MIN_CONFIDENCE_THRESHOLD > 100) {
    errors.push('OCR_MIN_CONFIDENCE must be between 0 and 100');
  }
  
  // Validate AI thresholds
  if (SECURITY_CONFIG.AI_SECURITY.MIN_RELIABILITY_THRESHOLD < 0 || SECURITY_CONFIG.AI_SECURITY.MIN_RELIABILITY_THRESHOLD > 1) {
    errors.push('AI_MIN_RELIABILITY must be between 0 and 1');
  }
  
  if (SECURITY_CONFIG.AI_SECURITY.MAX_FORGERY_RISK_THRESHOLD < 0 || SECURITY_CONFIG.AI_SECURITY.MAX_FORGERY_RISK_THRESHOLD > 1) {
    errors.push('AI_MAX_FORGERY_RISK must be between 0 and 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
};

// Dosya analiz istatistikleri için güvenli thresholdlar
export const ANALYSIS_THRESHOLDS = {
  // OCR güvenilirlik seviyesi
  OCR_CONFIDENCE: {
    EXCELLENT: 95,
    GOOD: 85,
    ACCEPTABLE: 70,
    POOR: 50
  },
  
  // AI güvenirlik seviyesi
  AI_RELIABILITY: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
    VERY_LOW: 0.2
  },
  
  // Sahtelik riski seviyesi
  FORGERY_RISK: {
    VERY_LOW: 0.1,
    LOW: 0.3,
    MEDIUM: 0.5,
    HIGH: 0.7,
    VERY_HIGH: 0.9
  },
  
  // Veri tutarlılığı seviyesi
  DATA_CONSISTENCY: {
    EXCELLENT: 0.9,
    GOOD: 0.7,
    ACCEPTABLE: 0.5,
    POOR: 0.3
  }
};

// Güvenlik event tipleri
export const SECURITY_EVENT_TYPES = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization events
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_ESCALATION_ATTEMPT: 'ROLE_ESCALATION_ATTEMPT',
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ANALYSIS_RATE_LIMIT_EXCEEDED: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
  BATCH_ANALYSIS_RATE_LIMIT_EXCEEDED: 'BATCH_ANALYSIS_RATE_LIMIT_EXCEEDED',
  
  // File security events
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  SUSPICIOUS_FILE_CONTENT: 'SUSPICIOUS_FILE_CONTENT',
  MALWARE_DETECTED: 'MALWARE_DETECTED',
  
  // Analysis security events
  ANALYSIS_SUCCESS: 'ANALYSIS_SUCCESS',
  ANALYSIS_FAILURE: 'ANALYSIS_FAILURE',
  HIGH_FORGERY_RISK_DETECTED: 'HIGH_FORGERY_RISK_DETECTED',
  LOW_OCR_CONFIDENCE: 'LOW_OCR_CONFIDENCE',
  DATA_INCONSISTENCY_DETECTED: 'DATA_INCONSISTENCY_DETECTED',
  
  // System security events
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  CSRF_ATTEMPT: 'CSRF_ATTEMPT',
  SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
  
  // Data events
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_DELETION: 'DATA_DELETION',
  BULK_OPERATION: 'BULK_OPERATION',
  
  // System events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'
} as const;

// Event severity levels
export const SEVERITY_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING', 
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
} as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[keyof typeof SECURITY_EVENT_TYPES];
export type SeverityLevel = typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];

/**
 * SecurityAudit namespace - audit logging functionality
 */
export const SecurityAudit = {
  logSecurityEvent: async (
    userId: string,
    action: string,
    details: any,
    severity: SeverityLevel = 'INFO'
  ) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action,
        details,
        severity,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown'
      };
      
      // Console log with color coding
      const severityColors = {
        INFO: '\x1b[36m',    // Cyan
        WARNING: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m',   // Red
        CRITICAL: '\x1b[35m' // Magenta
      };
      
      const color = severityColors[severity] || '\x1b[0m';
      const reset = '\x1b[0m';
      
      console.log(`${color}🔒 SECURITY_AUDIT [${severity}]: ${action}${reset}`, logEntry);
      
      // In production, you might want to send to external logging service
      if (SECURITY_CONFIG.AUDIT.ENABLED && severity !== 'INFO') {
        // Example: await externalLogService.log(logEntry);
      }
      
    } catch (error) {
      console.error('❌ SECURITY: Failed to log security event:', error);
    }
  }
};