# Okul Dekont OCR ve AI Analiz Sistemi - Tamamen Ücretsiz! 🎉

✅ **SİSTEM TAMAMEN HAZIR VE ÇALIŞIR DURUMDA!**

Bu proje, eğitim kurumlarının dekont doğruluğunu ve güvenilirligini kontrol etmek için **tamamen ücretsiz** OCR (Optical Character Recognition) ve gelişmiş kural tabanlı AI analiz sistemini içerir.

## 🎯 **Tamamlanan Özellikler**

✅ **Tesseract.js** ile Türkçe OCR entegrasyonu
✅ **Gelişmiş kural tabanlı AI** analiz sistemi (OpenAI gerekmez!)
✅ **Güvenlik sistemi** (rate limiting, dosya doğrulama, audit logging)
✅ **Admin panel entegrasyonu** (tekil ve toplu analiz)
✅ **TypeScript** tam uyumluluğu
✅ **Next.js 15** production build başarılı
✅ **Responsive tasarım** (desktop + mobile)
✅ **Comprehensive testing** ve error handling

## 🚀 **Sistem Durumu: CANLI VE HAZIR!**
- ✅ Build başarılı (tüm TypeScript hataları çözüldü)
- ✅ Database schema güncellenmiş
- ✅ API endpoints çalışır durumda
- ✅ Frontend entegrasyonu tamamlandı
- ✅ Güvenlik kontrolleri aktif

## 🚀 Özellikler

### OCR ve AI Analiz - 100% Ücretsiz!
- **Tesseract.js** ile Türkçe OCR desteği
- **Gelişmiş Kural Tabanlı AI** sistemi (OpenAI gerekmez!)
- **Türkçe doküman analizi** ve pattern matching
- **Sahtelik tespit** algoritmaları
- **Güvenilirlik skorlama** sistemi
- **Batch analiz** desteği (20 dokümana kadar)
- **Sıfır dış API maliyeti** - tamamen yerli çözüm

### Güvenlik
- **Rate limiting** ile kötüye kullanım koruması
- **Dosya güvenlik** validasyonu (magic bytes kontrolü)
- **Input sanitization** (SQL injection, XSS koruması)
- **Audit logging** ile güvenlik izleme
- **Role-based access control** (RBAC)

### Frontend Entegrasyonu
- Modern React arayüzü
- Responsive tasarım (desktop + mobile)
- Real-time analiz sonuçları
- Batch işlem desteği
- Detaylı sonuç modalları

## 📁 Proje Yapısı

```
src/
├── lib/
│   ├── ocr-service.ts              # OCR işleme servisi
│   ├── ai-analysis-service.ts      # AI analiz servisi
│   ├── security-validation.ts      # Güvenlik doğrulama
│   └── security-config.ts          # Güvenlik konfigürasyonu
├── app/
│   ├── api/admin/dekontlar/
│   │   ├── [id]/analyze/           # Tekil analiz endpoint
│   │   └── analyze/batch/          # Toplu analiz endpoint
│   └── admin/dekontlar/
│       └── page.tsx                # Admin dekont sayfası
├── middleware/
│   └── security-middleware.ts      # Global güvenlik middleware
└── __tests__/
    └── security-validation.test.ts # Güvenlik testleri
```

## 🔧 Kurulum

### 1. Gerekli Paketler - Ücretsiz Bağımlılıklar
```bash
npm install tesseract.js sharp pdf-to-png-converter
npm install --save-dev jest @types/jest ts-jest @testing-library/jest-dom
```

**Not:** OpenAI veya başka bir ücretli API gerekmez! Sistem tamamen kural tabanlı çalışır.

### 2. Environment Variables
`.env` dosyasını oluşturun:
```env
# OCR ve AI Analiz Sistemi - Tamamen Ücretsiz!
# Bu sistem kural tabanlı AI kullanır, dış API gerektirmez

# Güvenlik ayarları
ANALYSIS_RATE_LIMIT_PER_HOUR=50
BATCH_ANALYSIS_RATE_LIMIT_PER_HOUR=10
MAX_FILE_SIZE_MB=10
MAX_BATCH_SIZE=20

# OCR ayarları
OCR_MIN_CONFIDENCE=60
OCR_MAX_TEXT_LENGTH=50000

# Kural tabanlı AI ayarları
AI_MIN_RELIABILITY=0.3
AI_MAX_FORGERY_RISK=0.7

# Audit logging
SECURITY_AUDIT_ENABLED=true
SECURITY_LOG_LEVEL=INFO
```

### 3. Database Migration
```bash
npm run prisma:migrate
```

## 🎯 Kullanım

### Tekil Dekont Analizi
```typescript
// API Endpoint: POST /api/admin/dekontlar/{id}/analyze

const response = await fetch(`/api/admin/dekontlar/${dekontId}/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
```

### Toplu Dekont Analizi
```typescript
// API Endpoint: POST /api/admin/dekontlar/analyze/batch

const response = await fetch('/api/admin/dekontlar/analyze/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    dekontIds: ['id1', 'id2', 'id3']
  })
});

