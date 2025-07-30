# Temporal Data System Test Scenarios

Bu dokümanda okul yönetim sisteminin temporal (geçmişe dönük) veri altyapısı için test senaryoları tanımlanmıştır.

## 1. Student Enrollment Tests

### Test 1.1: Yeni Öğrenci Kaydı Oluşturma
```javascript
// POST /api/admin/student-enrollments
{
  "studentId": "student_123",
  "educationYearId": "2024-2025",
  "classId": "class_9a",
  "className": "9A",
  "grade": 9,
  "gradeType": "NORMAL",
  "status": "ACTIVE",
  "notes": "Yeni kayıt"
}
```
**Beklenen Sonuç:** 201 status code, kayıt başarıyla oluşturulmalı

### Test 1.2: Duplicate Enrollment Prevention
```javascript
// Aynı öğrenci için aynı eğitim yılında ikinci kayıt
// POST /api/admin/student-enrollments (aynı studentId ve educationYearId)
```
**Beklenen Sonuç:** 400 status code, "Bu öğrenci bu eğitim yılında zaten kayıtlı" hatası

### Test 1.3: Öğrenci Kayıtlarını Filtreleme
```javascript
// GET /api/admin/student-enrollments?educationYearId=2024-2025&grade=9&gradeType=NORMAL
```
**Beklenen Sonuç:** Sadece 2024-2025 eğitim yılı, 9. sınıf, normal tip öğrenciler

## 2. Student Promotion Tests

### Test 2.1: Sınıf Yükseltme Önizlemesi
```javascript
// GET /api/admin/student-enrollments/promote?fromEducationYearId=2023-2024&grades=9,10,11&gradeType=NORMAL
```
**Beklenen Sonuç:** Yükseltilecek öğrenci listesi ve istatistikler

