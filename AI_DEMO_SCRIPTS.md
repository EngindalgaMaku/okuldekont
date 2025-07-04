# 🎬 AI Demo Script Koleksiyonu

## 📝 Türkçe Ses Script'leri (Zaman Bazlı)

### INTRO (0-30 saniye) - 45 kelime
```
Merhaba! Hüsniye Özdilek Mesleki ve Teknik Anadolu Lisesi için geliştirdiğimiz modern dekont yönetim sistemini tanıtacağım. Bu sistem Next.js ve Supabase teknolojileri ile tamamen güvenli ve kullanıcı dostu olarak tasarlanmıştır.
```

### ANA SAYFA (30s-2dk) - 135 kelime
```
Sistemimizin ana sayfasında modern ve çekici bir tasarım görüyorsunuz. Gradient background ve minimal interface kullanıcı deneyimini artırıyor. İki farklı kullanıcı tipi mevcut: İşletmeler ve Öğretmenler. 

Akıllı arama sistemi sayesinde kullanıcılar kolayca kendilerini bulabiliyorlar. Minimum iki karakter yazıldığında real-time arama başlıyor. Debounced search teknolojisi ile performans optimize edilmiştir. 

Dropdown menüde sonuçlar anında görüntüleniyor. İşletme seçimi yapıldıktan sonra dört haneli PIN girişi gerekiyor. Sistem güvenlik öncelikli olarak tasarlanmıştır.
```

### GÜVENLİK (2dk-3dk) - 90 kelime
```
Güvenlik sistemimiz çok gelişmiştir. PIN tabanlı giriş sistemi, üç yanlış denemede otomatik hesap kilitleme, IP adresi tracking ve detaylı audit log sistemi bulunmaktadır. 

Bruteforce saldırılarına karşı tam koruma sağlıyoruz. Her giriş denemesi veritabanında loglanıyor. Yanlış PIN girişlerinde kullanıcı dostu mesajlar gösteriliyor. Üçüncü yanlış denemede hesap güvenlik nedeniyle kilitlenir.
```

### İŞLETME PANELİ (3dk-5dk) - 180 kelime
```
İşletme paneline başarılı giriş sonrası modern dashboard görüyoruz. Hoş geldin mesajı, hızlı eylem butonları ve istatistik kartları mevcut. 

Yeni dekont oluşturma formunda akıllı öğrenci arama sistemi var. Öğrenci adını yazdığımızda sistem otomatik tamamlıyor. Form alanları: çalışma tarihi, başlangıç ve bitiş saati, detaylı açıklama ve dört farklı puanlama kategorisi.

Teorik bilgi, uygulama becerisi, davranış ve devam puanları ayrı ayrı giriliyor. Puanlar sıfır ile yüz arasında olmalıdır. Dekont kaydedildikten sonra liste görünümünde görüntüleniyor. 

Mevcut dekontlar tabloda filtrelenebilir ve düzenlenebilir. İşletmeler sadece kendi öğrencilerine dekont oluşturabiliyor. Sistem yetkilendirme kontrolü yapıyor.
```

### ÖĞRETMEN PANELİ (5dk-7dk) - 180 kelime
```
Öğretmen girişinde de aynı güvenlik sistemi çalışıyor. Öğretmen seçimi ve PIN doğrulaması yapılıyor. 

Öğretmen panelinde kişisel bilgiler, sorumlu olunan öğrenciler ve bekleyen onaylar görüntüleniyor. Dashboard temiz ve bilgilendirici tasarlanmış.

Öğretmenler de dekont oluşturabiliyor ve mevcut dekontları yönetebiliyorlar. Kendi alanındaki öğrenciler için dekont onaylayabilirler. 

Dekont listesinde filtreleme ve sıralama özellikleri mevcut. Öğretmenler öğrenci performansını detaylı olarak takip edebiliyor. Puanlama sisteminde tutarlılık kontrolleri var.

Öğretmen yetkileri alan bazında sınırlandırılmış. Sadece kendi sorumluluğundaki öğrencilere erişim var. Sistem role-based access control uyguluyor.
```

