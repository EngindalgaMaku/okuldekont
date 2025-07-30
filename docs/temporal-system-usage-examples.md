# Temporal Data System - Kullanım Örnekleri

Bu dokümanda okul yönetim sisteminin temporal (geçmişe dönük) veri altyapısının pratik kullanım örnekleri yer almaktadır.

## 📚 İçindekiler

1. [Öğrenci Sınıf Yükseltme İşlemleri](#öğrenci-sınıf-yükseltme-işlemleri)
2. [İşletme Bilgileri Takibi](#işletme-bilgileri-takibi)
3. [Öğretmen Değişiklikleri](#öğretmen-değişiklikleri)
4. [Raporlama ve Analiz](#raporlama-ve-analiz)
5. [Geçmiş Veri Sorguları](#geçmiş-veri-sorguları)

## 🎓 Öğrenci Sınıf Yükseltme İşlemleri

### Senaryo 1: Yıl Sonu Toplu Sınıf Yükseltme

**Durum:** 2023-2024 eğitim yılı bitmiş, tüm öğrenciler 2024-2025 yılına yükseltilecek.

```javascript
// 1. Önce yükseltme önizlemesi al
const preview = await fetch('/api/admin/student-enrollments/promote?fromEducationYearId=2023-2024&gradeType=NORMAL');
const previewData = await preview.json();

console.log(`Toplam ${previewData.data.stats.total} öğrenci`);
console.log(`${previewData.data.stats.toBePromoted} öğrenci yükseltilecek`);
console.log(`${previewData.data.stats.toBeGraduated} öğrenci mezun edilecek`);

// 2. Toplu yükseltme işlemi
const response = await fetch('/api/admin/student-enrollments/promote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromEducationYearId: '2023-2024',
    toEducationYearId: '2024-2025',
    grades: [9, 10, 11, 12], // Tüm sınıflar
    gradeType: 'NORMAL',
    adminUserId: 'admin_123'
  })
});

const result = await response.json();
console.log(`✅ ${result.data.promoted} öğrenci yükseltildi`);
console.log(`🎓 ${result.data.graduated} öğrenci mezun edildi`);
console.log(`❌ ${result.data.errors.length} hata oluştu`);
```

### Senaryo 2: MESEM Öğrencilerinin Ayrı Yükseltilmesi

**Durum:** MESEM öğrencileri farklı bir zamanda yükseltilecek.

```javascript
// MESEM öğrencilerini yükselt
const mesemResponse = await fetch('/api/admin/student-enrollments/promote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromEducationYearId: '2023-2024',
    toEducationYearId: '2024-2025',
    grades: [9, 10, 11, 12],
    gradeType: 'MESEM',
    adminUserId: 'admin_123'
  })
});

// 9mesem → 10mesem, 10mesem → 11mesem, 11mesem → 12mesem
// 12mesem → Mezun
```

### Senaryo 3: Öğrenci Geçmiş Kayıtlarını Görüntüleme

**Durum:** Bir öğrencinin hangi yıllarda hangi sınıflarda okuduğunu görmek istiyorsunuz.

```javascript
import { getStudentEnrollmentHistory } from '@/lib/temporal-queries';

const studentHistory = await getStudentEnrollmentHistory('student_123');

console.log('Öğrenci Eğitim Geçmişi:');
studentHistory.forEach(enrollment => {
  console.log(`${enrollment.educationYear.year}: ${enrollment.className} - ${enrollment.status}`);
  if (enrollment.graduationDate) {
    console.log(`   🎓 Mezuniyet: ${enrollment.graduationDate}`);
  }
});

// Çıktı:
// 2024-2025: 12A - ACTIVE
// 2023-2024: 11A - PROMOTED
// 2022-2023: 10A - PROMOTED  
// 2021-2022: 9A - PROMOTED
```

## 🏢 İşletme Bilgileri Takibi

### Senaryo 4: İşletme Usta Öğretici Değişikliği

**Durum:** ABC Tekstil firmasının usta öğreticisi değişti.

```javascript
// 1. Mevcut usta öğretici bilgisini al
const currentMaster = await fetch('/api/admin/companies/company_123').then(r => r.json());
console.log(`Mevcut usta öğretici: ${currentMaster.data.masterTeacherName}`);

// 2. Değişiklik kaydı oluştur
const historyResponse = await fetch('/api/admin/company-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyId: 'company_123',
    changeType: 'MASTER_TEACHER_UPDATE',
    fieldName: 'masterTeacherName',
    previousValue: 'Ahmet Yılmaz',
    newValue: 'Mehmet Demir',
    changedBy: 'admin_123',
    reason: 'Eski usta öğretici emekli oldu',
    notes: 'Yeni usta öğretici 15 yıl deneyimli'
  })
});

// 3. Şirketteki asıl kaydı güncelle
const updateResponse = await fetch('/api/admin/companies/company_123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    masterTeacherName: 'Mehmet Demir'
  })
});
```

### Senaryo 5: İşletme Banka Hesabı Değişikliği

**Durum:** XYZ Makine firmasının banka hesabı değişti.

```javascript
// Banka hesabı değişikliği kaydet
await fetch('/api/admin/company-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyId: 'company_456',
    changeType: 'BANK_ACCOUNT_UPDATE',
    fieldName: 'bankAccountNo',
    previousValue: 'TR123456789012345678901234',
    newValue: 'TR987654321098765432109876',
    changedBy: 'admin_123',
    reason: 'Banka değişikliği'
  })
});
```

### Senaryo 6: Belirli Tarihte İşletme Bilgilerini Görme

**Durum:** 2023 yılında ABC Tekstil'in usta öğreticisi kimdi?

```javascript
import { getCompanyFieldValueAtDate } from '@/lib/temporal-queries';

// 2023-01-01 tarihindeki usta öğretici
const masterTeacher2023 = await getCompanyFieldValueAtDate(
  'company_123',
  'masterTeacherName',
  new Date('2023-01-01')
);

console.log(`2023'te usta öğretici: ${masterTeacher2023}`);

// Aynı şekilde banka hesabı
const bankAccount2023 = await getCompanyFieldValueAtDate(
  'company_123',
  'bankAccountNo',
  new Date('2023-01-01')
);

console.log(`2023'te banka hesabı: ${bankAccount2023}`);
```

## 👨‍🏫 Öğretmen Değişiklikleri

### Senaryo 7: Öğretmen Alan Değişikliği

**Durum:** Fatma Hanım bilişim alanından elektrik alanına geçti.

```javascript
// Öğretmen alan değişikliği kaydet
await fetch('/api/admin/teacher-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teacherId: 'teacher_123',
    changeType: 'FIELD_ASSIGNMENT_UPDATE',
    fieldName: 'alanId',
    previousValue: 'alan_bilisim',
    newValue: 'alan_elektrik',
    changedBy: 'admin_123',
    reason: 'Öğretmen isteği - elektrik alanında master yapmış',
    notes: 'Ekim 2024 itibariyle elektrik alanında görevlendirildi'
  })
});
```

### Senaryo 8: Öğretmen Terfi İşlemi

**Durum:** Ahmet Bey öğretmenlikten alan şefliğine terfi etti.

```javascript
await fetch('/api/admin/teacher-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teacherId: 'teacher_456',
    changeType: 'POSITION_UPDATE',
    fieldName: 'position',
    previousValue: 'ogretmen',
    newValue: 'alan_sefi',
    changedBy: 'admin_123',
    reason: 'Başarılı performans - terfi',
    notes: 'Bilişim alanı şefliği görevi'
  })
});
```

## 📊 Raporlama ve Analiz

### Senaryo 9: Yıllık Mezun Raporu

**Durum:** 2023-2024 eğitim yılında kaç öğrenci mezun oldu?

```javascript
import { getGraduatedStudents } from '@/lib/temporal-queries';

