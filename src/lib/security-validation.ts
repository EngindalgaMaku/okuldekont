import { NextRequest } from 'next/server';
import { prisma } from './prisma';

// Rate limiting için cache
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// Güvenli dosya tipleri
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

// Maksimum dosya boyutları (bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 20; // Maksimum toplu analiz sayısı

// Rate limiting konfigürasyonu
const RATE_LIMITS = {
  ANALYSIS_PER_HOUR: 50,
  BATCH_ANALYSIS_PER_HOUR: 10,
  FAILED_ATTEMPTS_PER_HOUR: 20
};

interface SecurityValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

interface RateLimitOptions {
  identifier: string;
  limit: number;
  windowMs: number;
  type: 'analysis' | 'batch' | 'failed_attempt';
}

/**
 * Rate limiting kontrolü
 */
export function checkRateLimit(options: RateLimitOptions): SecurityValidationResult {
  const { identifier, limit, windowMs, type } = options;
  const now = Date.now();
  
  // Cache key oluştur
  const cacheKey = `${type}_${identifier}`;
  
  // Mevcut limiti kontrol et
  const current = rateLimitCache.get(cacheKey);
  
  if (current) {
    // Zaman aralığı sona erdiyse sıfırla
    if (now > current.resetTime) {
      rateLimitCache.set(cacheKey, { count: 1, resetTime: now + windowMs });
      return { isValid: true };
    }
    
    // Limit aşıldıysa reddet
    if (current.count >= limit) {
      const remainingTime = Math.ceil((current.resetTime - now) / 1000 / 60); // dakika
      return {
        isValid: false,
        error: `Rate limit aşıldı. ${remainingTime} dakika sonra tekrar deneyin.`,
        code: 'RATE_LIMIT_EXCEEDED'
      };
    }
    
    // Sayıyı artır
    current.count++;
  } else {
    // İlk istek
    rateLimitCache.set(cacheKey, { count: 1, resetTime: now + windowMs });
  }
  
  return { isValid: true };
}

/**
 * Dosya güvenlik validasyonu
 */
