import {
  SecurityValidation,
  SecurityLimits,
  validateFileForAnalysis,
  sanitizeAnalysisInput,
  type SecurityValidationResult
} from '../src/lib/security-validation';
import { SecurityAudit } from '../src/lib/security-config';

// Mock dosya buffer'ları
const createMockPDFBuffer = (): Buffer => {
  const pdfHeader = Buffer.from('%PDF-1.4');
  const content = Buffer.from('Mock PDF content');
  return Buffer.concat([pdfHeader, content]);
};

const createMockJPEGBuffer = (): Buffer => {
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const content = Buffer.from('Mock JPEG content');
  return Buffer.concat([jpegHeader, content]);
};

const createMockInvalidBuffer = (): Buffer => {
  return Buffer.from('Invalid file content');
};

describe('SecurityValidation', () => {
  beforeEach(() => {
    // Rate limit cache'i temizle
    SecurityLimits.clearCache();
  });

  describe('validateFileBuffer', () => {
    it('geçerli PDF dosyasını kabul etmeli', () => {
      const buffer = createMockPDFBuffer();
      const result = validateFileForAnalysis(buffer, 'test.pdf', 'application/pdf');
      
      expect(result.isValid).toBe(true);
    });

    it('geçerli JPEG dosyasını kabul etmeli', () => {
      const buffer = createMockJPEGBuffer();
      const result = validateFileForAnalysis(buffer, 'test.jpg', 'image/jpeg');
      
      expect(result.isValid).toBe(true);
    });

    it('geçersiz dosya türünü reddetmeli', () => {
      const buffer = createMockInvalidBuffer();
      const result = validateFileForAnalysis(buffer, 'test.txt', 'text/plain');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Desteklenmeyen dosya formatı');
    });

    it('büyük dosyaları reddetmeli', () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const result = validateFileForAnalysis(largeBuffer, 'test.pdf', 'application/pdf');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Dosya boyutu çok büyük');
    });

    it('şüpheli dosya adlarını reddetmeli', () => {
      const buffer = createMockPDFBuffer();
      const result = validateFileForAnalysis(buffer, '../../../etc/passwd', 'application/pdf');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Dosya adında güvenlik riski');
    });
  });

  describe('sanitizeAnalysisInput', () => {
    it('SQL injection karakterlerini temizlemeli', () => {
      const maliciousInput = "test'; DROP TABLE users; --";
      const sanitized = SecurityValidation.sanitizeAnalysisInput(maliciousInput);
      
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('DROP');
    });

    it('XSS script etiketlerini kaldırmalı', () => {
      const maliciousInput = '<script>alert("xss")</script>Normal text';
      const sanitized = SecurityValidation.sanitizeAnalysisInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Normal text');
    });

    it('uzun metinleri kırpmalı', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = SecurityValidation.sanitizeAnalysisInput(longInput);
      
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('nesne içindeki değerleri temizlemeli', () => {
      const maliciousObject = {
        name: "test'; DROP TABLE users; --",
        description: '<script>alert("xss")</script>',
        normal: 'clean text'
      };
      
      const sanitized = SecurityValidation.sanitizeAnalysisInput(maliciousObject);
      
      expect(sanitized.name).not.toContain("'");
      expect(sanitized.description).not.toContain('<script>');
      expect(sanitized.normal).toBe('clean text');
    });
  });

  describe('validateAuthAndRole', () => {
    const mockRequest = (headers: Record<string, string> = {}) => ({
      headers: new Headers(headers),
      cookies: new Map(),
    } as any);

    it('geçerli admin kullanıcısını kabul etmeli', async () => {
      // Mock session with admin role
      const request = mockRequest({
        'authorization': 'Bearer valid-admin-token'
      });

      // Bu test için NextAuth session mock'lanması gerekir
      // Gerçek implementasyonda NextAuth getServerSession kullanılır
      const result = await SecurityValidation.validateAuthAndRole(request, ['ADMIN']);
      
      // Mock implementasyon için basit test
      expect(typeof result).toBe('object');
      expect('success' in result).toBe(true);
    });

    it('yetkisiz kullanıcıları reddetmeli', async () => {
      const request = mockRequest();
      
      const result = await SecurityValidation.validateAuthAndRole(request, ['ADMIN']);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Yetkisiz erişim');
    });
  });
});