// Normal sınıf mezunları
const normalGraduates = await getGraduatedStudents('2023-2024', 'NORMAL');
console.log(`Normal sınıflardan ${normalGraduates.length} öğrenci mezun oldu`);

// MESEM mezunları  
const mesemGraduates = await getGraduatedStudents('2023-2024', 'MESEM');
console.log(`MESEM'den ${mesemGraduates.length} öğrenci mezun oldu`);

// Toplam
console.log(`Toplam: ${normalGraduates.length + mesemGraduates.length} mezun`);
```

### Senaryo 10: Sınıf Mevcudu Analizi

**Durum:** Her sınıfta kaç öğrenci var?

```javascript
import { getStudentsInGradeByYear } from '@/lib/temporal-queries';

const currentYear = '2024-2025';
const grades = [9, 10, 11, 12];

for (const grade of grades) {
  const students = await getStudentsInGradeByYear(currentYear, grade, 'NORMAL');
  console.log(`${grade}. Sınıf: ${students.length} öğrenci`);
  
  // Sınıf bazında grupla
  const classCounts = students.reduce((acc, student) => {
    acc[student.className] = (acc[student.className] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(classCounts).forEach(([className, count]) => {
    console.log(`  ${className}: ${count} öğrenci`);
  });
}
```

### Senaryo 11: İşletme Değişiklik Analizi

**Durum:** Hangi işletmelerde son 1 yılda en çok değişiklik olmuş?

```javascript
import { getChangesInDateRange } from '@/lib/temporal-queries';

const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const companyChanges = await getChangesInDateRange(
  'company',
  oneYearAgo,
  new Date()
);

// İşletme bazında grupla
const changesByCompany = companyChanges.reduce((acc, change) => {
  const companyId = change.companyId;
  if (!acc[companyId]) {
    acc[companyId] = {
      companyName: change.company.name,
      changes: []
    };
  }
  acc[companyId].changes.push(change);
  return acc;
}, {});

// En çok değişiklik olan işletmeleri listele
Object.entries(changesByCompany)
  .sort(([,a], [,b]) => b.changes.length - a.changes.length)
  .slice(0, 10)
  .forEach(([companyId, data]) => {
    console.log(`${data.companyName}: ${data.changes.length} değişiklik`);
  });
```

## 🔍 Geçmiş Veri Sorguları

### Senaryo 12: "10 Yıl Önce Kim Usta Öğreticiydi?" Sorgusu

**Durum:** Denetim sırasında eski usta öğretici bilgisi istendi.

```javascript
import { getCompanyFieldValueAtDate, getCompanyHistory } from '@/lib/temporal-queries';

const companyId = 'company_123';
const tenYearsAgo = new Date();
tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

// 10 yıl önceki usta öğretici
const oldMasterTeacher = await getCompanyFieldValueAtDate(
  companyId,
  'masterTeacherName',
  tenYearsAgo
);

console.log(`10 yıl önce usta öğretici: ${oldMasterTeacher}`);

// Usta öğretici değişiklik geçmişi
const masterTeacherHistory = await getCompanyHistory(companyId, 'masterTeacherName');

console.log('Usta öğretici değişiklik geçmişi:');
masterTeacherHistory.forEach(change => {
  console.log(`${change.validFrom.toDateString()}: ${change.newValue} (${change.reason})`);
});
```

### Senaryo 13: Öğretmen Kariyer Takibi

**Durum:** Bir öğretmenin tüm kariyer geçmişini görmek istiyorsunuz.

```javascript
import { getTeacherHistory } from '@/lib/temporal-queries';

const teacherId = 'teacher_123';

// Tüm değişiklikleri getir
const allChanges = await getTeacherHistory(teacherId);

// Değişiklik tipine göre grupla
const changesByType = allChanges.reduce((acc, change) => {
  if (!acc[change.changeType]) acc[change.changeType] = [];
  acc[change.changeType].push(change);
  return acc;
}, {});

console.log('Öğretmen Kariyer Geçmişi:');

if (changesByType.FIELD_ASSIGNMENT_UPDATE) {
  console.log('\n📚 Alan Deği��iklikleri:');
  changesByType.FIELD_ASSIGNMENT_UPDATE.forEach(change => {
    console.log(`  ${change.validFrom.toDateString()}: ${change.previousValue} → ${change.newValue}`);
  });
}

if (changesByType.POSITION_UPDATE) {
  console.log('\n🏆 Pozisyon Değişiklikleri:');
  changesByType.POSITION_UPDATE.forEach(change => {
    console.log(`  ${change.validFrom.toDateString()}: ${change.previousValue} → ${change.newValue}`);
  });
}
```

## 🎯 Best Practices

### 1. Transaction Kullanımı
```javascript
// Büyük değişikliklerde transaction kullan
await prisma.$transaction(async (tx) => {
  // Önce history kaydet
  await tx.companyHistory.create({...});
  // Sonra ana kaydı güncelle
  await tx.companyProfile.update({...});
});
```

### 2. Error Handling
```javascript
try {
  const result = await fetch('/api/admin/student-enrollments/promote', {
    method: 'POST',
    body: JSON.stringify(promoteData)
  });
  
  if (!result.ok) {
    const error = await result.json();
    console.error('Yükseltme hatası:', error.error);
    return;
  }
  
  const data = await result.json();
  console.log('Başarılı:', data.message);
} catch (error) {
  console.error('Network hatası:', error);
}
```

### 3. Performans Optimizasyonu
```javascript
// Büyük veri setleri için pagination kullan
const students = await fetch(
  '/api/admin/student-enrollments?page=1&limit=100&educationYearId=2024-2025'
);

// Index'li alanları kullan
const history = await fetch(
  '/api/admin/company-history?companyId=company_123&fieldName=masterTeacherName'
);
```

### 4. Data Validation
```javascript
// API çağrısı öncesi veri doğrulama
function validatePromotionData(data) {
  if (!data.fromEducationYearId || !data.toEducationYearId) {
    throw new Error('Eğitim yılları gerekli');
  }
  
  if (!data.adminUserId) {
    throw new Error('Admin kullanıcısı gerekli');
  }
  
  if (!['NORMAL', 'MESEM'].includes(data.gradeType)) {
    throw new Error('Geçersiz sınıf türü');
  }
}
```

## 📝 Notlar

- Temporal veriler archive edilmez, sadece mevcut veriler archive edilir
- Her değişiklik için reason ve notes alanlarını doldurmak önemlidir
- Büyük toplu işlemler için progress tracking eklenebilir
- Performance için temporal query'lerde index kullanımına dikkat edin
- Backup stratejinizde temporal verileri de düşünün

Bu örnekleri kullanarak temporal veri sisteminizi etkin şekilde kullanabilirsiniz. Her senaryo gerçek dünya kullanım durumlarını yansıtmaktadır.