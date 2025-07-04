# 🎥 Video Demo Script - Okul Dekont Sistemi

## ⏱️ Zaman Planlaması (Toplam: 15 dakika)

### AÇILIŞ SEGMENTİ (0:00 - 1:00)

**[Ekran: Başlık slide'ı]**
> "Merhaba! Ben [İsminiz]. Bugün sizlere Hüsniye Özdilek Mesleki ve Teknik Anadolu Lisesi için geliştirdiğimiz modern dekont yönetim sistemini tanıtacağım."

**[Ekran geçişi: Sistem özellikleri slide'ı]**
> "Bu sistem Next.js 14, TypeScript ve Supabase teknolojileri kullanılarak geliştirilmiş, tamamen responsive ve güvenli bir çözümdür."

---

### ANA SAYFA DEMO (1:00 - 3:00)

**[Ekran: localhost:3000]**
> "Sistemimizin ana sayfasında modern ve kullanıcı dostu bir tasarım görebiliyorsunuz. Gradient background ve minimal tasarım kullanıcı deneyimini artırıyor."

**[Mouse hover: İşletme ve Öğretmen butonları]**
> "İki farklı kullanıcı tipi mevcut: İşletmeler ve Öğretmenler. Şimdi işletme girişini deneyelim."

**[Tıkla: İşletme Girişi]**
> "Akıllı arama sistemi sayesinde kullanıcılar kolayca kendilerini bulabiliyorlar. Minimum 2 karakter yazınca real-time arama başlıyor."

**[Yaz: "Tek"]**
> "Görüyorsunuz, debounced search sistemi çalışıyor ve loading animasyonu gösteriliyor."

**[Seç: Teknoloji A.Ş.]**
> "Dropdown'dan işletmeyi seçiyoruz. Otomatik olarak form doldu."

**[PIN gir: 1234]**
> "4 haneli PIN giriyoruz ve giriş yapıyoruz."

---

### GÜVENLİK SİSTEMİ DEMO (3:00 - 4:30)

**[Yeni sekme: Ana sayfa]**
> "Şimdi sistemin güvenlik özelliklerini gösterelim. PIN kilitleme sistemimiz bruteforce saldırılarına karşı koruma sağlıyor."

**[Öğretmen seçimi ve yanlış PIN]**
> "Bir öğretmen seçiyorum ve kasıtlı olarak yanlış PIN giriyorum."

**[1. yanlış PIN: 0000]**
> "İlk yanlış denemede 'Kalan deneme hakkınız: 2' mesajı alıyoruz."

**[2. yanlış PIN: 1111]**
> "İkinci yanlış denemede 'Kalan deneme hakkınız: 1' uyarısı."

**[3. yanlış PIN: 2222]**
> "Üçüncü yanlış denemede hesap kilitlendi. Bu güvenlik önlemi IP bazlı olarak çalışıyor."

---

### İŞLETME PANELİ (4:30 - 7:00)

**[Geri dön: İşletme giriş]**
> "Şimdi geçerli bilgilerle işletme paneline girelim."

**[Ekran: /panel]**
> "İşletme dashboard'unda hoş karşılama mesajı, hızlı eylem butonları ve istatistik kartları var."

**[Tıkla: Yeni Dekont]**
> "Yeni dekont oluşturma formunda akıllı öğrenci arama sistemi mevcut."

**[Öğrenci ara ve seç]**
> "Öğrenci adını yazıyoruz, sistem otomatik tamamlıyor."

**[Form doldur: Tarih, saat, açıklama, puanlar]**
> "Çalışma tarihi, saat aralığı, detaylı açıklama ve puanlama sistemini dolduruyoruz."

**[Kaydet]**
> "Dekont başarıyla kaydedildi. Liste görünümünde görebiliyoruz."

---

### ÖĞRETMEN PANELİ (7:00 - 9:00)

**[Yeni sekme: /ogretmen/login]**
> "Öğretmen girişinde de aynı güvenlik sistemi çalışıyor."

**[Öğretmen giriş: Doğru PIN]**
> "Geçerli PIN ile giriş yapıyoruz."

**[Ekran: /ogretmen/panel]**
> "Öğretmen panelinde kişisel bilgiler, sorumlu öğrenciler ve bekleyen onaylar görüntüleniyor."

**[Tıkla: Dekont Yönetimi]**
> "Öğretmenler de dekont oluşturabiliyor ve mevcut dekontları yönetebiliyorlar."

---

### ADMİN PANELİ - ANA DEMO (9:00 - 13:00)

**[Ekran: /admin]**
> "Admin paneli sistemin kalbi. Burada tüm yönetim işlemleri gerçekleştiriliyor."

**[Dashboard kartlarını göster]**
> "Ana dashboard'da toplam istatistikler, işletme sayısı, öğretmen sayısı ve güvenlik durumu görüntüleniyor."

#### İşletme Yönetimi (30 saniye)
**[Tıkla: İşletmeler]**
> "İşletme yönetiminde CRUD işlemleri, arama ve filtreleme özellikleri var."

**[Yeni işletme ekle - hızlı demo]**
> "Yeni işletme ekleme formu tüm gerekli alanları içeriyor."

#### Alan Yönetimi (30 saniye)
**[Tıkla: Alanlar]**
> "Meslek alanları buradan yönetiliyor. İşletme-alan ilişkilendirmesi de burada yapılıyor."

#### Dekont Yönetimi (45 saniye)
**[Tıkla: Dekontlar]**
> "Tüm dekontlar merkezi olarak yönetiliyor. Filtreleme, onaylama ve raporlama özellikleri mevcut."

**[Filtreleme göster]**
> "Tarih, durum ve öğrenci bazında filtreleme yapılabiliyor."

#### Sistem Ayarları (45 saniye)
**[Tıkla: Ayarlar]**
> "Sistem ayarlarında iki ana kategori var: Eğitim Yılı ve Güvenlik Yönetimi."

**[Eğitim Yılı sekmesi]**
> "Aktif eğitim yılı yönetimi ve yeni yıl ekleme işlemleri."

**[Güvenlik sekmesi]**
> "Kilitli hesaplar, PIN logları ve güvenlik raporları burada görüntüleniyor."

**[Kilit açma demo]**
> "Kilitli hesapları tek tıkla açabiliyoruz."

---

### RESPONSİVE TASARIM DEMO (13:00 - 14:00)

**[F12 - Developer Tools aç]**
> "Sistemimiz tamamen responsive. Şimdi farklı cihaz boyutlarında nasıl göründüğünü gösterelim."

**[Device simulation: Tablet]**
> "Tablet görünümünde layout otomatik olarak uyum sağlıyor."

**[Device simulation: Mobile]**
> "Mobil görünümde hamburger menü devreye giriyor ve touch-friendly butonlar aktif oluyor."

---

### SONUÇ VE GELECEK (14:00 - 15:00)

**[Ekran: Ana sayfa - normal görünüm]**
> "Bu sistem ile okul yönetimi tüm staj süreçlerini dijital ortamda, güvenli ve verimli bir şekilde yönetebiliyor."

**[Özellikler listesi göster]**
> "Özetle sistemimizin özellikleri:
> - Modern ve responsive tasarım
> - Gelişmiş güvenlik sistemi
> - Kapsamlı yönetim panelleri
> - Real-time arama ve filtreleme
> - Comprehensive audit trail"

**[İletişim bilgileri]**
> "Demo için teşekkürler. Sorularınız için benimle iletişime geçebilirsiniz."

---

## 🎬 Video Hazırlık Checklist

### Kayıt Öncesi
- [ ] **Ekran çözünürlüğü:** 1920x1080 (Full HD)
- [ ] **Browser:** Chrome/Edge (devtools uyumlu)
- [ ] **Zoom level:** 100% (crisp görüntü için)
- [ ] **Notifications:** Tüm bildirimler kapalı
- [ ] **Desktop:** Temiz, dikkat dağıtmayan
- [ ] **Audio:** Mikrofon test edilmiş
- [ ] **Demo data:** Test verileri hazır

### Kayıt Ayarları (OBS Studio)
- **Canvas:** 1920x1080
- **FPS:** 30 (smooth recording)
- **Encoder:** x264 (compatibility)
- **Quality:** High (dosya boyutu vs kalite dengesi)
- **Audio:** 44.1kHz, Stereo

### Sunum Teknikleri
- **Konuşma hızı:** Yavaş ve net
- **Mouse movements:** Yumuşak ve amaçlı
- **Pause between sections:** 2-3 saniye
- **Error handling:** Plan B senaryoları hazır
- **Timing:** Her segment için stopwatch

---

## 🎤 Ses Kayıt İpuçları

### Mikrofon Ayarları
- **Gain level:** -12dB to -6dB arası
- **Noise gate:** Arka plan gürültüsü için
- **Compressor:** Ses seviyesi dengesi
- **EQ:** Berraklık için hafif high-pass filter

### Konuşma Teknikleri
- **Tempo:** Dakikada 150-160 kelime
- **Vurgu:** Önemli özellikleri vurgula
- **Pause:** Düşünce geçişlerinde dur
- **Energy:** Enerjik ama sakin ton

---

## 📝 Post-Production

### Video Editing
- **Intro/Outro:** Profesyonel geçişler
- **Callouts:** Önemli UI elementleri için
- **Zoom effects:** Detay gösterimler için
- **Background music:** Hafif, dikkat dağıtmayan
- **Captions:** Erişilebilirlik için

### Export Ayarları
- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080
- **Bitrate:** 8-10 Mbps
- **Audio:** AAC, 192 kbps

---

Bu rehber ile profesyonel bir demo video'su çekebilir ve sisteminizin tüm özelliklerini etkileyici bir şekilde sunabilirsiniz! 🎥✨ 