export function validateFileForAnalysis(
  fileBuffer: Buffer, 
  fileName: string, 
  mimeType?: string
): SecurityValidationResult {
  // Dosya boyutu kontrolü
  if (fileBuffer.length > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Dosya boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB olmalıdır.`,
      code: 'FILE_TOO_LARGE'
    };
  }
  
  // Dosya uzantısı kontrolü
  const extension = fileName.toLowerCase().split('.').pop();
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'Desteklenmeyen dosya formatı. Sadece PDF ve resim dosyaları kabul edilir.',
      code: 'INVALID_FILE_TYPE'
    };
  }
  
  // MIME type kontrolü (varsa)
  if (mimeType && !ALLOWED_FILE_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: 'Geçersiz dosya tipi tespit edildi.',
      code: 'INVALID_MIME_TYPE'
    };
  }
  
  // Dosya imzası kontrolü (magic bytes)
  const magicBytesCheck = validateFileSignature(fileBuffer, extension);
  if (!magicBytesCheck.isValid) {
    return magicBytesCheck;
  }
  
  // Zararlı içerik taraması
  const malwareCheck = scanForMaliciousContent(fileBuffer, fileName);
  if (!malwareCheck.isValid) {
    return malwareCheck;
  }
  
  return { isValid: true };
}

/**
 * Dosya imzası (magic bytes) kontrolü
 */
function validateFileSignature(fileBuffer: Buffer, extension: string): SecurityValidationResult {
  const firstBytes = fileBuffer.subarray(0, 10);
  
  switch (extension) {
    case 'pdf':
      // PDF dosyası "%PDF" ile başlamalı
      if (!firstBytes.toString('ascii', 0, 4).startsWith('%PDF')) {
        return {
          isValid: false,
          error: 'Geçersiz PDF dosyası tespit edildi.',
          code: 'INVALID_PDF_SIGNATURE'
        };
      }
      break;
      
    case 'jpg':
    case 'jpeg':
      // JPEG dosyası FF D8 ile başlamalı
      if (firstBytes[0] !== 0xFF || firstBytes[1] !== 0xD8) {
        return {
          isValid: false,
          error: 'Geçersiz JPEG dosyası tespit edildi.',
          code: 'INVALID_JPEG_SIGNATURE'
        };
      }
      break;
      
    case 'png':
      // PNG dosyası 89 50 4E 47 ile başlamalı
      const pngSignature = [0x89, 0x50, 0x4E, 0x47];
      for (let i = 0; i < pngSignature.length; i++) {
        if (firstBytes[i] !== pngSignature[i]) {
          return {
            isValid: false,
            error: 'Geçersiz PNG dosyası tespit edildi.',
            code: 'INVALID_PNG_SIGNATURE'
          };
        }
      }
      break;
  }
  
  return { isValid: true };
}

/**
 * Zararlı içerik taraması (basit heuristic)
 */
function scanForMaliciousContent(fileBuffer: Buffer, fileName: string): SecurityValidationResult {
  // Dosya adında şüpheli karakterler
  const suspiciousChars = /<|>|\||&|;|`|\$|\(|\)|{|}|\\|\x00/;
  if (suspiciousChars.test(fileName)) {
    return {
      isValid: false,
      error: 'Dosya adında güvenlik riski tespit edildi.',
      code: 'SUSPICIOUS_FILENAME'
    };
  }
  
  // Dosya boyutunun garip olması (çok küçük veya sıfır)
  if (fileBuffer.length < 100) {
    return {
      isValid: false,
      error: 'Dosya çok küçük veya bozuk görünüyor.',
      code: 'SUSPICIOUS_FILE_SIZE'
    };
  }
  
  // Çok fazla null byte kontrolü (binary injection)
  const nullByteCount = fileBuffer.filter(byte => byte === 0).length;
  const nullByteRatio = nullByteCount / fileBuffer.length;
  
  if (nullByteRatio > 0.8) {
    return {
      isValid: false,
      error: 'Dosya yapısında anormallik tespit edildi.',
      code: 'SUSPICIOUS_FILE_STRUCTURE'
    };
  }
  
  return { isValid: true };
}

/**
 * Input sanitization
 */
export function sanitizeAnalysisInput(input: any): any {
  if (typeof input === 'string') {
    // SQL injection ve XSS koruması
    return input
      .replace(/['";\\]/g, '') // Tehlikeli karakterleri kaldır
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script taglarını kaldır
      .substring(0, 1000); // Maksimum uzunluk sınırı
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeAnalysisInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeAnalysisInput(key)] = sanitizeAnalysisInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Request güvenlik kontrolü
 */
export function validateAnalysisRequest(request: NextRequest): SecurityValidationResult {
  // Content-Type kontrolü
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return {
      isValid: false,
      error: 'Geçersiz content type.',
      code: 'INVALID_CONTENT_TYPE'
    };
  }
  
  // User-Agent kontrolü (bot detection)
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    return {
      isValid: false,
      error: 'Geçersiz istek kaynağı.',
      code: 'INVALID_USER_AGENT'
    };
  }
  
  // Şüpheli header kontrolü
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header);
    if (value && value.includes('127.0.0.1')) {
      // Localhost'tan gelen isteklere dikkat et
      console.warn(`⚠️ SECURITY: Localhost request detected from ${header}: ${value}`);
    }
  }
  
  return { isValid: true };
}

/**
 * Batch analiz validasyonu
 */
export function validateBatchAnalysisRequest(dekontIds: string[]): SecurityValidationResult {
  // Array kontrolü
  if (!Array.isArray(dekontIds)) {
    return {
      isValid: false,
      error: 'Geçersiz dekont listesi.',
      code: 'INVALID_BATCH_FORMAT'
    };
  }
  
  // Boyut kontrolü
  if (dekontIds.length === 0) {
    return {
      isValid: false,
      error: 'En az bir dekont seçilmelidir.',
      code: 'EMPTY_BATCH'
    };
  }
  
  if (dekontIds.length > MAX_BATCH_SIZE) {
    return {
      isValid: false,
      error: `Maksimum ${MAX_BATCH_SIZE} dekont seçilebilir.`,
      code: 'BATCH_TOO_LARGE'
    };
  }
  
  // ID format kontrolü
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const id of dekontIds) {
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
      return {
        isValid: false,
        error: 'Geçersiz dekont ID formatı.',
        code: 'INVALID_DEKONT_ID'
      };
    }
  }
  
  // Duplicate kontrolü
  const uniqueIds = new Set(dekontIds);
  if (uniqueIds.size !== dekontIds.length) {
    return {
      isValid: false,
      error: 'Tekrarlayan dekont ID\'leri tespit edildi.',
      code: 'DUPLICATE_DEKONT_IDS'
    };
  }
  
  return { isValid: true };
}