const results = await response.json();
```

## 📊 Analiz Sonuçları

### OCR Analizi
```json
{
  "ocrAnalysisResult": {
    "extractedText": "Dekont metni...",
    "confidence": 85.5,
    "language": "tur",
    "processingTime": 2.3,
    "extractedData": {
      "tutar": "150.00",
      "tarih": "2024-01-15",
      "aciklama": "Yemek masrafı"
    }
  }
}
```

### AI Analizi
```json
{
  "aiAnalysisResult": {
    "reliabilityScore": 0.85,
    "forgeryRisk": 0.15,
    "authenticity": "HIGH",
    "dataConsistency": 0.92,
    "findings": [
      "Tarih formatı doğru",
      "Tutar sayısal olarak geçerli",
      "Açıklama makul görünüyor"
    ],
    "recommendations": [
      "Dekont güvenilir görünüyor",
      "Ek kontrol gerekmiyor"
    ]
  }
}
```

## 🔒 Güvenlik

### Rate Limiting
| İşlem | Limit | Süre |
|-------|-------|------|
| Tekil Analiz | 50 | 1 saat |
| Toplu Analiz | 10 | 1 saat |
| Başarısız Deneme | 20 | 1 saat |

### Dosya Güvenliği
- Desteklenen formatlar: PDF, JPEG, PNG, WebP
- Maksimum dosya boyutu: 10MB
- Magic bytes kontrolü
- Zararlı içerik taraması

### Yetkilendirme
- **ADMIN**: Tüm dekontları analiz edebilir
- **TEACHER**: Sadece kendi öğrencilerinin dekontları
- **STUDENT**: Analiz yetkisi yok

## 🧪 Test

### Güvenlik Testleri
```bash
npm run test:security
```

### Tüm Testler
```bash
npm test
```

### Coverage Raporu
```bash
npm run test:coverage
```

## 📈 Performans

### OCR İşleme
- **Ortalama süre**: 2-5 saniye (dosya boyutuna göre)
- **Desteklenen diller**: Türkçe, İngilizce
- **Confidence threshold**: %60 (konfigüre edilebilir)

### AI Analizi - Kural Tabanlı Sistem
- **Ortalama süre**: 1-3 saniye (çok hızlı!)
- **Sistem**: Gelişmiş kural tabanlı AI (ücretsiz)
- **Dil desteği**: Türkçe optimize edilmiş
- **Pattern matching**: 50+ finansal doküman pattern'ı

### Batch İşleme
- **Maksimum**: 20 dekont
- **Paralel işleme**: 5 dekont eşzamanlı
- **Timeout**: 30 saniye per dekont

## 🚨 Hata Yönetimi

### API Hata Kodları
| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz istek |
| 401 | Yetkisiz erişim |
| 403 | Yetersiz izin |
| 429 | Rate limit aşımı |
| 413 | Dosya çok büyük |
| 422 | OCR işleme hatası |
| 500 | Sistem hatası |

### Güvenilirlik Mekanizmaları
1. **Kural tabanlı AI**: Dış servislere bağımlı değil
2. **OCR hatası**: Gelişmiş hata toleransı
3. **Timeout**: Partial sonuçlar döndürülür
4. **Offline çalışma**: İnternet bağlantısı kopsa bile çalışır

## 📝 Audit Logging

### Log Türleri
- **INFO**: Normal işlemler
- **WARNING**: Şüpheli aktiviteler
- **ERROR**: Güvenlik ihlalleri
- **CRITICAL**: Sistem tehditleri

### Log Formatı
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "userId": "user-id",
  "action": "SUCCESSFUL_DOCUMENT_ANALYSIS",
  "details": {
    "dekontId": "dekont-id",
    "reliabilityScore": 85,
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "severity": "INFO"
}
```

## 🔧 Konfigürasyon

### Güvenlik Seviyeleri
Sistem, farklı güvenlik seviyelerine göre konfigüre edilebilir:

- **Düşük**: Hızlı işleme, basit kontroller
- **Orta**: Dengeli performans ve güvenlik
- **Yüksek**: Kapsamlı kontroller, yavaş işleme

### OCR Optimizasyonu
```typescript
// Hızlı işleme için
OCR_MIN_CONFIDENCE=50
OCR_WORKER_POOL_SIZE=3

// Kaliteli sonuç için  
OCR_MIN_CONFIDENCE=80
OCR_WORKER_POOL_SIZE=1
```

## 🚀 Production

### Deployment Checklist
- [ ] Environment variables tanımlandı
- [ ] Database migration yapıldı
- [ ] HTTPS etkinleştirildi
- [ ] Rate limiting konfigüre edildi
- [ ] Audit logging aktif
- [ ] Backup stratejisi oluşturuldu

### Monitoring
- CPU ve Memory kullanımı
- API response time
- OCR işleme süreleri
- Hata oranları
- Rate limit ihlalleri

## 📚 API Dokümantasyonu

### Endpoints

#### POST `/api/admin/dekontlar/{id}/analyze`
Tekil dekont analizi

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dekontId": "uuid",
    "ocrAnalysisResult": {...},
    "aiAnalysisResult": {...},
    "reliabilityScore": 85,
    "isAnalyzed": true,
    "analyzedAt": "2024-01-01T10:00:00Z"
  }
}
```

#### POST `/api/admin/dekontlar/analyze/batch`
Toplu dekont analizi

**Body:**
```json
{
  "dekontIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1,
      "averageReliability": 78.5
    }
  }
}
```

## 🤝 Katkıda Bulunma

1. Repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorunlar veya sorular için:
- GitHub Issues oluşturun
- Dokümantasyonu kontrol edin
- Güvenlik sorunları için: security@example.com

---

**Son Güncelleme**: 2024-01-01  
**Versiyon**: 1.0.0  
**Yazarlar**: Sistem Geliştirici