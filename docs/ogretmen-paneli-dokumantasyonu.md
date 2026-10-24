# Öğretmen Paneli Kullanım Kılavuzu

## Giriş ve Genel Bakış

Öğretmen paneli, koordinatör öğretmenlerin staj süreçlerini yönetebilmesi için tasarlanmış kapsamlı bir yönetim sistemidir. Panel üzerinden işletmeleri, öğrencileri, dekontları ve belgeleri takip edebilir, bildirimlerinizi görüntüleyebilir ve sistem ayarlarınızı yönetebilirsiniz.

**[RESİM PLACEHOLDER: ogretmen-panel-genel-gorunum.png]**
*Öğretmen panelinin ana görünümü - header, tabs ve genel layout*

### Ana Özellikler:
- ✅ İşletme ve öğrenci yönetimi
- ✅ Dekont takip sistemi
- ✅ Belge yönetimi
- ✅ Bildirim sistemi
- ✅ Güvenlik (PIN sistemi)
- ✅ Dekont uyarı sistemi

---

## 1. Panel Header ve Navigasyon

### Header Bileşenleri

**[RESİM PLACEHOLDER: ogretmen-panel-header.png]**
*Panel başlığı, bildirim ikonu, PIN değiştirme ve çıkış butonları*

Header alanında şu bileşenler bulunur:
- **Başlık**: "Öğretmen Paneli - Koordinatörlük Yönetimi"
- **Bildirim İkonu**: 🔔 Okunmamış mesaj sayısı ile
- **PIN Değiştirme**: 🔑 Güvenlik ayarları
- **Çıkış Butonu**: 🚪 Sistemden çıkış

### Tab Yapısı

**[RESİM PLACEHOLDER: ogretmen-panel-tabs.png]**
*Üç ana sekme: İşletmeler, Dekont Listesi, Belgeler*

Üç ana sekme bulunur:
1. **İşletmeler** (🏢) - İşletme ve öğrenci yönetimi
2. **Dekont Listesi** (🧾) - Dekont takip ve onay
3. **Belgeler** (📄) - Belge yönetimi

---

## 2. Bildirim Sistemi

### Okunmamış Mesaj Uyarısı

**[RESİM PLACEHOLDER: ogretmen-bildirim-uyarisi.png]**
*Yeşil arka planlı bildirim alanı - okunmamış mesajlar için*

Okunmamış mesajlarınız olduğunda, panelin üst kısmında yeşil renkli bir uyarı kutusu görünür:
- 📬 Mesaj sayısı bilgisi
- Son 3 mesajın önizlemesi
- "Okundu Olarak İşaretle" butonu

### Bildirim Modal'ı

**[RESİM PLACEHOLDER: ogretmen-bildirim-modali.png]**
*Bildirim modal'ının içeriği - mesaj listesi, filtreleme ve sayfalama*

Bildirim modal'ı özellikleri:
- **Filtreler**: Okunmamış / Tümünü Göster
- **Mesaj Detayları**: Başlık, içerik, gönderen, tarih
- **Öncelik İşaretleri**: Yüksek/Normal/Düşük
- **İşlemler**: Okundu işaretle, tümünü okundu işaretle
- **Sayfalama**: Sayfa başına 5 mesaj

---

## 3. Dekont Takip Uyarı Sistemi

### Kritik Süre Uyarısı

**[RESİM PLACEHOLDER: ogretmen-kritik-sure-uyarisi.png]**
*Sarı arka planlı uyarı - ayın 1-10'u arası kritik süre*

Ayın 1-10'u arasında gösterilen sarı uyarı:
- ⏰ "KRİTİK SÜRE!" başlığı
- Eksik dekont olan öğrenci listesi
- Her öğrenci için "Hemen Yükle" butonu

### Gecikme Uyarısı

**[RESİM PLACEHOLDER: ogretmen-gecikme-uyarisi.png]**
*Kırmızı arka planlı uyarı - ayın 10'undan sonra gecikme*