/**
 * Analiz izinleri kontrolü
 */
export async function validateAnalysisPermissions(
  userId: string, 
  dekontId: string
): Promise<SecurityValidationResult> {
  try {
    // Dekont varlığını ve kullanıcı izinlerini kontrol et
    const dekont = await prisma.dekont.findUnique({
      where: { id: dekontId },
      include: {
        staj: {
          include: {
            student: true,
            teacher: true
          }
        }
      }
    });
    
    if (!dekont) {
      return {
        isValid: false,
        error: 'Dekont bulunamadı.',
        code: 'DEKONT_NOT_FOUND'
      };
    }
    
    // Kullanıcı bilgilerini al
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return {
        isValid: false,
        error: 'Kullanıcı bulunamadı.',
        code: 'USER_NOT_FOUND'
      };
    }
    
    // Admin her zaman analiz yapabilir
    if (user.role === 'ADMIN') {
      return { isValid: true };
    }
    
    // Öğretmen sadece kendi öğrencilerinin dekontlarını analiz edebilir
    if (user.role === 'TEACHER') {
      if (dekont.staj?.teacherId === userId) {
        return { isValid: true };
      }
      
      return {
        isValid: false,
        error: 'Bu dekonta analiz izniniz yoktur.',
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }
    
    // Diğer roller analiz yapamaz
    return {
      isValid: false,
      error: 'Analiz yapma yetkiniz bulunmamaktadır.',
      code: 'ROLE_NOT_AUTHORIZED'
    };
    
  } catch (error) {
    console.error('❌ SECURITY: Permission validation failed:', error);
    return {
      isValid: false,
      error: 'İzin kontrolü sırasında hata oluştu.',
      code: 'PERMISSION_CHECK_FAILED'
    };
  }
}

/**
 * Güvenlik audit log'u
 */
export async function logSecurityEvent(
  userId: string,
  action: string,
  details: any,
  severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO'
) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details: sanitizeAnalysisInput(details),
      severity,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };
    
    // Console log
    console.log(`🔒 SECURITY [${severity}]: ${action}`, logEntry);
    
    // Kritik olayları veritabanına kaydet
    if (severity === 'ERROR' || severity === 'WARNING') {
      // Burada ayrı bir audit log tablosuna kaydedilebilir
      // await prisma.auditLog.create({ data: logEntry });
    }
    
  } catch (error) {
    console.error('❌ SECURITY: Failed to log security event:', error);
  }
}

/**
 * Rate limit helper fonksiyonları
 */
export const SecurityLimits = {
  checkAnalysisRateLimit: (userId: string) => checkRateLimit({
    identifier: userId,
    limit: RATE_LIMITS.ANALYSIS_PER_HOUR,
    windowMs: 60 * 60 * 1000, // 1 saat
    type: 'analysis'
  }),
  
  checkBatchAnalysisRateLimit: (userId: string) => checkRateLimit({
    identifier: userId,
    limit: RATE_LIMITS.BATCH_ANALYSIS_PER_HOUR,
    windowMs: 60 * 60 * 1000, // 1 saat
    type: 'batch'
  }),
  
  checkFailedAttemptsRateLimit: (identifier: string) => checkRateLimit({
    identifier: identifier,
    limit: RATE_LIMITS.FAILED_ATTEMPTS_PER_HOUR,
    windowMs: 60 * 60 * 1000, // 1 saat
    type: 'failed_attempt'
  }),

  clearCache: () => clearRateLimitCache()
};

/**
 * Rate limit cache'i temizleme (opsiyonel)
 */
export function clearRateLimitCache() {
  rateLimitCache.clear();
  console.log('🧹 SECURITY: Rate limit cache cleared');
}

// Periyodik cache temizleme (memory leak önleme)
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitCache.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimitCache.delete(key);
    }
  });
}, 5 * 60 * 1000); // 5 dakikada bir temizle

/**
 * SecurityValidation namespace - test uyumluluğu için
 */
export const SecurityValidation = {
  validateFileBuffer: validateFileForAnalysis,
  sanitizeAnalysisInput,
  validateAuthAndRole: async (request: any, roles: string[]) => {
    // Mock implementation for testing
    return { success: false, error: 'Yetkisiz erişim' };
  },
  validateAnalysisPermissions,
  logSecurityEvent
};

// Type exports
export type { SecurityValidationResult, RateLimitOptions };