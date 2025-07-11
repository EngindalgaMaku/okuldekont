# 🗄️ Supabase Veritabanı Yedekleme ve Geri Yükleme Rehberi

Bu rehber Supabase PostgreSQL veritabanınızın güvenli bir şekilde yedeklenmesi ve geri yüklenmesi için hazırlanmıştır.

## 📋 İçindekiler

1. [Kurulum](#kurulum)
2. [Konfigürasyon](#konfigürasyon)
3. [Yedekleme](#yedekleme)
4. [Geri Yükleme](#geri-yükleme)
5. [Otomatik Yedekleme](#otomatik-yedekleme)
6. [Sorun Giderme](#sorun-giderme)

## 🚀 Kurulum

### Gereksinimler

- **PostgreSQL Client Tools** (pg_dump, psql)
- **Node.js** ve **npm**
- **Git Bash** (Windows kullanıcıları için)

### PostgreSQL Client Tools Kurulumu

#### Windows:
```bash
# Chocolatey ile
choco install postgresql

# Veya PostgreSQL resmi sitesinden indirin
https://www.postgresql.org/download/windows/
```

#### macOS:
```bash
# Homebrew ile
brew install postgresql
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

### Script İzinleri

```bash
# Linux/macOS için script izinlerini ayarlayın
chmod +x scripts/database_backup.sh
chmod +x scripts/database_restore.sh
```

## ⚙️ Konfigürasyon

### 1. Environment Variables Ayarlama

`.env.local` dosyasını oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Backup Configuration
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PASSWORD=your-database-password
```

### 2. Supabase Bilgilerini Alma

1. **Supabase Dashboard** → **Settings** → **Database**
2. **Connection info** kısmından:
   - Host: `db.xxxxx.supabase.co`
   - Password: Database password

## 📦 Yedekleme

### Tek Seferlik Yedekleme

#### Linux/macOS:
```bash
# Tam yedek al
npm run backup:simple

# Veya doğrudan script çalıştır
./scripts/database_backup.sh
```

#### Windows:
```bash
# Windows batch script
npm run backup:simple-win

# Veya doğrudan batch dosyasını çalıştır
scripts\database_backup.bat
```

### Manuel pg_dump Kullanımı

```bash
# Tam yedek
pg_dump -h db.your-project.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --no-owner \
        --no-privileges \
        -f full_backup.sql

# Sadece schema
pg_dump -h db.your-project.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f schema_backup.sql

# Sadece veri
pg_dump -h db.your-project.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        --data-only \
        --no-owner \
        --no-privileges \
        -f data_backup.sql
```

### Yedek Çıktıları

Script çalıştıktan sonra `database_backups/` klasöründe şu dosyalar oluşur:

```
database_backups/
├── full_backup_20240110_143022.sql.gz       # Tam yedek
├── schema_backup_20240110_143022.sql.gz     # Sadece schema
├── data_backup_20240110_143022.sql.gz       # Sadece veri
├── functions_triggers_20240110_143022.sql.gz # Fonksiyonlar
└── restore_instructions_20240110_143022.txt # Restore talimatları
```

## 🔄 Geri Yükleme

### Otomatik Geri Yükleme

```bash
# Tam geri yükleme
./scripts/database_restore.sh database_backups/full_backup_20240110_143022.sql.gz

# Sadece schema geri yükleme
./scripts/database_restore.sh database_backups/schema_backup_20240110_143022.sql.gz schema

# Sadece veri geri yükleme
./scripts/database_restore.sh database_backups/data_backup_20240110_143022.sql.gz data
```

### Manuel Geri Yükleme

```bash
# Sıkıştırılmış dosyayı aç
gunzip full_backup_20240110_143022.sql.gz

# Geri yükle
psql -h db.your-project.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f full_backup_20240110_143022.sql
```

## ⏰ Otomatik Yedekleme

### Cron Job Kurulumu (Linux/macOS)

```bash
# Crontab'ı düzenle
crontab -e

# Günlük yedek (her gece saat 02:00)
0 2 * * * cd /path/to/your/project && ./scripts/database_backup.sh >> backup.log 2>&1

# Haftalık yedek (Pazar günleri saat 03:00)
0 3 * * 0 cd /path/to/your/project && ./scripts/database_backup.sh >> backup_weekly.log 2>&1
```

### Windows Task Scheduler

1. **Task Scheduler** açın
2. **Create Basic Task** seçin
3. **Daily** veya **Weekly** seçin
4. **Start a program** seçin
5. Program: `cmd.exe`
6. Arguments: `/c "cd C:\path\to\your\project && scripts\database_backup.bat"`

## 🛡️ Güvenlik Önlemleri

### 1. .env Dosyası Güvenliği

```bash
# .env.local dosyasının izinlerini kısıtlayın
chmod 600 .env.local

# Git'e eklenmediğinden emin olun
echo ".env.local" >> .gitignore
```

### 2. Yedek Dosyası Şifreleme

```bash
# Yedek dosyasını şifrele
gpg --symmetric --cipher-algo AES256 full_backup.sql

# Şifreli dosyayı aç
gpg --decrypt full_backup.sql.gpg > full_backup.sql
```

### 3. Uzak Depolama

```bash
# AWS S3'e yükle
aws s3 cp database_backups/ s3://your-backup-bucket/ --recursive

# Google Drive'a yükle (rclone ile)
rclone copy database_backups/ gdrive:backups/
```

## 🔧 Sorun Giderme

### Yaygın Hatalar

#### 1. "pg_dump: command not found"
```bash
# PostgreSQL client tools kurulumu gerekli
# Kurulum bölümüne bakın
```

#### 2. "FATAL: password authentication failed"
```bash
# .env.local dosyasındaki SUPABASE_DB_PASSWORD'ü kontrol edin
# Supabase Dashboard'dan doğru şifreyi alın
```

#### 3. "connection to server at ... failed"
```bash
# SUPABASE_DB_HOST adresini kontrol edin
# İnternet bağlantınızı kontrol edin
# Supabase servisinin çalıştığından emin olun
```

#### 4. Windows'ta "permission denied"
```bash
# Git Bash kullanın
# Veya PowerShell'i Administrator olarak çalıştırın
```

### Log Kontrolü

```bash
# Backup loglarını kontrol edin
tail -f backup.log

# Hata detaylarını görün
cat backup.log | grep -i error
```

### Test Yedekleme

```bash
# Küçük bir test tablosu ile deneyin
pg_dump -h db.your-project.supabase.co \
        -p 5432 \
        -U postgres \
        -d postgres \
        -t "public.test_table" \
        -f test_backup.sql
```

## 📊 Yedek Stratejisi Önerileri

### 3-2-1 Yedekleme Kuralı

- **3** farklı kopyada yedek tutun
- **2** farklı ortamda saklayın (lokal + cloud)
- **1** kopyasını offline tutun

### Yedekleme Sıklığı

- **Günlük**: Kritik production veritabanları
- **Haftalık**: Gelişim aşamasındaki projeler
- **Aylık**: Test/staging ortamları

### Saklama Süreleri

```bash
# Günlük yedekler: 30 gün
# Haftalık yedekler: 3 ay
# Aylık yedekler: 1 yıl
```

## 🆘 Acil Durum Planı

### 1. Veritabanı Bozulması
```bash
# En son yedeği geri yükle
./scripts/database_restore.sh database_backups/full_backup_latest.sql.gz

# Veri kaybını kontrol et
# RLS politikalarını kontrol et
# Uygulama testlerini çalıştır
```

### 2. Yanlış Veri Silme
```bash
# Sadece veri kısmını geri yükle
./scripts/database_restore.sh database_backups/data_backup_latest.sql.gz data
```

### 3. Schema Bozulması
```bash
# Sadece schema kısmını geri yükle
./scripts/database_restore.sh database_backups/schema_backup_latest.sql.gz schema
```

## 📞 Destek

Bu rehberle ilgili sorularınız için:

1. İlk olarak [Sorun Giderme](#sorun-giderme) bölümünü kontrol edin
2. GitHub Issues sayfasında arama yapın
3. Yeni bir issue oluşturun

---

**⚠️ Önemli Notlar:**
- Yedekleme işlemi öncesinde mutlaka test edin
- Production ortamında değişiklik yapmadan önce yedek alın  
- RLS (Row Level Security) politikalarını kontrol edin
- Environment variables'ları da yedeklemeyi unutmayın