Ayın 10'undan sonra gösterilen kırmızı uyarı:
- 🚨 "GECİKME UYARISI!" başlığı
- Devlet katkı payı uyarısı
- Acil dekont yükleme butonları

---

## 4. İşletmeler Sekmesi

### İşletme Kartları

**[RESİM PLACEHOLDER: ogretmen-isletme-kartlari.png]**
*Renkli işletme kartları - gradient arka plan ve bilgi kartları*

Her işletme kartı şu bilgileri içerir:
- **İşletme Adı**: Büyük, kalın font
- **Yetkili Kişi**: 👤 ikonu ile
- **Öğrenci Sayısı**: Parantez içinde
- **Şirket Türü Badge'i**: 💻 Teknoloji / 📊 Muhasebe / 🏢 Diğer
- **Belgeler Butonu**: Hızlı erişim

### Öğrenci Detay Alanı

**[RESİM PLACEHOLDER: ogretmen-ogrenci-detay-accordion.png]**
*Accordion tarzı öğrenci listesi - genişletilebilir kartlar*

Öğrenci detay kartı özellikleri:
- **Kişisel Bilgiler**: Ad-soyad, sınıf-numara
- **Durum İşaretleri**: Bekleyen/Reddedilen dekont sayıları
- **Alan Bilgisi**: Öğrencinin meslek alanı
- **Başlangıç Tarihi**: İşe başlama tarihi
- **Son Ay Durumu**: ✅/⏳/❌/❗ işaretleri

### Dekont Durumu Tablosu

**[RESİM PLACEHOLDER: ogretmen-dekont-durum-tablosu.png]**
*6 aylık dekont durumu gösterimi - renkli işaretlerle*

Her öğrenci için son 6 ayın dekont durumu:
- **✅ Yeşil**: Onaylanmış
- **⏳ Sarı**: Beklemede
- **❌ Kırmızı**: Reddedilmiş
- **➖ Gri**: Eksik/Yok

---

## 5. Dekont Listesi Sekmesi

### Filtreleme Alanı

**[RESİM PLACEHOLDER: ogretmen-dekont-filtreleme.png]**
*Arama çubuğu ve filter dropdown'ları*

Filtreleme seçenekleri:
- **Arama Kutusu**: 🔍 Öğrenci/İşletme adı
- **İşletme Filtresi**: Firma bazlı filtreleme
- **Durum Filtresi**: Bekliyor/Onaylandı/Reddedildi

### İşletme Bazlı Gruplama

**[RESİM PLACEHOLDER: ogretmen-dekont-isletme-gruplama.png]**
*Mavi başlıklı işletme grupları - istatistiklerle birlikte*

İşletme grupları şunları içerir:
- **Başlık**: Mavi gradient arka plan
- **İstatistikler**: Bekleyen, reddedilen, onaylı sayıları
- **Öğrenci Sayısı**: Toplam öğrenci ve dekont sayısı

### Öğrenci Bazlı Alt Gruplama

**[RESİM PLACEHOLDER: ogretmen-dekont-ogrenci-gruplama.png]**
*Accordion tarzı öğrenci alt grupları*

Her öğrenci grubu:
- **Öğrenci Bilgileri**: Ad-soyad, sınıf-numara
- **Durum İşaretleri**: Renkli badge'ler
- **Dekont Sayısı**: Toplam dekont adedi
- **Genişletme**: Detayları görmek için

### Dekont Detay Kartları

**[RESİM PLACEHOLDER: ogretmen-dekont-detay-kartlari.png]**
*Gri arka planlı dekont kartları - durum ve işlem butonları*

Her dekont kartı:
- **Durum Badge'i**: Renkli onay durumu
- **Ay-Yıl Bilgisi**: Mavi pill şeklinde
- **Gönderen**: Yükleyen kişi bilgisi
- **İşlem Butonları**: İndir 📥, Sil 🗑️
- **Miktar**: Yeşil renkle TL tutarı
- **Tarih**: Gri renkte oluşturulma tarihi

### Reddetme Gerekçesi

