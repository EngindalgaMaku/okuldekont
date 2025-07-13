# 🛡️ Database Security & Protection System

Okul Dekont Sistemi için kapsamlı veritabanı güvenlik ve koruma sistemi. Bu sistem, SQL altyapısını korumak ve herhangi bir bozulmada hızlı müdahale edebilmek için tasarlanmıştır.

## 📋 Sistem Bileşenleri

### 1. 💾 Otomatik Yedekleme Sistemi
**Dosya:** [`scripts/database-backup-scheduler.js`](scripts/database-backup-scheduler.js)

Farklı seviyede otomatik yedeklemeler sağlar:

- **Günlük Yedekler:** Her gün otomatik çalışır (7 gün saklanır)
- **Haftalık Yedekler:** Her Pazartesi çalışır (4 hafta saklanır)
- **Aylık Yedekler:** Her ayın 1'inde çalışır (12 ay saklanır)
- **Acil Durum Yedekleri:** Manuel veya sistem tarafından tetiklenir

```bash
# Komutlar
npm run backup:daily        # Günlük yedek
npm run backup:weekly       # Haftalık yedek
npm run backup:monthly      # Aylık yedek
npm run backup:emergency    # Acil durum yedeği
npm run backup:all          # Tüm yedeklemeleri çalıştır
```

### 2. ↩️ Veritabanı Rollback Sistemi
**Dosya:** [`scripts/database-rollback-system.js`](scripts/database-rollback-system.js)

Güvenli veri geri yükleme sistemi:

- **Dry Run Modu:** Gerçek değişiklik yapmadan simülasyon
- **Pre-Rollback Backup:** Geri alma öncesi güvenlik yedeği
- **Tablo Bazlı Rollback:** Sadece belirli tabloları geri yükle
- **Rollback Geçmişi:** Tüm geri yükleme işlemlerinin logu

```bash
# Komutlar
npm run rollback:list       # Mevcut yedekleri listele
npm run rollback:history    # Rollback geçmişini göster
npm run rollback:cleanup    # Eski rollback dosyalarını temizle

# Manuel rollback
node scripts/database-rollback-system.js rollback backup-dosyasi.json
node scripts/database-rollback-system.js rollback backup-dosyasi.json --dry-run
```

### 3. 🏗️ Staging Veritabanı Ortamı
**Dosya:** [`scripts/staging-environment-manager.js`](scripts/staging-environment-manager.js)

Güvenli test ve geliştirme ortamları:

- **Production → Staging:** Güvenli veri kopyalama
- **Veri Anonimleştirme:** Hassas verilerin maskelenmesi
- **Test Verisi:** Geliştirme için dummy veriler
- **Environment Sync:** Ortamlar arası veri senkronizasyonu

```bash
# Komutlar
npm run staging:list        # Mevcut ortamları listele
npm run staging:refresh     # Staging'i production'dan yenile
npm run staging:setup-dev   # Development ortamı kur
npm run staging:history     # Sync geçmişini göster
npm run staging:cleanup     # Eski sync loglarını temizle

# Manuel sync
node scripts/staging-environment-manager.js sync production staging
```

### 4. 📋 Schema Versiyonlama Sistemi
**Dosya:** [`scripts/schema-version-manager.js`](scripts/schema-version-manager.js)

Veritabanı şema değişikliklerinin takibi:

- **Schema Snapshot:** Mevcut şemanın anlık görüntüsü
- **Version Karşılaştırma:** Versiyonlar arası fark analizi
- **Migration SQL:** Otomatik migration script'i oluşturma
- **Change Tracking:** Detaylı değişiklik takibi

```bash
# Komutlar
npm run schema:capture      # Mevcut şemayı yakala
npm run schema:list         # Tüm versiyonları listele
npm run schema:compare      # İki versiyon karşılaştır

# Manuel komutlar
node scripts/schema-version-manager.js capture v2.1.0 "Yeni dekont alanları"
node scripts/schema-version-manager.js compare v2.0.0 v2.1.0
```

### 5. 🔒 Pre-Commit Güvenlik Hooks
**Dosya:** [`scripts/database-pre-commit-hooks.js`](scripts/database-pre-commit-hooks.js)

Kod commit öncesi otomatik güvenlik kontrolleri:

- **Schema Validasyonu:** Veritabanı yapısı kontrolü
- **Veri Bütünlüğü:** Foreign key ve constraint kontrolleri
- **Performans Kontrolleri:** Yavaş sorgu tespiti
- **Güvenlik Auditi:** RLS politikaları ve güvenlik açıkları
- **Backup Validasyonu:** Son yedeklerin geçerliliği