### Test 2.2: 9. Sınıf → 10. Sınıf Yükseltme
```javascript
// POST /api/admin/student-enrollments/promote
{
  "fromEducationYearId": "2023-2024",
  "toEducationYearId": "2024-2025",
  "grades": [9],
  "gradeType": "NORMAL",
  "adminUserId": "admin_123"
}
```
**Beklenen Sonuç:** 
- Eski kayıt status: "PROMOTED"
- Yeni kayıt oluşturulmuş: grade: 10, className: "10A" (9A'dan)

### Test 2.3: 12. Sınıf Mezuniyet
```javascript
// POST /api/admin/student-enrollments/promote
{
  "fromEducationYearId": "2023-2024",
  "toEducationYearId": "2024-2025",
  "grades": [12],
  "gradeType": "NORMAL",
  "adminUserId": "admin_123"
}
```
**Beklenen Sonuç:** 
- 12. sınıf kayıt status: "GRADUATED"
- graduationDate set edilmiş
- Yeni kayıt oluşturulmamalı

### Test 2.4: MESEM Öğrenci Yükseltme
```javascript
// 9mesem → 10mesem → 11mesem → 12mesem → Mezun
// POST /api/admin/student-enrollments/promote
{
  "fromEducationYearId": "2023-2024",
  "toEducationYearId": "2024-2025",
  "grades": [9, 10, 11],
  "gradeType": "MESEM",
  "adminUserId": "admin_123"
}
```
**Beklenen Sonuç:** 
- 9mesem → 10mesem
- 10mesem → 11mesem  
- 11mesem → 12mesem

## 3. Company History Tests

### Test 3.1: İşletme Usta Öğretici Değişikliği
```javascript
// POST /api/admin/company-history
{
  "companyId": "company_123",
  "changeType": "MASTER_TEACHER_UPDATE",
  "fieldName": "masterTeacherName",
  "previousValue": "Ahmet Yılmaz",
  "newValue": "Mehmet Demir",
  "changedBy": "admin_123",
  "reason": "Usta öğretici değişimi",
  "notes": "Yeni usta öğretici atandı"
}
```
**Beklenen Sonuç:** 
- Önceki kayıt validTo güncellenmiş
- Yeni kayıt validFrom = şimdi, validTo = null

### Test 3.2: İşletme Banka Hesabı Değişikliği
```javascript
// POST /api/admin/company-history
{
  "companyId": "company_123",
  "changeType": "BANK_ACCOUNT_UPDATE",
  "fieldName": "bankAccountNo",
  "previousValue": "TR123456789012345678901234",
  "newValue": "TR987654321098765432109876",
  "changedBy": "admin_123",
  "reason": "Banka hesap değişimi"
}
```

### Test 3.3: Belirli Tarihte İşletme Bilgisi Sorgulama
```javascript
// GET /api/admin/company-history?companyId=company_123&validAt=2023-01-15
```
**Beklenen Sonuç:** 2023-01-15 tarihinde geçerli olan tüm alan değerleri

## 4. Teacher History Tests

### Test 4.1: Öğretmen Alan Değişikliği
```javascript
// POST /api/admin/teacher-history
{
  "teacherId": "teacher_123",
  "changeType": "FIELD_ASSIGNMENT_UPDATE",
  "fieldName": "alanId",
  "previousValue": "alan_bilisim",
  "newValue": "alan_elektrik",
  "changedBy": "admin_123",
  "reason": "Alan değişimi talebi"
}
```

### Test 4.2: Öğretmen Pozisyon Değişikliği
```javascript
// POST /api/admin/teacher-history
{
  "teacherId": "teacher_123",
  "changeType": "POSITION_UPDATE",
  "fieldName": "position",
  "previousValue": "ogretmen",
  "newValue": "alan_sefi",
  "changedBy": "admin_123",
  "reason": "Terfi"
}
```

## 5. Temporal Query Tests

### Test 5.1: İşletme Geçmiş Değer Sorgulama
```javascript
import { getCompanyFieldValueAtDate } from '@/lib/temporal-queries';

// 1 yıl önceki usta öğretici adını getir
const oldMasterTeacher = await getCompanyFieldValueAtDate(
  "company_123",
  "masterTeacherName",
  new Date('2023-01-01')
);
```
**Beklenen Sonuç:** O tarihteki usta öğretici adı

### Test 5.2: Öğretmen Geçmiş Sorgulama
```javascript
import { getTeacherHistory } from '@/lib/temporal-queries';

// Öğretmenin tüm alan değişikliklerini getir
const fieldChanges = await getTeacherHistory("teacher_123", "alanId");
```
**Beklenen Sonuç:** Kronolojik alan değişiklikleri

### Test 5.3: Öğrenci Kayıt Geçmişi
```javascript
import { getStudentEnrollmentHistory } from '@/lib/temporal-queries';

// Öğrencinin tüm dönemlerini getir
const enrollmentHistory = await getStudentEnrollmentHistory("student_123");
```
**Beklenen Sonuç:** Öğrencinin tüm eğitim yılı kayıtları

### Test 5.4: Belirli Yıl Mezunları
```javascript
import { getGraduatedStudents } from '@/lib/temporal-queries';

// 2023-2024 mezunlarını getir
const graduates = await getGraduatedStudents("2023-2024", "NORMAL");
```
**Beklenen Sonuç:** O yıl mezun olan normal sınıf öğrencileri

## 6. Edge Case Tests

### Test 6.1: Transaction Rollback Testi
```javascript
// Hatalı veri ile sınıf yükseltme - transaction geri alınmalı
// POST /api/admin/student-enrollments/promote (geçersiz toEducationYearId)
```
**Beklenen Sonuç:** Hata durumunda hiçbir veri değişmemeli

### Test 6.2: Concurrent Update Testi
```javascript
// Aynı anda iki admin'in aynı öğretmenin alanını değiştirmesi
// İki eşzamanlı POST /api/admin/teacher-history istegi
```
**Beklenen Sonuç:** Race condition olmadan doğru sıralama

### Test 6.3: Large Dataset Performance
```javascript
// 1000+ öğrenci ile toplu sınıf yükseltme
// POST /api/admin/student-enrollments/promote (büyük dataset)
```
**Beklenen Sonuç:** Reasonable time'da tamamlanmalı (< 30 saniye)

## 7. Data Integrity Tests

### Test 7.1: Temporal Data Consistency
```javascript
// Her kayıt için:
// - validFrom <= validTo (eğer validTo varsa)
// - Overlapping date range olmamalı (aynı field için)
// - validTo = null olan sadece bir kayıt olmalı (aynı field için)
```

### Test 7.2: Foreign Key Integrity
```javascript
// Silinmiş öğrenci/işletme/öğretmen referansları
// Orphan temporal record kontrolü
```

### Test 7.3: Enum Value Validation
```javascript
// Geçersiz GradeType, EnrollmentStatus, ChangeType değerleri
// Database constraint violation kontrolü
```

## 8. Reporting Tests

### Test 8.1: Dönemsel Analiz Raporu
```javascript
// Belirli tarih aralığındaki tüm değişiklikleri getir
import { getChangesInDateRange } from '@/lib/temporal-queries';

const changes = await getChangesInDateRange(
  'company',
  new Date('2023-01-01'),
  new Date('2023-12-31')
);
```

### Test 8.2: Sınıf İstatistikleri
```javascript
// Her sınıftaki öğrenci sayısının yıllara göre değişimi
import { getStudentsInGradeByYear } from '@/lib/temporal-queries';

const grade9_2023 = await getStudentsInGradeByYear("2022-2023", 9);
const grade9_2024 = await getStudentsInGradeByYear("2023-2024", 9);
```

## 9. Performance Tests

### Test 9.1: Index Kullanımı
```sql
-- Query plan kontrolü
EXPLAIN SELECT * FROM company_history 
WHERE companyId = 'company_123' AND validFrom <= '2023-01-01' 
AND (validTo IS NULL OR validTo >= '2023-01-01');
```

### Test 9.2: Large Dataset Query Performance
```javascript
// 10 yıllık veri ile temporal sorgular
// Response time < 2 saniye olmalı
```

## Test Execution Checklist

- [ ] Unit tests (fonksiyon bazında)
- [ ] Integration tests (API endpoint'ler)
- [ ] Database transaction tests
- [ ] Performance tests
- [ ] Data consistency tests
- [ ] Error handling tests
- [ ] Edge case tests

## Test Data Setup

### Sample Education Years
- 2022-2023 (archived)
- 2023-2024 (archived) 
- 2024-2025 (active)

### Sample Students
- Ali Demir (9A → 10A → 11A → 12A → Mezun)
- Ayşe Kara (9mesem → 10mesem → 11mesem → 12mesem → Mezun)
- Mehmet Yılmaz (Transfer durumu)

### Sample Companies
- ABC Tekstil (usta öğretici değişiklikleri)
- XYZ Makine (banka hesap değişiklikleri)

### Sample Teachers  
- Fatma Öğretmen (bilişim → elektrik alan değişimi)
- Ahmet Hoca (öğretmen → alan şefi terfi)