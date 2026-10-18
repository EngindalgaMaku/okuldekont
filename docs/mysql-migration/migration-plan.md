# MariaDB/MySQL + Prisma + NextAuth.js Geçiş Planı

## Mevcut Durum Analizi

### Supabase'deki Problemler
- RLS politikaları karmaşık ve çakışıyor
- Authentication sistemi güvenilir değil
- Migration yönetimi zor
- Debugging zorluluğu
- Çok fazla boilerplate kod

### Mevcut Tablo Yapısı
```sql
-- Ana Tablolar
egitim_yillari (id UUID, yil TEXT, aktif BOOLEAN)
alanlar (id UUID, ad TEXT, aktif BOOLEAN)
ogretmenler (id UUID, ad TEXT, soyad TEXT, email TEXT, telefon TEXT, pin TEXT, alan_id UUID)
isletmeler (id UUID, ad TEXT, yetkili_kisi TEXT, pin TEXT, telefon TEXT, email TEXT, adres TEXT)
ogrenciler (id UUID, ad TEXT, soyad TEXT, sinif TEXT, no TEXT, tc_no TEXT, telefon TEXT, email TEXT, alan_id UUID)
stajlar (id UUID, ogrenci_id UUID, isletme_id UUID, ogretmen_id UUID, egitim_yili_id UUID, baslangic_tarihi DATE, bitis_tarihi DATE, durum ENUM)
dekontlar (id UUID, staj_id UUID, isletme_id UUID, ogretmen_id UUID, ogrenci_id UUID, miktar DECIMAL, odeme_tarihi DATE, ay INT, yil INT, onay_durumu ENUM)
```

## Yeni Teknoloji Stack'i

### 1. Veritabanı: MariaDB/MySQL
- **Avantajlar:**
  - Stabil ve güvenilir
  - Kolay yönetim
  - Geniş hosting seçenekleri
  - Performans optimizasyonu kolay
  - Basit yetkilendirme
  
### 2. ORM: Prisma
- Type-safe database client
- Auto-generated types
- Migration yönetimi
- Excellent developer experience

### 3. Authentication: NextAuth.js
- JWT-based auth
- Multiple providers support
- Session management
- Secure ve well-tested

## Prisma Schema Tasarımı