### ADMİN PANELİ (7dk-11dk) - 360 kelime
```
Admin paneli sistemin kalbi. Burada tüm yönetim işlemleri gerçekleştiriliyor. Ana dashboard'da kapsamlı istatistikler görüntüleniyor.

İşletme yönetiminde CRUD işlemleri, gelişmiş arama ve filtreleme özellikleri var. Yeni işletme ekleme formu tüm gerekli alanları içeriyor: işletme adı, yetkili kişi, iletişim bilgileri, adres ve alan seçimi.

Her işletmeye otomatik ID atanıyor ve PIN oluşturuluyor. İşletme-alan ilişkilendirmesi yapılabiliyor. Toplu işlem özellikleri mevcut.

Alan yönetiminde meslek alanları tanımlanıyor. Bilgisayar programcılığı, elektrik-elektronik, makine teknolojisi gibi alanlar sisteme eklenebiliyor. Her alan için açıklama ve sorumlu öğretmen ataması yapılıyor.

Öğretmen yönetimi kapsamlı. Kişisel bilgiler, iletişim detayları, alan ataması ve yetki yönetimi burada yapılıyor. Öğretmen PIN'leri güvenli şekilde saklanıyor.

Dekont yönetimi merkezi kontrol noktası. Tüm dekontlar burada görüntüleniyor. Tarih, durum ve öğrenci bazında filtreleme yapılabiliyor. Onaylama ve red işlemleri toplu olarak yapılabiliyor.

Sistem ayarları iki ana kategoride: Eğitim Yılı Yönetimi ve Güvenlik Yönetimi. Aktif eğitim yılı seçimi, yeni yıl ekleme ve geçmiş yıl arşivleme işlemleri.

Güvenlik bölümünde kilitli hesaplar, PIN giriş logları ve güvenlik raporları görüntüleniyor. Kilitli hesapları tek tıkla açabilirsiniz. Detaylı audit trail mevcut.
```

### RESPONSİVE TASARIM (11dk-12dk) - 90 kelime
```
Sistemimiz tamamen responsive tasarlanmış. Developer tools ile farklı cihaz boyutlarını test ediyoruz. 

Tablet görünümünde layout otomatik olarak uyum sağlıyor. Menü yapısı ve buton boyutları optimize ediliyor. 

Mobil görünümde hamburger menü devreye giriyor. Touch-friendly butonlar aktif oluyor. Tüm özellikler mobilde de sorunsuz çalışıyor. Cross-device compatibility tam olarak sağlanmış.
```

### SONUÇ (12dk-13dk) - 90 kelime
```
Bu sistem ile okul yönetimi tüm staj süreçlerini dijital ortamda, güvenli ve verimli bir şekilde yönetebiliyor. 

Özellikler özetle: Modern responsive tasarım, gelişmiş güvenlik sistemi, kapsamlı yönetim panelleri, real-time arama ve filtreleme, comprehensive audit trail.

Sistem ölçeklenebilir, güvenli ve kullanıcı dostu. Türk eğitim sisteminin ihtiyaçlarına özel olarak tasarlanmıştır. Demo için teşekkürler!
```

---

## 🎭 Avatar Prompts (HeyGen/Synthesia için)

### Presenter Karakteri
```
Professional educator or tech presenter, 30-35 years old, 
business casual attire, confident but friendly demeanor, 
Turkish speaking, clear articulation, moderate pace
```

### Görsel Stil
```
Clean modern background, tech company office setting,
soft lighting, professional but approachable atmosphere,
minimal distractions, focus on presenter
```

---

## 🎨 Video Transition Prompts (RunwayML için)

### Bölüm Geçişleri
```
Smooth dissolve transition between web interfaces,
modern digital transformation effect,
blue to white gradient overlay,
professional tech aesthetic
```

### Özellik Vurguları
```
Subtle zoom and highlight effects on UI elements,
glow effects for buttons and forms,
smooth pan across dashboard interfaces,
clean modern animation style
```

---

## 📊 Timing Hesaplaması

**Toplam Script:** ~1,200 kelime  
**Konuşma Hızı:** 150 kelime/dakika (orta tempo)  
**Toplam Süre:** ~8 dakika konuşma + 5 dakika ekran = **13 dakika**

**Ses Dosyası Bölümleri:**
- intro.mp3 (30s)
- homepage.mp3 (90s) 
- security.mp3 (60s)
- isletme.mp3 (120s)
- ogretmen.mp3 (120s)
- admin.mp3 (240s)
- responsive.mp3 (60s)
- conclusion.mp3 (60s)

---

## 🚀 Hızlı Üretim Script'i

```bash
# 1. ElevenLabs API kullanımı
curl -X POST \
  'https://api.elevenlabs.io/v1/text-to-speech/voice-id' \
  -H 'xi-api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Script içeriği buraya",
    "voice_settings": {
      "stability": 0.75,
      "similarity_boost": 0.75
    }
  }' \
  --output intro.mp3

# 2. Otomatik video birleştirme (FFmpeg)
ffmpeg -i intro.mp3 -i intro_screen.mp4 -c copy intro_final.mp4

# 3. Tüm bölümleri birleştir
ffmpeg -f concat -i segment_list.txt -c copy final_demo.mp4
```

Bu script'lerle hem hızlı hem de kaliteli AI demo video'su oluşturabilirsiniz! 🎬✨ 