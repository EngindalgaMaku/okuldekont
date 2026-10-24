# Veri Temizleme ve Mock Veri Oluşturma Sistemi

## Genel Bakış

Bu sistem, okul dekont uygulamasındaki verileri temizlemek ve tutarlı mock veriler oluşturmak için geliştirilmiştir. Sistem, admin kullanıcıları ve sistem ayarlarını koruyarak diğer tüm verileri temizler ve yeniden oluşturur.

## Dosya Konumu

```
scripts/clean-and-seed-data.js
```

## Özellikler

### 🧹 Veri Temizleme
- Admin kullanıcıları ve sistem ayarları korunur
- Dekont, staj, öğrenci, işletme, öğretmen, sınıf, alan ve eğitim yılı verileri temizlenir
- Güvenli silme işlemi ile veri bütünlüğü korunur

### 🏗️ Mock Veri Oluşturma
- **Temel Yapı**: Eğitim yılı, alanlar ve sınıflar
- **Öğretmenler**: 15 gerçekçi öğretmen profili
- **İşletmeler**: 15 çeşitli sektörden işletme
- **Öğrenciler**: Her sınıf için 15-20 öğrenci (~1000 öğrenci)
- **Stajlar**: Her öğrenci için staj kaydı (1000 staj)
- **Dekontlar**: Her staj için 2-4 dekont kaydı (~3000 dekont)

## Kullanım

### Script Çalıştırma
```bash
node scripts/clean-and-seed-data.js
```

### Programatik Kullanım
```javascript
const { cleanAndSeedData } = require('./scripts/clean-and-seed-data')

await cleanAndSeedData()
```

## Oluşturulan Veri Yapısı

### Eğitim Alanları
- Bilişim Teknolojileri
- Muhasebe ve Finansman
- Pazarlama ve Perakende
- Sağlık Hizmetleri
- Turizm ve Otelcilik
- Endüstriyel Otomasyon

### Sınıf Yapısı
Her alan için 4 sınıf:
- 11A, 11B (11. sınıf)
- 12A, 12B (12. sınıf)

### Öğretmen Verileri
- 15 çeşitli isimde öğretmen
- Her öğretmen bir alan ile ilişkilendirilir
- Aktif durumda oluşturulur
- Gerçekçi iletişim bilgileri

### İşletme Verileri
- 15 farklı sektörden işletme
- Her işletmeye koordinatör öğretmen atanır
- Detaylı işletme bilgileri (vergi no, adres, çalışan sayısı)
- Gerçekçi iletişim bilgileri

### Öğrenci Verileri
- Her sınıf için 15-20 öğrenci
- Türkçe isim ve soyisimler
- Otomatik TC kimlik numarası
- Veli bilgileri
- Sınıf ve alan ilişkilendirmesi

### Staj Verileri
- Her öğrenci için bir staj kaydı
- Rastgele işletme ve öğretmen ataması
- 2024-2025 eğitim yılı tarihleri
- Aktif durum

### Dekont Verileri
- Her staj için 2-4 dekont
- 100-600 TL arası tutarlar
- Aylık ödeme dönemleri
- %80 onaylı, %20 bekleyen durumlar
- Otomatik ödeme son tarihi (30 gün)

## Teknik Detaylar

### Veritabanı Bağlantısı
```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### UUID Oluşturma
```javascript
function generateUUID() {
  return crypto.randomUUID()
}
```

### Hata Yönetimi
- Comprehensive error handling
- Detailed error messages
- Transaction-like operations
- Rollback capability

## Güvenlik

### Korunan Veriler
- Admin kullanıcı hesapları
- Sistem ayarları
- Önemli konfigürasyon verileri

### Güvenlik Önlemleri
- Service role key kullanımı
- Doğrulama ve kontrol mekanizmaları
- Veri bütünlüğü korunması

## Çıktı Örneği

```
🧹 Veri Temizleme ve Mock Veri Oluşturma Sistemi
════════════════════════════════════════════════════════════════
⚠️  Admin kullanıcıları ve sistem ayarları korunacak
🔄 Diğer tüm veriler silinip yeniden oluşturulacak

🧹 1. Mevcut veriler temizleniyor...
   ✅ Veri temizleme tamamlandı
🏗️  2. Temel yapı verileri oluşturuluyor...
   ✅ 6 mevcut alan kullanılacak
👨‍🏫 3. Öğretmen verileri oluşturuluyor...
   ✅ 15 öğretmen oluşturuldu
🏢 4. İşletme verileri oluşturuluyor...
   ✅ 15 işletme oluşturuldu
👨‍🎓 5. Öğrenci verileri oluşturuluyor...
   ✅ 994 öğrenci oluşturuldu
📋 6. Staj verileri oluşturuluyor...
   ✅ 1000 staj kaydı oluşturuldu
💰 7. Dekont verileri oluşturuluyor...
   ✅ 3012 dekont kaydı oluşturuldu

✅ Veri temizleme ve mock veri oluşturma tamamlandı!
📊 Oluşturulan veri özeti:
   👨‍🏫 Öğretmenler: 262
   🏢 İşletmeler: 307
   👨‍🎓 Öğrenciler: 1000
   📋 Stajlar: 1000
   💰 Dekontlar: 1000
   🎯 Alanlar: 6
   📚 Sınıflar: 57
   🤝 Koordinatörü olan işletmeler: 247
```

## Sorun Giderme

### Yaygın Hatalar

1. **Database Connection Error**
   - `.env` dosyasındaki Supabase URL'lerini kontrol edin
   - Service role key'in doğru olduğundan emin olun

2. **Schema Mismatch**
   - Veritabanı şemasının güncel olduğundan emin olun
   - Eksik kolonlar varsa veritabanını güncelleyin

3. **Constraint Violations**
   - Foreign key ilişkilerini kontrol edin
   - Not-null constraint'leri gözden geçirin

### Debug Modu
Script içinde detaylı hata mesajları mevcuttur. Hata durumunda:
- Tam hata mesajını inceleyin
- Hangi aşamada hata oluştuğunu belirleyin
- Veritabanı bağlantısını test edin

## Geliştirme

### Yeni Veri Türü Ekleme
1. Yeni veri oluşturma fonksiyonu yazın
2. Ana `cleanAndSeedData` fonksiyonuna ekleyin
3. Temizleme işlemine dahil edin
4. Test edin

### Veri Miktarını Değiştirme
- Öğretmen sayısını değiştirmek için `ogretmenler` array'ini güncelleyin
- İşletme sayısını değiştirmek için `isletmeler` array'ini güncelleyin
- Öğrenci sayısını değiştirmek için `ogrenciSayisi` hesaplamasını değiştirin

## Sonuç

Bu sistem, okul dekont uygulamasının test edilmesi ve geliştirilmesi için tutarlı ve gerçekçi mock veriler sağlar. Sistem, veri bütünlüğünü koruyarak güvenli bir şekilde verileri temizler ve yeniden oluşturur.

---
*Son güncelleme: 14 Temmuz 2025*