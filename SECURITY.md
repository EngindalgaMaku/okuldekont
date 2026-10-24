# Güvenlik Dokümantasyonu

Bu doküman, Okul Dekont OCR ve AI Analiz Sistemi'nin güvenlik özelliklerini ve implementasyonunu açıklar.

## İçindekiler

1. [Güvenlik Özellikleri](#güvenlik-özellikleri)
2. [Konfigürasyon](#konfigürasyon)
3. [API Güvenliği](#api-güvenliği)
4. [Dosya Güvenliği](#dosya-güvenliği)
5. [Rate Limiting](#rate-limiting)
6. [Audit Logging](#audit-logging)
7. [Input Validation](#input-validation)
8. [Error Handling](#error-handling)
9. [Güvenlik Kontrol Listesi](#güvenlik-kontrol-listesi)

## Güvenlik Özellikleri

### 1. Kimlik Doğrulama ve Yetkilendirme
- NextAuth.js tabanlı güvenli kimlik doğrulama
- Role-based access control (RBAC)
- Session management ve güvenli çerezler
- Admin/Teacher role kontrolü

### 2. Rate Limiting
- IP bazlı rate limiting
- Kullanıcı bazlı rate limiting
- Farklı endpoint'ler için özelleştirilmiş limitler
- DDoS koruması

### 3. Dosya Güvenliği
- Dosya türü validasyonu (magic bytes kontrolü)
- Dosya boyutu sınırları
- Zararlı içerik taraması
- Güvenli dosya yükleme

### 4. Input Validation ve Sanitization
- SQL injection koruması
- XSS koruması
- CSRF koruması
- Input sanitization

### 5. Audit Logging
- Güvenlik olayları kayıt altına alınır
- Şüpheli aktivite izleme
- Performance monitoring
- Error tracking

## Konfigürasyon

### Environment Variables

```bash
# Güvenlik ayarları
ANALYSIS_RATE_LIMIT_PER_HOUR=50      # Saat başına analiz limiti
BATCH_ANALYSIS_RATE_LIMIT_PER_HOUR=10 # Saat başına toplu analiz limiti
MAX_FILE_SIZE_MB=10                   # Maksimum dosya boyutu (MB)
MAX_BATCH_SIZE=20                     # Maksimum toplu analiz sayısı

# OCR güvenlik
OCR_MIN_CONFIDENCE=60                 # Minimum OCR güvenilirlik skoru
OCR_MAX_TEXT_LENGTH=50000            # Maksimum metin uzunluğu

# AI güvenlik
AI_MIN_RELIABILITY=0.3               # Minimum AI güvenilirlik skoru
AI_MAX_FORGERY_RISK=0.7              # Maksimum sahtelik riski

# Audit logging
SECURITY_AUDIT_ENABLED=true          # Audit logging aktif/pasif
SECURITY_LOG_LEVEL=INFO              # Log seviyesi (INFO, WARNING, ERROR)
```

### Güvenlik Seviyeleri

#### OCR Güvenilirlik Seviyeleri
- **Mükemmel**: 95%+ - Otomatik onay
- **İyi**: 85-94% - Yüksek güvenilirlik
- **Kabul Edilebilir**: 70-84% - Manuel kontrol önerilir
- **Zayıf**: 50-69% - Dikkatli inceleme gerekli
- **Çok Zayıf**: <50% - Reddetme önerilir

#### AI Güvenilirlik Seviyeleri
- **Yüksek**: 0.8+ - Güvenilir analiz
- **Orta**: 0.6-0.8 - Kabul edilebilir
- **Düşük**: 0.4-0.6 - Manuel kontrol gerekli
- **Çok Düşük**: <0.4 - Şüpheli sonuç

## API Güvenliği

### Authentication
```typescript
// Her API çağrısında kimlik doğrulama
const authResult = await validateAuthAndRole(request, ['ADMIN', 'TEACHER']);
if (!authResult.success) {
  return NextResponse.json({ error: authResult.error }, { status: 401 });
}
```

### Authorization
```typescript
// İzin kontrolü
const permissionCheck = await validateAnalysisPermissions(userId, dekontId);
if (!permissionCheck.isValid) {
  return NextResponse.json({ error: permissionCheck.error }, { status: 403 });
}
```

### Rate Limiting
```typescript
// Rate limit kontrolü
const rateLimitCheck = SecurityLimits.checkAnalysisRateLimit(userId);
if (!rateLimitCheck.isValid) {
  return NextResponse.json({ error: rateLimitCheck.error }, { status: 429 });
}
```

## Dosya Güvenliği

### Desteklenen Dosya Türleri
- PDF (.pdf)
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Güvenlik Kontrolleri

#### Magic Bytes Kontrolü
```typescript
// PDF dosyası kontrolü
if (!firstBytes.toString('ascii', 0, 4).startsWith('%PDF')) {
  return { isValid: false, error: 'Geçersiz PDF dosyası' };
}

// JPEG dosyası kontrolü
if (firstBytes[0] !== 0xFF || firstBytes[1] !== 0xD8) {
  return { isValid: false, error: 'Geçersiz JPEG dosyası' };
}
```

#### Dosya Boyutu Kontrolü
```typescript
if (fileBuffer.length > MAX_FILE_SIZE) {
  return { isValid: false, error: 'Dosya boyutu çok büyük' };
}
```

#### Zararlı İçerik Taraması
```typescript
// Şüpheli dosya adı kontrolü
const suspiciousChars = /<|>|\||&|;|`|\$|\(|\)|{|}|\\|\x00/;
if (suspiciousChars.test(fileName)) {
  return { isValid: false, error: 'Güvenlik riski tespit edildi' };
}
```

## Rate Limiting

### Limit Türleri

| Tür | Limit | Süre | Açıklama |
|-----|-------|------|----------|
| Analiz | 50 | 1 saat | Tekil dokuman analizi |
| Toplu Analiz | 10 | 1 saat | Batch analiz işlemi |
| Başarısız Deneme | 20 | 1 saat | Hatalı istekler |
| Login | 10 | 1 saat | Giriş denemeleri |

### Implementasyon
```typescript
// Rate limit cache
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(options: RateLimitOptions): SecurityValidationResult {
  const { identifier, limit, windowMs, type } = options;
  const now = Date.now();
  
  const cacheKey = `${type}_${identifier}`;
  const current = rateLimitCache.get(cacheKey);
  
  if (current && now <= current.resetTime) {
    if (current.count >= limit) {
      return { isValid: false, error: 'Rate limit aşıldı' };
    }
    current.count++;
  } else {
    rateLimitCache.set(cacheKey, { count: 1, resetTime: now + windowMs });
  }
  
  return { isValid: true };
}
```

## Audit Logging

### Log Seviyeleri
- **INFO**: Normal işlemler (başarılı analizler)
- **WARNING**: Şüpheli aktiviteler (rate limit aşımı)
- **ERROR**: Güvenlik ihlalleri (geçersiz dosyalar)
- **CRITICAL**: Sistem tehditleri (DDoS saldırıları)

### Log Formatı
```typescript
{
  timestamp: "2024-01-01T10:00:00.000Z",
  userId: "user-id",
  action: "SUCCESSFUL_DOCUMENT_ANALYSIS",
  details: {
    dekontId: "dekont-id",
    reliabilityScore: 85,
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  },
  severity: "INFO"
}
```

### Önemli Güvenlik Olayları
- Yetkisiz erişim denemeleri
- Rate limit aşımları
- Geçersiz dosya yüklemeleri
- Şüpheli analiz sonuçları
- Sistem hataları

## Input Validation

### Sanitization
```typescript
export function sanitizeAnalysisInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/['";\\]/g, '') // SQL injection koruması
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // XSS koruması
      .substring(0, 1000); // Uzunluk sınırı
  }
  // ... diğer türler için kontroller
}
```

### Validation Rules
- SQL injection pattern detection
- XSS script tag removal
- Maximum length enforcement
- Character whitelist kontrolü
- UUID format validation

## Error Handling

### Güvenli Hata Mesajları
```typescript
// ❌ Güvensiz - sistem bilgisi sızdırır
return NextResponse.json({ 
  error: `Database connection failed: ${dbError.message}` 
}, { status: 500 });

// ✅ Güvenli - genel hata mesajı
return NextResponse.json({ 
  error: 'Sistem hatası oluştu. Lütfen daha sonra tekrar deneyin.' 
}, { status: 500 });
```

### Error Boundary
```typescript
export function withSecurityErrorBoundary<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      await logSecurityEvent('system', 'FUNCTION_ERROR', {
        functionName: fn.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'ERROR');
      
      throw error;
    }
  };
}
```

## Güvenlik Kontrol Listesi

### Production Öncesi Kontroller

#### ✅ Temel Güvenlik
- [ ] Tüm environment variables tanımlandı
- [ ] HTTPS kullanılıyor
- [ ] Güvenli session ayarları
- [ ] CORS doğru konfigüre edildi
- [ ] Security headers aktif

#### ✅ Kimlik Doğrulama
- [ ] NextAuth.js doğru konfigüre edildi
- [ ] Role-based access control çalışıyor
- [ ] Session timeout ayarlandı
- [ ] Güvenli password politikası

#### ✅ API Güvenliği
- [ ] Rate limiting aktif
- [ ] Input validation çalışıyor
- [ ] Error handling güvenli
- [ ] Audit logging aktif

#### ✅ Dosya Güvenliği
- [ ] File type validation aktif
- [ ] File size limits çalışıyor
- [ ] Magic bytes kontrolü aktif
- [ ] Malware scanning (opsiyonel)

#### ✅ Database Güvenliği
- [ ] SQL injection koruması
- [ ] Prepared statements kullanılıyor
- [ ] Sensitive data encryption
- [ ] Database access logging

#### ✅ Monitoring
- [ ] Security event logging
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] Suspicious activity alerts

### Düzenli Güvenlik Kontrolleri

#### Haftalık
- [ ] Güvenlik loglarını kontrol et
- [ ] Şüpheli aktiviteleri incele
- [ ] Performance metriklerini gözden geçir

#### Aylık
- [ ] Güvenlik konfigürasyonunu gözden geçir
- [ ] Rate limit ayarlarını değerlendir
- [ ] Audit log analizini yap

#### Yıllık
- [ ] Güvenlik değerlendirmesi yap
- [ ] Penetration test yaptır
- [ ] Güvenlik politikalarını güncelle

## Güvenlik İhlali Durumunda

### Acil Müdahale Adımları
1. **Tespit**: İhlali tespit et ve kaydet
2. **İzolasyon**: Etkilenen sistemleri izole et
3. **Değerlendirme**: Hasar değerlendirmesi yap
4. **Müdahale**: Gerekli müdahaleleri yap
5. **Raporlama**: İlgili taraflara bildir
6. **İyileştirme**: Güvenlik önlemlerini güçlendir

### İletişim
- **Sistem Yöneticisi**: [admin-email]
- **Güvenlik Sorumlusu**: [security-email]
- **Acil Durum**: [emergency-contact]

## Kaynaklar

- [OWASP Top 10](https://owasp.org/Top10/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security](https://cheatsheetseries.owasp.org/cheatsheets/TypeScript_Security_Cheat_Sheet.html)

---

**Son Güncelleme**: 2024-01-01  
**Versiyon**: 1.0  
**Sorumlu**: Sistem Yöneticisi