**[RESİM PLACEHOLDER: ogretmen-reddetme-gerekce.png]**
*Kırmızı arka planlı uyarı kutusu - red nedeni*

Reddedilen dekontlarda:
- ⚠️ Uyarı ikonu
- **Red nedeni başlığı**: Kalın font
- **Gerekçe metni**: Açıklayıcı metin

---

## 6. Belgeler Sekmesi

### Belge Filtreleme

**[RESİM PLACEHOLDER: ogretmen-belge-filtreleme.png]**
*Belge arama ve tür filtresi*

Belge yönetimi filtreleri:
- **Arama**: 🔍 Dosya adı, tür, işletme
- **Tür Filtresi**: Sözleşme, Fesih, Usta Öğretici, Diğer

### İşletme Bazlı Belge Gruplama

**[RESİM PLACEHOLDER: ogretmen-belge-isletme-gruplama.png]**
*Mor gradient başlıklı işletme grupları*

Belge grupları:
- **Mor Başlık**: İşletme adı ve belge sayısı
- **Belge Listesi**: Alt alta sıralı belgeler

### Belge Detay Kartları

**[RESİM PLACEHOLDER: ogretmen-belge-detay-kartlari.png]**
*Gri arka planlı belge kartları - durum ve işlemlerle*

Her belge kartı:
- **Dosya İkonu**: 📄 Belge simgesi
- **Dosya Adı**: Büyük, kalın başlık
- **Belge Türü**: Mor renkli pill
- **Durum Badge'i**: Onay durumu (Bekliyor/Onaylandı/Reddedildi)
- **Yükleyen**: Yeşil pill içinde
- **Tarih**: Yüklenme tarihi
- **İşlemler**: İndir ve sil butonları

---

## 7. Modal'lar ve Form'lar

### Dekont Yükleme Modal'ı

**[RESİM PLACEHOLDER: ogretmen-dekont-yukleme-modali.png]**
*Dekont yükleme formu - öğrenci seçimi ve dosya alanları*

Dekont yükleme formu:
- **Öğrenci Seçimi**: Dropdown menü
- **Ay/Yıl Seçimi**: İkili dropdown
- **Dosya Yükleme**: Sürükle-bırak alanı
- **Miktar**: Opsiyonel TL tutarı
- **Açıklama**: Text area

### Ek Dekont Uyarı Modal'ı

**[RESİM PLACEHOLDER: ogretmen-ek-dekont-uyarisi.png]**
*Sarı arka planlı uyarı modal'ı*

Ek dekont uyarısı:
- ⚠️ **Uyarı İkonu**: Dikkat çekici
- **Mevcut Dekont Bilgisi**: Kaç adet olduğu
- **Onay Butonları**: Vazgeç / Ek Dekont Yükle

### Belge Yükleme Modal'ı

**[RESİM PLACEHOLDER: ogretmen-belge-yukleme-modali.png]**
*Belge yükleme formu - tür seçimi ve dosya alanı*

Belge yükleme formu:
- **Belge Türü**: Dropdown seçimi
- **Dosya Seçimi**: Sürükle-bırak alanı
- **Desteklenen Formatlar**: PDF, DOC, DOCX, JPG, PNG
- **İşlem Butonları**: İptal / Belge Yükle

### PIN Değiştirme Modal'ı

**[RESİM PLACEHOLDER: ogretmen-pin-degistirme-modali.png]**
*PIN değiştirme formu - güvenlik alanları*

PIN değiştirme:
- **Mevcut PIN**: Şifre alanı
- **Yeni PIN**: 4 haneli güvenlik kodu
- **PIN Tekrar**: Doğrulama alanı
- **Güvenlik Uyarıları**: Bilgilendirme metinleri

### Hata ve Başarı Modal'ları

**[RESİM PLACEHOLDER: ogretmen-hata-basari-modallari.png]**
*Yeşil başarı ve kırmızı hata modal'ları*

Sistem geri bildirimleri:
- **Başarı**: ✅ Yeşil ikon ve mesaj
- **Hata**: ❌ Kırmızı ikon ve açıklama
- **Bilgi**: ℹ️ Mavi ikon ve detay