```prisma
// MariaDB/MySQL + Prisma Schema for Okul Dekont System
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// User Management
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  adminProfile    AdminProfile?
  teacherProfile  TeacherProfile?
  companyProfile  CompanyProfile?
  
  @@map("users")
}

model AdminProfile {
  id     String @id @default(cuid())
  name   String
  userId String @unique
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("admin_profiles")
}

model TeacherProfile {
  id       String  @id @default(cuid())
  name     String
  surname  String
  phone    String?
  email    String?
  pin      String
  userId   String  @unique
  alanId   String?
  
  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  alan Alan? @relation(fields: [alanId], references: [id])
  
  // Relations
  stajlar     Staj[]
  dekontlar   Dekont[]
  companies   Company[]
  
  @@map("teachers")
}

model CompanyProfile {
  id          String  @id @default(cuid())
  name        String
  contact     String
  phone       String?
  email       String?
  address     String?
  taxNumber   String?
  pin         String
  userId      String  @unique
  teacherId   String?
  
  user    User?           @relation(fields: [userId], references: [id], onDelete: Cascade)
  teacher TeacherProfile? @relation(fields: [teacherId], references: [id])
  
  // Relations
  stajlar   Staj[]
  dekontlar Dekont[]
  students  Student[]
  
  @@map("companies")
}

// Core Entities
model EgitimYili {
  id     String  @id @default(cuid())
  year   String  @unique
  active Boolean @default(false)
  
  // Relations
  stajlar Staj[]
  
  @@map("education_years")
}

model Alan {
  id          String  @id @default(cuid())
  name        String  @unique
  description String?
  active      Boolean @default(true)
  
  // Relations
  teachers TeacherProfile[]
  students Student[]
  classes  Class[]
  
  @@map("fields")
}

model Class {
  id     String @id @default(cuid())
  name   String
  alanId String
  
  alan Alan @relation(fields: [alanId], references: [id], onDelete: Cascade)
  
  // Relations
  students Student[]
  
  @@map("classes")
}

model Student {
  id          String  @id @default(cuid())
  name        String
  surname     String
  class       String
  number      String?
  tcNo        String?
  phone       String?
  email       String?
  parentName  String?
  parentPhone String?
  alanId      String
  companyId   String?
  
  alan    Alan     @relation(fields: [alanId], references: [id])
  company Company? @relation(fields: [companyId], references: [id])
  
  // Relations
  stajlar   Staj[]
  dekontlar Dekont[]
  
  @@map("students")
}

model Staj {
  id              String     @id @default(cuid())
  studentId       String
  companyId       String
  teacherId       String
  educationYearId String
  startDate       DateTime
  endDate         DateTime
  status          StajStatus @default(ACTIVE)
  terminationDate DateTime?
  createdAt       DateTime   @default(now())
  
  student       Student        @relation(fields: [studentId], references: [id])
  company       Company        @relation(fields: [companyId], references: [id])
  teacher       TeacherProfile @relation(fields: [teacherId], references: [id])
  educationYear EgitimYili     @relation(fields: [educationYearId], references: [id])
  
  // Relations
  dekontlar Dekont[]
  
  @@map("internships")
}

model Dekont {
  id          String            @id @default(cuid())
  stajId      String
  companyId   String
  teacherId   String
  studentId   String
  amount      Decimal?          @db.Decimal(10, 2)
  paymentDate DateTime
  month       Int
  year        Int
  status      DekontStatus      @default(PENDING)
  approvedBy  String?
  approvedAt  DateTime?
  rejectedBy  String?
  rejectedAt  DateTime?
  rejectReason String?
  fileUrl     String?
  createdAt   DateTime          @default(now())
  
  staj      Staj           @relation(fields: [stajId], references: [id])
  company   Company        @relation(fields: [companyId], references: [id])
  teacher   TeacherProfile @relation(fields: [teacherId], references: [id])
  student   Student        @relation(fields: [studentId], references: [id])
  
  @@map("dekonts")
}

// Enums
enum Role {
  USER
  ADMIN
  TEACHER
  COMPANY
}

enum StajStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

enum DekontStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## Geçiş Adımları

### 1. Hazırlık (1-2 gün)
- [ ] MariaDB/MySQL sunucu kurulumu
- [ ] Prisma ve NextAuth.js dependency'leri ekleme
- [ ] Environment variables yapılandırması

### 2. Database Setup (2-3 gün)
- [ ] Prisma schema finalize etme
- [ ] Database migration'ları oluşturma
- [ ] Seed data hazırlama

### 3. Authentication Migration (3-4 gün)
- [ ] NextAuth.js konfigürasyonu
- [ ] User model ve auth provider'ları kurma
- [ ] Session management implementasyonu
- [ ] Existing user data migration

### 4. Data Migration (3-4 gün)
- [ ] Supabase'den data export
- [ ] Data transformation scripts
- [ ] MySQL'e data import
- [ ] Data integrity checks

### 5. Application Layer Changes (4-5 gün)
- [ ] Supabase client'ı Prisma ile değiştirme
- [ ] Authentication middleware güncelleme
- [ ] API routes refactoring
- [ ] Component-level auth checks

### 6. Testing & Optimization (2-3 gün)
- [ ] Unit tests güncelleme
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Security audit

## Deployment Stratejisi

### 1. Parallel Development
- Yeni MySQL sistemi mevcut Supabase ile paralel geliştirilir
- Feature flag'ler ile geçiş kontrol edilir

### 2. Data Synchronization
- Migration sırasında data sync scripts
- Downtime minimize etmek için staged rollout

### 3. Rollback Plan
- Supabase backup'ları korunur
- Quick rollback capability

## Avantajlar

### 1. Basitlik
- RLS karmaşıklığı yok
- Middleware-based authorization
- Daha az boilerplate kod

### 2. Performance
- Native SQL queries
- Better indexing control
- Optimized joins

### 3. Maintainability
- Type-safe database operations
- Auto-generated types
- Better error handling

### 4. Cost Efficiency
- Predictable pricing
- No vendor lock-in
- Scalable hosting options

## Tahmini Süre: 2-3 hafta

### Hafta 1: Setup & Migration Prep
- Database setup
- Schema design
- Data migration scripts

### Hafta 2: Core Implementation
- Authentication system
- Data migration
- Core API updates

### Hafta 3: Testing & Deployment
- Comprehensive testing
- Performance optimization
- Production deployment

## Sonuç

Bu geçiş ile:
- ✅ RLS karmaşıklığından kurtulma
- ✅ Daha güvenilir authentication
- ✅ Better developer experience
- ✅ Easier debugging
- ✅ Lower maintenance overhead
- ✅ Better performance
- ✅ Cost optimization

MariaDB/MySQL + Prisma + NextAuth.js stack'i ile daha stabil, maintainable ve performanslı bir sistem elde edeceksiniz.