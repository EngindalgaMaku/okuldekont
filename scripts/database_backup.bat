@echo off
setlocal enabledelayedexpansion

REM =================================================================
REM SUPABASE VERİTABANI YEDEKLEme SCRİPTİ (Windows)
REM =================================================================
REM Bu script Supabase PostgreSQL veritabanının tam yedeğini alır
REM Schema, Data, Functions, Triggers, RLS Policies dahil
REM =================================================================

echo =================================================================
echo        SUPABASE VERİTABANI YEDEKLEme SCRİPTİ
echo =================================================================

REM Tarih ve saat (Windows formatında)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set DATE=%datetime:~0,8%_%datetime:~8,6%

set BACKUP_DIR=database_backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo 📁 Yedek klasörü hazırlandı: %BACKUP_DIR%

REM .env.local dosyasından değişkenleri oku
if not exist ".env.local" (
    echo ❌ .env.local dosyası bulunamadı!
    echo Lütfen .env.local dosyasında şu değişkenleri tanımlayın:
    echo SUPABASE_DB_HOST=db.your-project.supabase.co
    echo SUPABASE_DB_PASSWORD=your-database-password
    pause
    exit /b 1
)

REM .env.local dosyasını oku
for /f "usebackq tokens=1,2 delims==" %%i in (".env.local") do (
    if "%%i"=="SUPABASE_DB_HOST" set SUPABASE_DB_HOST=%%j
    if "%%i"=="SUPABASE_DB_PASSWORD" set SUPABASE_DB_PASSWORD=%%j
)

REM Bağlantı bilgilerini kontrol et
if "%SUPABASE_DB_HOST%"=="" (
    echo ❌ SUPABASE_DB_HOST tanımlı değil!
    pause
    exit /b 1
)

if "%SUPABASE_DB_PASSWORD%"=="" (
    echo ❌ SUPABASE_DB_PASSWORD tanımlı değil!
    pause
    exit /b 1
)

echo ✅ Supabase bağlantı bilgileri kontrol edildi

REM PostgreSQL ortam değişkenlerini ayarla
set PGHOST=%SUPABASE_DB_HOST%
set PGPORT=5432
set PGUSER=postgres
set PGPASSWORD=%SUPABASE_DB_PASSWORD%
set PGDATABASE=postgres

REM 1. TAM YEDEk (Her şey dahil)
echo 🗄️  Tam yedek başlatılıyor...
set FULL_BACKUP_FILE=%BACKUP_DIR%\full_backup_%DATE%.sql

pg_dump --host=%PGHOST% --port=%PGPORT% --username=%PGUSER% --dbname=%PGDATABASE% --no-owner --no-privileges --verbose --file=%FULL_BACKUP_FILE%

if %ERRORLEVEL% neq 0 (
    echo ❌ Tam yedek başarısız!
    pause
    exit /b 1
)

echo ✅ Tam yedek tamamlandı: %FULL_BACKUP_FILE%

REM 2. SADECE SCHEMA YEDEği
echo 📋 Schema yedeği başlatılıyor...
set SCHEMA_BACKUP_FILE=%BACKUP_DIR%\schema_backup_%DATE%.sql

pg_dump --host=%PGHOST% --port=%PGPORT% --username=%PGUSER% --dbname=%PGDATABASE% --schema-only --no-owner --no-privileges --verbose --file=%SCHEMA_BACKUP_FILE%

if %ERRORLEVEL% neq 0 (
    echo ❌ Schema yedeği başarısız!
    pause
    exit /b 1
)

echo ✅ Schema yedeği tamamlandı: %SCHEMA_BACKUP_FILE%

REM 3. SADECE VERİ YEDEği
echo 💾 Veri yedeği başlatılıyor...
set DATA_BACKUP_FILE=%BACKUP_DIR%\data_backup_%DATE%.sql

pg_dump --host=%PGHOST% --port=%PGPORT% --username=%PGUSER% --dbname=%PGDATABASE% --data-only --no-owner --no-privileges --verbose --file=%DATA_BACKUP_FILE%

if %ERRORLEVEL% neq 0 (
    echo ❌ Veri yedeği başarısız!
    pause
    exit /b 1
)

echo ✅ Veri yedeği tamamlandı: %DATA_BACKUP_FILE%

REM 4. Restore talimatları oluştur
set RESTORE_INSTRUCTIONS=%BACKUP_DIR%\restore_instructions_%DATE%.txt

echo ================================================================= > "%RESTORE_INSTRUCTIONS%"
echo VERİTABANI GERİ YÜKLEME TALİMATLARI >> "%RESTORE_INSTRUCTIONS%"
echo ================================================================= >> "%RESTORE_INSTRUCTIONS%"
echo Tarih: %date% %time% >> "%RESTORE_INSTRUCTIONS%"
echo Yedek Dosyaları: %DATE% >> "%RESTORE_INSTRUCTIONS%"
echo. >> "%RESTORE_INSTRUCTIONS%"
echo 1. TAMAMEN GERİ YÜKLEME (Full Restore): >> "%RESTORE_INSTRUCTIONS%"
echo    psql -h your-supabase-host -p 5432 -U postgres -d postgres -f full_backup_%DATE%.sql >> "%RESTORE_INSTRUCTIONS%"
echo. >> "%RESTORE_INSTRUCTIONS%"
echo 2. SADECE SCHEMA GERİ YÜKLEME: >> "%RESTORE_INSTRUCTIONS%"
echo    psql -h your-supabase-host -p 5432 -U postgres -d postgres -f schema_backup_%DATE%.sql >> "%RESTORE_INSTRUCTIONS%"
echo. >> "%RESTORE_INSTRUCTIONS%"
echo 3. SADECE VERİ GERİ YÜKLEME: >> "%RESTORE_INSTRUCTIONS%"
echo    psql -h your-supabase-host -p 5432 -U postgres -d postgres -f data_backup_%DATE%.sql >> "%RESTORE_INSTRUCTIONS%"
echo. >> "%RESTORE_INSTRUCTIONS%"
echo UYARI: >> "%RESTORE_INSTRUCTIONS%"
echo - Geri yükleme işlemi öncesinde mevcut veritabanını temizleyin >> "%RESTORE_INSTRUCTIONS%"
echo - RLS (Row Level Security) politikalarının aktif olduğundan emin olun >> "%RESTORE_INSTRUCTIONS%"
echo - Environment variables'ları (.env dosyası) da geri yükleyin >> "%RESTORE_INSTRUCTIONS%"
echo ================================================================= >> "%RESTORE_INSTRUCTIONS%"

REM 5. Dosya boyutlarını göster
echo 📊 Yedek dosya boyutları:
dir "%BACKUP_DIR%\*_%DATE%.sql" "%BACKUP_DIR%\*_%DATE%.txt"

echo =================================================================
echo 🎉 YEDEKLEme İŞLEMİ BAŞARIYLA TAMAMLANDI!
echo =================================================================
echo 📁 Yedek konumu: %BACKUP_DIR%
echo 📅 Yedek tarihi: %DATE%
echo 📋 Restore talimatları: %RESTORE_INSTRUCTIONS%
echo =================================================================

pause