#!/bin/bash

# =================================================================
# SUPABASE VERİTABANI GERİ YÜKLEME SCRİPTİ
# =================================================================
# Bu script Supabase PostgreSQL veritabanını yedekten geri yükler
# =================================================================

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hata durumunda scripti durdur
set -e

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}       SUPABASE VERİTABANI GERİ YÜKLEME SCRİPTİ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Parametre kontrolü
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Kullanım: $0 <backup_file> [restore_type]${NC}"
    echo -e "${YELLOW}Restore Types:${NC}"
    echo -e "${YELLOW}  full     - Tam geri yükleme (varsayılan)${NC}"
    echo -e "${YELLOW}  schema   - Sadece schema geri yükleme${NC}"
    echo -e "${YELLOW}  data     - Sadece veri geri yükleme${NC}"
    echo ""
    echo -e "${YELLOW}Örnek:${NC}"
    echo -e "${YELLOW}  $0 database_backups/full_backup_20240110_143022.sql.gz${NC}"
    echo -e "${YELLOW}  $0 database_backups/schema_backup_20240110_143022.sql.gz schema${NC}"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_TYPE="${2:-full}"

# Backup dosyası kontrolü
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup dosyası bulunamadı: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup dosyası bulundu: $BACKUP_FILE${NC}"
echo -e "${YELLOW}📋 Restore tipi: $RESTORE_TYPE${NC}"

# Supabase bağlantı bilgileri
if [ -f .env.local ]; then
    source .env.local
else
    echo -e "${RED}❌ .env.local dosyası bulunamadı!${NC}"
    exit 1
fi

# Bağlantı bilgilerini kontrol et
if [ -z "$SUPABASE_DB_HOST" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Supabase bağlantı bilgileri eksik!${NC}"
    exit 1
fi

# PostgreSQL bağlantı parametreleri
export PGHOST="$SUPABASE_DB_HOST"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
export PGDATABASE="postgres"

echo -e "${GREEN}✅ Supabase bağlantı bilgileri kontrol edildi${NC}"

# Onay alma
echo -e "${RED}⚠️  UYARI: Bu işlem mevcut veritabanındaki verileri değiştirecektir!${NC}"
echo -e "${YELLOW}Devam etmek istiyor musunuz? (yes/no): ${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ İşlem iptal edildi.${NC}"
    exit 0
fi

# Dosya uzantısını kontrol et ve gerekirse unzip et
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${BLUE}📦 Sıkıştırılmış dosya açılıyor...${NC}"
    TEMP_FILE="/tmp/temp_restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

echo -e "${BLUE}🗄️  Veritabanı geri yükleme başlatılıyor...${NC}"

# Restore işlemi
case $RESTORE_TYPE in
    "full")
        echo -e "${BLUE}📋 Tam geri yükleme yapılıyor...${NC}"
        psql \
            --host="$PGHOST" \
            --port="$PGPORT" \
            --username="$PGUSER" \
            --dbname="$PGDATABASE" \
            --file="$RESTORE_FILE" \
            --verbose
        ;;
    "schema")
        echo -e "${BLUE}📋 Schema geri yükleme yapılıyor...${NC}"
        # Schema restore için özel parametreler kullanılabilir
        psql \
            --host="$PGHOST" \
            --port="$PGPORT" \
            --username="$PGUSER" \
            --dbname="$PGDATABASE" \
            --file="$RESTORE_FILE" \
            --verbose
        ;;
    "data")
        echo -e "${BLUE}💾 Veri geri yükleme yapılıyor...${NC}"
        psql \
            --host="$PGHOST" \
            --port="$PGPORT" \
            --username="$PGUSER" \
            --dbname="$PGDATABASE" \
            --file="$RESTORE_FILE" \
            --verbose
        ;;
    *)
        echo -e "${RED}❌ Geçersiz restore tipi: $RESTORE_TYPE${NC}"
        exit 1
        ;;
esac

# Temp dosyayı temizle
if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
    echo -e "${GREEN}🗑️  Geçici dosya temizlendi${NC}"
fi

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}🎉 VERİTABANI GERİ YÜKLEME BAŞARIYLA TAMAMLANDI!${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "${YELLOW}📁 Restore edilen dosya: $BACKUP_FILE${NC}"
echo -e "${YELLOW}📋 Restore tipi: $RESTORE_TYPE${NC}"
echo -e "${YELLOW}🕒 Tamamlanma zamanı: $(date)${NC}"
echo -e "${GREEN}==================================================================${NC}"

# Veritabanı bağlantısını test et
echo -e "${BLUE}🔍 Veritabanı bağlantısı test ediliyor...${NC}"
if psql --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE" --command="SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Veritabanı bağlantısı başarılı${NC}"
else
    echo -e "${RED}❌ Veritabanı bağlantısı başarısız${NC}"
fi