```bash
# Komutlar
npm run hooks:setup         # Git pre-commit hook'unu kur
npm run hooks:remove        # Git pre-commit hook'unu kaldır
npm run hooks:check         # Manuel güvenlik kontrolü

# Otomatik çalışma
# Her git commit öncesi otomatik çalışır
```

### 6. 📊 Database Monitoring Sistemi
**Dosya:** [`scripts/database-monitoring-system.js`](scripts/database-monitoring-system.js)

Sürekli veritabanı izleme ve alertler:

- **Health Check:** Bağlantı ve yanıt süresi kontrolü
- **Performance Monitoring:** Sorgu performansı takibi
- **Security Monitoring:** Güvenlik ihlali tespiti
- **Backup Monitoring:** Yedek durumu kontrolü
- **Alert Sistemi:** Sorun durumunda otomatik bildirim

```bash
# Komutlar
npm run monitor:start       # Monitoring'i başlat (sürekli çalışır)
npm run monitor:check       # Tek monitoring kontrolü
npm run monitor:health      # Health check
npm run monitor:status      # Mevcut durumu göster
npm run monitor:report      # Günlük rapor oluştur
```

### 7. ✅ Backup Doğrulama Sistemi
**Dosya:** [`scripts/backup-validation-system.js`](scripts/backup-validation-system.js)

Yedek dosyalarının bütünlük ve geçerliliği kontrolü:

- **File Integrity:** Dosya bütünlüğü kontrolü
- **Data Validation:** Veri formatı ve içerik kontrolü
- **Hash Verification:** Dosya değişiklik tespiti
- **Schema Validation:** Şema uyumluluk kontrolü
- **Database Comparison:** Mevcut database ile karşılaştırma

```bash
# Komutlar
npm run validate:backups    # Tüm yedekleri doğrula
npm run validate:status     # Doğrulama durumu
npm run validate:history    # Doğrulama geçmişi
npm run validate:cleanup    # Eski doğrulama raporlarını temizle

# Tek dosya doğrulama
node scripts/backup-validation-system.js validate backup-dosyasi.json
```

### 8. 🚨 Acil Durum Restore Sistemi
**Dosya:** [`scripts/emergency-restore-system.js`](scripts/emergency-restore-system.js)

Otomatik acil durum müdahale sistemi:

- **Emergency Assessment:** Olay seviyesi değerlendirmesi
- **Playbook Execution:** Önceden tanımlı müdahale prosedürleri
- **Automated Response:** Otomatik müdahale adımları
- **Emergency Backup:** Acil durum öncesi güvenlik yedeği
- **Post-Incident Validation:** Müdahale sonrası doğrulama

```bash
# Komutlar
npm run emergency:test      # Test emergency response
npm run emergency:status    # Emergency sistem durumu
npm run emergency:history   # Emergency geçmişi

# Manuel emergency response
node scripts/emergency-restore-system.js respond database-corruption "Corruption detected"
```

## 🔧 Kurulum ve Konfigürasyon

### 1. İlk Kurulum

```bash
# Git hooks kurulumu
npm run hooks:setup

# İlk schema snapshot
npm run schema:capture v1.0.0 "Initial schema"

# İlk backup
npm run backup:emergency "Initial backup"

# Monitoring config
node scripts/database-monitoring-system.js start
```

### 2. Environment Variables

Staging ortamları için `.env.local` dosyasına ekleyin:

```env
# Staging Environment
NEXT_PUBLIC_SUPABASE_STAGING_URL=your-staging-url
SUPABASE_STAGING_SERVICE_ROLE_KEY=your-staging-key

# Development Environment  
NEXT_PUBLIC_SUPABASE_DEV_URL=your-dev-url
SUPABASE_DEV_SERVICE_ROLE_KEY=your-dev-key
```

### 3. Cron Jobs (Otomatik Çalışma)

Sunucuda cron job'lar ekleyin:

```bash
# Günlük yedek (her gün 02:00)
0 2 * * * cd /path/to/project && npm run backup:daily

# Haftalık yedek (Pazartesi 03:00)
0 3 * * 1 cd /path/to/project && npm run backup:weekly

# Aylık yedek (Her ayın 1'i 04:00)
0 4 1 * * cd /path/to/project && npm run backup:monthly

# Backup validation (her gün 05:00)
0 5 * * * cd /path/to/project && npm run validate:backups

# Monitoring check (her 5 dakikada)
*/5 * * * * cd /path/to/project && npm run monitor:check
```

