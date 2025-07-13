# Okul Dekont Sistemi - Demo Akışı

Bu doküman, "Okul Dekont Sistemi" projesinin temel işlevlerini ve kullanıcı akışlarını anlatmaktadır. Sistem, üç ana kullanıcı rolü üzerine kurulmuştur: **Admin**, **Öğretmen** ve **İşletme**.

---

## 1. Genel Bakış

Sistem, meslek lisesi öğrencilerinin staj yaptıkları işletmelerden aldıkları maaşların dekontlarının dijital olarak toplanması, takip edilmesi ve arşivlenmesi sürecini yönetir.

- **Teknolojiler:** Next.js, TypeScript, Supabase, Tailwind CSS, Tesseract.js (OCR)
- **Ana Varlıklar:** Eğitim Yılı, Alan, Öğretmen, İşletme, Öğrenci, Staj, Dekont

---

## 2. Kullanıcı Rolleri ve Akışları

### 👤 Admin Paneli (`/admin`)

Admin, sistemin tüm yetkilerine sahip olan kullanıcıdır.

**Giriş:**
- Admin, `/admin/login` sayfasından e-posta ve şifresi ile giriş yapar.

**Ana Sayfa (Dashboard):**
- Sistemin genel durumu hakkında istatistiksel bilgiler (toplam öğrenci, işletme, onay bekleyen dekont sayısı vb.) içeren bir karşılama ekranı.
- Sol menüden tüm yönetim modüllerine erişim sağlar.

**Modüller:**
- **Alanlar:** Okuldaki bölümleri (Bilişim, Muhasebe vb.) yönetir. Yeni alan ekleyebilir, mevcutları düzenleyebilir.
- **Öğretmenler:** Sisteme öğretmen kaydı yapar ve onlara bir PIN atar. Öğretmenlerin sorumlu olduğu işletmeleri görüntüler.
- **İşletmeler:** Stajyer öğrenci alan işletmeleri sisteme kaydeder. İşletmelere sorumlu öğretmen atar ve bir PIN kodu oluşturur.
- **Öğrenciler:** Öğrenci bilgilerini (ad, soyad, sınıf, alan) yönetir.
- **Stajlar:** Öğrencileri, işletmeleri ve sorumlu öğretmenleri eşleştirerek staj kayıtları oluşturur. Bu kayıtlar, dekont takibinin temelini oluşturur.
- **Dekontlar:** Yüklenen tüm dekontları listeler. Dekontları filtreleyebilir, durumlarını (onaylandı, reddedildi, bekliyor) görüntüleyebilir ve detaylarını inceleyebilir.
- **Ayarlar:** Eğitim yılı gibi sistemsel ayarları yönetir.

---

### 👨‍🏫 Öğretmen Paneli (`/ogretmen`)

Öğretmen, kendisine atanan işletmelerdeki öğrencilerin staj süreçlerinden sorumludur.

**Giriş:**
- Öğretmen, `/ogretmen/login` sayfasından kendisine atanan okul numarası/kullanıcı adı ve PIN ile giriş yapar.

**Ana Sayfa (Panel):**
- Sorumlu olduğu öğrencilerin listesini ve dekont durumlarını özetleyen bir panel.
- Onay bekleyen dekontlar için bir bildirim alanı bulunur.

**İşlevler:**
- **Dekont Onayı:** İşletmeler tarafından yüklenen dekontları görüntüler. Dekontun içeriğini (tutar, tarih vb.) kontrol eder.
  - **Onayla:** Dekont bilgileri doğruysa onaylar. Dekont durumu "Onaylandı" olarak güncellenir.
  - **Reddet:** Dekontta bir sorun varsa (okunmuyor, yanlış tutar vb.) bir açıklama ile reddeder. Dekont durumu "Reddedildi" olarak güncellenir ve işletmenin yeniden yüklemesi gerekir.
- **Öğrenci Görüntüleme:** Sorumlu olduğu öğrencilerin staj bilgilerini ve geçmiş dekontlarını görüntüler.

---

### 🏢 İşletme Paneli (`/isletme`)

İşletme, stajyer öğrencilere yaptığı ödemelerin dekontlarını sisteme yüklemekle sorumludur.

**Giriş:**
- İşletme yetkilisi, `/isletme/login` sayfasından admin tarafından oluşturulan kullanıcı adı ve PIN ile giriş yapar.

**Ana Sayfa:**
- İşletmede staj yapan öğrencilerin listesi.
- Geçmişte yüklenmiş dekontların durumu (onaylandı, reddedildi, bekliyor).

**İşlevler:**
- **Dekont Yükleme:**
  1. İlgili öğrenciyi seçer.
  2. Ödeme ayını seçer.
  3. `/isletme/dekont/yeni` sayfasından dekont dosyasını (PDF veya resim) yükler.
  4. Sistem, OCR (Optik Karakter Tanıma) teknolojisi ile dekont üzerindeki IBAN, tutar ve tarih gibi bilgileri otomatik olarak okumaya çalışır.
  5. İşletme yetkilisi, okunan bilgileri kontrol eder, gerekirse düzeltir ve formu gönderir.
  6. Dekont, sorumlu öğretmenin onayına düşer ve durumu "Bekliyor" olarak ayarlanır.
- **Reddedilen Dekontlar:** Öğretmen tarafından reddedilen dekontlar için bildirim alır ve açıklamasını görür. Gerekli düzeltmeyi yaparak dekontu yeniden yükler.

---

## 3. Veritabanı ve Güvenlik

- **Veritabanı:** Supabase (PostgreSQL) kullanılmıştır.
- **Güvenlik:**
  - **RLS (Row Level Security):** Her kullanıcı rolünün sadece kendi yetkisi dahilindeki verileri görmesi sağlanır. Örneğin, bir işletme başka bir işletmenin öğrencilerini veya dekontlarını göremez.
  - **PIN ile Giriş:** Öğretmen ve işletmeler için basit ve güvenli bir giriş mekanizması sunar.
  - **Giriş Denemesi Kısıtlama:** Belirli sayıda hatalı PIN girişinden sonra hesap geçici olarak kilitlenir.