---

## 8. Responsive Tasarım

### Mobil Görünüm

**[RESİM PLACEHOLDER: ogretmen-panel-mobil.png]**
*Mobil cihazlarda panel görünümü*

Mobil uyumluluk:
- **Daraltılmış Header**: İkonlar küçültülür
- **Tab'lar**: Dikey yerleşim
- **Kartlar**: Tam genişlik
- **Butonlar**: Dokunmatik dostu boyut

### Tablet Görünümü

**[RESİM PLACEHOLDER: ogretmen-panel-tablet.png]**
*Tablet boyutunda orta responsive*

Tablet optimizasyonu:
- **Grid Düzeni**: 2 sütunlu yerleşim
- **Sidebar**: Daraltılabilir navigasyon
- **Modal'lar**: Orta boyut ayarı

---

## 9. Kullanım Senaryoları

### Senaryo 1: Yeni Dekont Kontrolü

**[RESİM PLACEHOLDER: ogretmen-dekont-kontrol-senaryosu.png]**
*Adım adım dekont kontrol süreci*

1. **Bildirimleri Kontrol Et**: 🔔 İkonuna tıkla
2. **Dekont Listesi**: Dekontlar sekmesine geç
3. **Filtreleme**: İlgili işletmeyi seç
4. **İnceleme**: Dekont detaylarını gözden geçir
5. **Karar**: Onayla, reddet veya beklet

### Senaryo 2: Eksik Dekont Takibi

**[RESİM PLACEHOLDER: ogretmen-eksik-dekont-takip.png]**
*Eksik dekont bulma ve yönlendirme*

1. **Uyarı Alanı**: Ana sayfadaki kırmızı/sarı uyarıya dikkat
2. **Öğrenci Listesi**: Eksik dekontlu öğrencileri gör
3. **Hızlı Yükleme**: "Hemen Yükle" butonunu kullan
4. **Takip**: Yükleme sonrası durumu kontrol et

### Senaryo 3: Belge Yönetimi

**[RESİM PLACEHOLDER: ogretmen-belge-yonetim-senaryosu.png]**
*Belge onaylama ve yönetim süreci*

1. **Belgeler Sekmesi**: Belge alanına geç
2. **İşletme Seçimi**: İlgili firmanın belgelerini aç
3. **Belge İnceleme**: Dosyayı indir ve incele
4. **Durum Güncelleme**: Onayla veya reddet
5. **Geri Bildirim**: Sonucu işletmeye ilet

---

## 10. Teknik Detaylar ve İpuçları

### Performans Optimizasyonu

- **Lazy Loading**: Büyük listelerde sayfalama
- **Cache Stratejisi**: Veri önbellekleme
- **Image Optimization**: Resim sıkıştırma

### Güvenlik Özellikleri

- **Session Timeout**: Otomatik oturum kapatma
- **PIN Şifreleme**: Güvenli PIN saklama
- **Rol Bazlı Erişim**: Yetki kontrolü

### Tarayıcı Uyumluluğu

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 11. Sorun Giderme

### Sık Karşılaşılan Sorunlar

**[RESİM PLACEHOLDER: ogretmen-sorun-giderme.png]**
*Yaygın hata mesajları ve çözümleri*

| Sorun | Çözüm |
|-------|--------|
| Dekont yüklenmezse | Dosya boyutu ve formatını kontrol edin |
| Bildirimler gelmezse | Tarayıcı bildirimlerini aktifleştirin |
| Sayfa yavaşsa | Cache'i temizleyin |
| Oturum kapanırsa | PIN'inizi kontrol edin |

### Destek İletişimi

- 📧 **E-posta**: destek@okulsistemi.com
- 📞 **Telefon**: 0212 XXX XX XX
- 💬 **Canlı Destek**: Panel içi chat

---

**Son Güncelleme**: 25 Ocak 2025  
**Versiyon**: 2.1.0  
**Hazırlayan**: Sistem Geliştirme Ekibi