## 🚨 Acil Durum Prosedürleri

### Veri Kaybı Durumunda

1. **Immediate Response:**
   ```bash
   # Acil durum yedeği oluştur
   npm run backup:emergency "Data loss incident"
   
   # Emergency response başlat
   npm run emergency:test data-loss
   ```

2. **Manuel Rollback:**
   ```bash
   # Mevcut yedekleri listele
   npm run rollback:list
   
   # Uygun yedeği seç ve geri yükle
   node scripts/database-rollback-system.js rollback backup-file.json
   ```

### Database Corruption Durumunda

1. **Auto Response:**
   ```bash
   npm run emergency:respond database-corruption "Corruption detected"
   ```

2. **Manuel Check:**
   ```bash
   # Health check
   npm run monitor:health
   
   # Pre-commit kontroller
   npm run hooks:check
   ```

### Performance Issues

1. **Monitoring:**
   ```bash
   # Detaylı monitoring
   npm run monitor:check
   
   # Performance raporu
   npm run monitor:report
   ```

2. **Quick Fix:**
   ```bash
   # Staging'e geç (geçici)
   npm run staging:refresh
   ```

## 📊 Monitoring ve Alertler

### Dashboard Commands

```bash
# Genel sistem durumu
npm run monitor:status
npm run validate:status
npm run emergency:status

# Günlük raporlar
npm run monitor:report
npm run validate:history
npm run staging:history
```

### Otomatik Alertler

Sistem aşağıdaki durumlarda otomatik alert verir:

- ❌ Database bağlantı sorunu
- ⚠️ Yavaş sorgu performansı
- 🔒 Güvenlik ihlali şüphesi
- 💾 Eski yedek dosyaları
- 📊 Anormal veri değişimi
- 🚨 Critical threshold aşımı

## 🔐 Güvenlik Özellikleri

### Koruma Mekanizmaları

1. **Pre-Commit Hooks:** Her commit öncesi otomatik kontrol
2. **RLS Validation:** Row Level Security politika kontrolü
3. **Data Anonymization:** Staging/dev ortamlarında veri maskeleme
4. **Backup Encryption:** Yedek dosyalarının hash koruması
5. **Access Monitoring:** Giriş denemelerinin takibi
6. **Emergency Response:** Otomatik müdahale sistemi

### Best Practices

1. **Düzenli Backup:** Günlük otomatik yedekler
2. **Schema Versioning:** Her değişiklik öncesi snapshot
3. **Staging Tests:** Production'a geçmeden test
4. **Monitoring:** Sürekli sistem izleme
5. **Emergency Drills:** Periyodik acil durum testleri

## 📞 Destek ve Troubleshooting

### Log Dosyaları

```bash
# Monitoring logları
./monitoring/logs/

# Emergency logları  
./emergency/logs/

# Staging sync logları
./staging/logs/

# Backup validation raporları
./backups/validation/reports/
```

### Yaygın Sorunlar

1. **"Environment not configured"**
   - `.env.local` dosyasında staging URL'leri kontrol edin

2. **"Backup validation failed"**
   - Yedek dosyası bütünlüğünü kontrol edin
   - Hash dosyalarını yeniden oluşturun

3. **"Pre-commit hooks failed"**
   - RLS politikalarını kontrol edin
   - Veri bütünlüğü sorunlarını giderin

4. **"Emergency response failed"**
   - Backup dosyalarının varlığını kontrol edin
   - Database bağlantısını test edin

---

## 🎯 Özet

Bu sistem sayesinde:

✅ **Otomatik yedeklemeler** ile veri kaybı riski minimize edildi
✅ **Rollback sistemi** ile hızlı geri alma imkanı sağlandı  
✅ **Staging ortamları** ile güvenli test environment'ı kuruldu
✅ **Schema versioning** ile değişiklik takibi yapılıyor
✅ **Pre-commit hooks** ile kod kalitesi garanti altında
✅ **Monitoring sistemi** ile sürekli izleme aktif
✅ **Backup validation** ile yedek güvenilirliği kontrol ediliyor
✅ **Emergency response** ile otomatik müdahale sistemi kuruldu

Artık yapay zeka ile kod yazarken bile database'iniz güvende! 🛡️

Herhangi bir sorun durumunda sistem otomatik müdahale edecek ve gerekirse son güvenilir yedeğe dönüş yapacaktır.