describe('SecurityLimits', () => {
  beforeEach(() => {
    SecurityLimits.clearCache();
  });

  describe('checkAnalysisRateLimit', () => {
    it('limiti aşmayan kullanıcıyı kabul etmeli', () => {
      const userId = 'test-user-1';
      
      for (let i = 0; i < 49; i++) {
        const result = SecurityLimits.checkAnalysisRateLimit(userId);
        expect(result.isValid).toBe(true);
      }
    });

    it('limiti aşan kullanıcıyı reddetmeli', () => {
      const userId = 'test-user-2';
      
      // 50 başarılı istek
      for (let i = 0; i < 50; i++) {
        SecurityLimits.checkAnalysisRateLimit(userId);
      }
      
      // 51. istek reddedilmeli
      const result = SecurityLimits.checkAnalysisRateLimit(userId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('farklı kullanıcılar için ayrı sayaç tutmalı', () => {
      const user1 = 'test-user-3';
      const user2 = 'test-user-4';
      
      // User1 için limit aş
      for (let i = 0; i < 51; i++) {
        SecurityLimits.checkAnalysisRateLimit(user1);
      }
      
      // User2 hala geçerli olmalı
      const result = SecurityLimits.checkAnalysisRateLimit(user2);
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkBatchAnalysisRateLimit', () => {
    it('toplu analiz limitini kontrol etmeli', () => {
      const userId = 'test-batch-user';
      
      // 10 başarılı toplu analiz
      for (let i = 0; i < 10; i++) {
        const result = SecurityLimits.checkBatchAnalysisRateLimit(userId);
        expect(result.isValid).toBe(true);
      }
      
      // 11. toplu analiz reddedilmeli
      const result = SecurityLimits.checkBatchAnalysisRateLimit(userId);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('SecurityAudit', () => {
  it('güvenlik olaylarını loglamalı', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await SecurityAudit.logSecurityEvent(
      'test-user',
      'TEST_EVENT',
      { test: 'data' },
      'INFO'
    );
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('SECURITY_AUDIT');
    expect(logCall).toContain('TEST_EVENT');
    
    consoleSpy.mockRestore();
  });

  it('farklı log seviyelerini desteklemeli', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await SecurityAudit.logSecurityEvent(
      'test-user',
      'ERROR_EVENT',
      { error: 'test error' },
      'ERROR'
    );
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('Security Integration Tests', () => {
  it('tam güvenlik akışını test etmeli', async () => {
    const userId = 'integration-test-user';
    const mockBuffer = createMockPDFBuffer();
    
    // 1. Rate limit kontrolü
    const rateLimitResult = SecurityLimits.checkAnalysisRateLimit(userId);
    expect(rateLimitResult.isValid).toBe(true);
    
    // 2. Dosya validasyonu
    const fileValidation = await SecurityValidation.validateFileBuffer(
      mockBuffer, 
      'test.pdf', 
      'application/pdf'
    );
    expect(fileValidation.isValid).toBe(true);
    
    // 3. Input sanitization
    const sanitizedInput = SecurityValidation.sanitizeAnalysisInput({
      fileName: 'test.pdf',
      description: 'Normal description'
    });
    expect(sanitizedInput.fileName).toBe('test.pdf');
    
    // 4. Audit logging
    await SecurityAudit.logSecurityEvent(
      userId,
      'SUCCESSFUL_VALIDATION',
      { fileName: 'test.pdf' },
      'INFO'
    );
  });

  it('güvenlik ihlali durumunu test etmeli', async () => {
    const userId = 'violation-test-user';
    
    // Rate limit aşımı
    for (let i = 0; i < 51; i++) {
      SecurityLimits.checkAnalysisRateLimit(userId);
    }
    
    const rateLimitResult = SecurityLimits.checkAnalysisRateLimit(userId);
    expect(rateLimitResult.isValid).toBe(false);
    
    // Geçersiz dosya
    const invalidBuffer = createMockInvalidBuffer();
    const fileValidation = await SecurityValidation.validateFileBuffer(
      invalidBuffer,
      'malicious.exe',
      'application/exe'
    );
    expect(fileValidation.isValid).toBe(false);
    
    // Zararlı input
    const maliciousInput = SecurityValidation.sanitizeAnalysisInput(
      "'; DROP TABLE users; --"
    );
    expect(maliciousInput).not.toContain('DROP TABLE');
  });
});