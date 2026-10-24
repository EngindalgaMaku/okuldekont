# Eğitim-Öğretim Yılı Bazlı Arşivleme Sistemi

## Mevcut Durum Analizi

### Veritabanı Yapısı
- ✅ `EgitimYili` tablosu mevcut (id, year, startDate, endDate, active)
- ✅ `Staj` tablosu `educationYearId` ile bağlantılı
- ❌ Ayarlarda eğitim yılı seçimi kaybolmuş
- ❌ Aktif eğitim yılı sistem ayarında tanımlı değil

### Gereksinimler

#### 1. Eğitim-Öğretim Yılı Yönetimi
- Her akademik yıl için ayrı kayıt (2024-2025, 2025-2026 vb.)
- Başlangıç ve bitiş tarihleri
- Aktif eğitim yılı belirleme
- Geçmiş yılları arşivleme

#### 2. Staj Dönemleri
- **Normal Öğrenciler**: 12. sınıf öğrencileri staja gider
- **Mesem Öğrencileri**: 9. sınıftan mezun olana kadar her yıl staj
- Yaz stajları (Mesem öğrencileri için)
- İstisnai durumlar

#### 3. Arşivleme Gereksinimleri
- 5-10 yıl sonra veri erişilebilirliği
- Mezun olan öğrencilerin kayıtları
- Geçmiş staj kayıtları
- Raporlama ve analiz

## Önerilen Çözümler

### 1. Ayarlar Sayfasına Eğitim Yılı Yönetimi Eklenmesi

```typescript
// Yeni API endpoints
/api/admin/education-years         // CRUD operations
/api/admin/system-settings/active-year  // Aktif yıl ayarı
```

#### Özellikler:
- Mevcut eğitim yıllarını listeleme
- Yeni eğitim yılı oluşturma
- Aktif eğitim yılını belirleme
- Geçmiş yılları görüntüleme

### 2. Staj Yönetiminde Eğitim Yılı Entegrasyonu

#### Mevcut Sorunlar:
- Stajlar eğitim yılına göre filtrelenemiyor
- Geçmiş yılların stajları karışık görünüyor
- Mezun öğrencilerin stajları aktif listede

#### Çözüm:
```typescript
// Staj listesinde eğitim yılı filtresi
interface StajFilter {
  educationYearId?: string
  status: StajStatus
  showArchived?: boolean
}
```

### 3. Arşivleme Sistemi

#### Otomatik Arşivleme:
- Eğitim yılı bittiğinde stajları arşivle
- Mezun öğrencileri "alumni" statüsüne al
- Eski kayıtları ayrı görünümde göster

#### Manuel Arşiv Erişimi:
- Admin panelinde "Arşiv" bölümü
- Yıl bazında filtreleme
- Eski raporlara erişim

### 4. Öğrenci Sınıf Geçiş Sistemi

#### Otomatik Sınıf Yükseltme:
```typescript
// Yeni eğitim yılı başladığında
function promoteStudents(newEducationYear: string) {
  // 12. sınıfları mezun et
  // 11. sınıfları 12 yap
  // 10. sınıfları 11 yap
  // 9. sınıfları 10 yap
}
```

### 5. Mesem Öğrenci Özel Durumu

#### Mesem Tracking:
- Öğrenci tipini belirten alan eklenmesi
- Mesem öğrencileri için özel staj kuralları
- Yaz stajı desteği

```typescript
enum StudentType {
  NORMAL = 'NORMAL',
  MESEM = 'MESEM'
}

// Student tablosuna studentType alanı eklenmesi
```

## İmplementasyon Planı

### Faz 1: Temel Altyapı (1-2 gün)
1. Ayarlarda eğitim yılı yönetimi sayfası oluşturma
2. Aktif eğitim yılı sistem ayarı ekleme
3. API endpoints geliştirme

### Faz 2: Staj Entegrasyonu (2-3 gün)
1. Staj listesinde eğitim yılı filtresi
2. Raporlarda eğitim yılı gösterimi
3. Yıl bazlı staj istatistikleri

### Faz 3: Arşivleme (2-3 gün)
1. Arşiv görünümü oluşturma
2. Otomatik arşivleme fonksiyonları
3. Geçmiş veri erişim arayüzü

### Faz 4: Öğrenci Yönetimi (3-4 gün)
1. Öğrenci tipini belirleme (Normal/Mesem)
2. Sınıf geçiş sistemi
3. Mezun öğrenci yönetimi

### Faz 5: Gelişmiş Özellikler (2-3 gün)
1. Çok yıllı raporlama
2. Trend analizi
3. Dashboard istatistikleri

## Teknik Detaylar

### Veritabanı Değişiklikleri

```sql
-- Student tablosuna öğrenci tipi ekleme
ALTER TABLE students ADD COLUMN studentType ENUM('NORMAL', 'MESEM') DEFAULT 'NORMAL';

-- Mezun öğrenciler için graduation tablosu
CREATE TABLE graduations (
  id VARCHAR(191) PRIMARY KEY,
  studentId VARCHAR(191),
  educationYearId VARCHAR(191),
  graduationDate DATE,
  finalClass VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sistem ayarlarına aktif eğitim yılı
INSERT INTO system_settings (key, value) VALUES ('active_education_year', '');
```

### API Yapısı

```typescript
// Education Year Management
GET    /api/admin/education-years
POST   /api/admin/education-years
PUT    /api/admin/education-years/[id]
DELETE /api/admin/education-years/[id]

// Active Year Settings
GET    /api/admin/system-settings/active-year
PUT    /api/admin/system-settings/active-year

// Archive Access
GET    /api/admin/archive/students
GET    /api/admin/archive/internships
GET    /api/admin/archive/reports
```

## Beklenen Faydalar

1. **Uzun Vadeli Sürdürülebilirlik**: 10+ yıl veri erişimi
2. **Düzenli Arşivleme**: Her yıl temiz başlangıç
3. **Gelişmiş Raporlama**: Yıllar arası karşılaştırma
4. **Mezun Takibi**: Eski öğrencilerin staj geçmişi
5. **Sistem Performansı**: Aktif verinin azalması

## Risk Analizi

### Potansiyel Riskler:
- Veri migrasyonu sırasında kayıp
- Performans sorunları (büyük veri)
- Kullanıcı deneyimi karmaşıklığı

### Önerilen Önlemler:
- Kapsamlı backup stratejisi
- Aşamalı geçiş planı
- Kullanıcı eğitimi

## Sonuç

Bu sistem ile okul 5-10 yıl sonra bile herhangi bir öğrencinin staj geçmişini, hangi eğitim yılında nerede staj yaptığını, koordinatörünün kim olduğunu kolayca bulabilecek.