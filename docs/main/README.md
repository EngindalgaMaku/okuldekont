# Koordinatörlük Yönetim Sistemi

Meslek lisesi staj koordinatörlüğü için dekont ve staj yönetim sistemi.

## 🚀 Kurulum

```bash
npm install
npm run dev
```

## 🔐 Admin Panel Giriş Bilgileri

### Admin Kullanıcı Hesabı
- **E-posta:** `admin@sistem.com`
- **Şifre:** `AdminSistem2025!`
- **Panel URL:** http://localhost:3000/admin/login

> **⚠️ Güvenlik Notu:** Bu bilgiler geliştirme ortamı içindir. Production ortamında mutlaka değiştirilmelidir.

### Admin Kullanıcı Oluşturma
Yeni admin kullanıcı oluşturmak için:
```bash
node scripts/create-admin-confirmed.js
```

## 📋 Sistem Modülleri

### 🏫 Admin Paneli (`/admin`)
- **Genel Bakış:** Sistem özeti ve istatistikler
- **Meslek Alanları:** Alan bazlı öğrenci, öğretmen ve staj yönetimi
- **İşletme Portalı:** İşletme kayıt ve staj yönetimi
- **Öğretmen Portalı:** Öğretmen yetkilendirme ve görev takibi
- **Dekont Merkezi:** Staj ücret ve dekont yönetimi
- **Sistem Ayarları:** Genel sistem yapılandırması

### 👨‍🏫 Öğretmen Paneli (`/ogretmen`)
- Öğrenci staj takibi
- Dekont onay süreçleri
- Koordinatörlük işlemleri

### 🏢 İşletme Portalı (`/isletme`)
- İşletme kaydı ve profil yönetimi
- Stajyer başvuru süreçleri
- Staj değerlendirmeleri

## 🛡️ Güvenlik Özellikleri

- **Supabase Auth:** Enterprise-grade authentication
- **Role-based Access:** Admin, öğretmen ve işletme yetki seviyeleri
- **Session Management:** Güvenli oturum yönetimi
- **Route Protection:** Yetkisiz erişim koruması

## 🗄️ Veritabanı

### Mevcut Tablolar
- `ogretmenler` - Öğretmen bilgileri
- `alanlar` - Meslek alanları
- `auth.users` - Kullanıcı hesapları (Supabase Auth)

### Seed Data
Test verisi eklemek için:
```bash
node scripts/seed-ogretmenler.js
```

## 📈 Geliştirme Durumu

### ✅ Tamamlanan Fazlar
- **Phase 1:** Kritik düzeltmeler ve veri altyapısı
- **Phase 2:** Güvenlik iyileştirmeleri
- **Phase 3:** Navigasyon düzeltmeleri ve 404 hataları
- **Phase 4:** UX/UI iyileştirmeleri ve performans optimizasyonu
- **Phase 5:** Raporlama ve analytics sistemi

### 🎯 Sistem Tamamlandı
Tüm planlanan fazlar başarıyla tamamlanmıştır!

## 🔧 Teknik Stack

- **Frontend:** Next.js 15.3.4, React, TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **UI Components:** Headless UI, Lucide Icons

## 📝 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.