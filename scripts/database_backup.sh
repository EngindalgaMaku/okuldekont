#!/bin/bash

# =================================================================
# SUPABASE VERİTABANI YEDEKLEme SCRİPTİ
# =================================================================
# Bu script Supabase PostgreSQL veritabanının tam yedeğini alır
# Schema, Data, Functions, Triggers, RLS Policies dahil
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
echo -e "${BLUE}       SUPABASE VERİTABANI YEDEKLEme SCRİPTİ${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Tarih ve saat
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./database_backups"

# Backup klasörü oluştur
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Yedek klasörü hazırlandı: $BACKUP_DIR${NC}"

# Supabase bağlantı bilgileri (Bu bilgileri .env dosyasından alacağız)
if [ -f .env.local ]; then
    source .env.local
else
    echo -e "${RED}❌ .env.local dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}Lütfen .env.local dosyasında şu değişkenleri tanımlayın:${NC}"
    echo "SUPABASE_DB_HOST=db.your-project.supabase.co"
    echo "SUPABASE_DB_PASSWORD=your-database-password"
    exit 1
fi

# Bağlantı bilgilerini kontrol et
if [ -z "$SUPABASE_DB_HOST" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Supabase bağlantı bilgileri eksik!${NC}"
    echo -e "${YELLOW}Lütfen .env.local dosyasında şu değişkenleri tanımlayın:${NC}"
    echo "SUPABASE_DB_HOST=db.your-project.supabase.co"
    echo "SUPABASE_DB_PASSWORD=your-database-password"
    exit 1
fi

echo -e "${GREEN}✅ Supabase bağlantı bilgileri kontrol edildi${NC}"

# PostgreSQL bağlantı parametreleri
export PGHOST="$SUPABASE_DB_HOST"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
export PGDATABASE="postgres"

# 1. TAM YEDEk (Her şey dahil)
echo -e "${BLUE}🗄️  Tam yedek başlatılıyor...${NC}"
FULL_BACKUP_FILE="$BACKUP_DIR/full_backup_$DATE.sql"

pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="$FULL_BACKUP_FILE"

echo -e "${GREEN}✅ Tam yedek tamamlandı: $FULL_BACKUP_FILE${NC}"

# 2. SADECE SCHEMA YEDEği (Tablolar, fonksiyonlar, trigger'lar)
echo -e "${BLUE}📋 Schema yedeği başlatılıyor...${NC}"
SCHEMA_BACKUP_FILE="$BACKUP_DIR/schema_backup_$DATE.sql"

pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="$SCHEMA_BACKUP_FILE"

echo -e "${GREEN}✅ Schema yedeği tamamlandı: $SCHEMA_BACKUP_FILE${NC}"

# 3. SADECE VERİ YEDEği
echo -e "${BLUE}💾 Veri yedeği başlatılıyor...${NC}"
DATA_BACKUP_FILE="$BACKUP_DIR/data_backup_$DATE.sql"

pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --data-only \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="$DATA_BACKUP_FILE"

echo -e "${GREEN}✅ Veri yedeği tamamlandı: $DATA_BACKUP_FILE${NC}"

# 4. ÖZEL FONKSİYONLAR VE TRIGGER'LAR
echo -e "${BLUE}⚙️  Özel fonksiyonlar ve trigger'lar yedeği başlatılıyor...${NC}"
FUNCTIONS_BACKUP_FILE="$BACKUP_DIR/functions_triggers_$DATE.sql"

# Özel fonksiyonları export et
psql --quiet --tuples-only --no-align \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --command="
        SELECT 
            'CREATE OR REPLACE FUNCTION ' || n.nspname || '.' || p.proname || '(' || 
            pg_get_function_identity_arguments(p.oid) || ') RETURNS ' || 
            pg_get_function_result(p.oid) || ' AS \$\$' || chr(10) || 
            pg_get_functiondef(p.oid) || chr(10) || 
            '\$\$ LANGUAGE ' || l.lanname || ';' || chr(10) || chr(10)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
        AND p.proname NOT LIKE 'pg_%'
        ORDER BY n.nspname, p.proname;
    " > "$FUNCTIONS_BACKUP_FILE"

echo -e "${GREEN}✅ Fonksiyonlar ve trigger'lar yedeği tamamlandı: $FUNCTIONS_BACKUP_FILE${NC}"

# 5. Dosya boyutlarını göster
echo -e "${BLUE}📊 Yedek dosya boyutları:${NC}"
ls -lh "$BACKUP_DIR"/*_$DATE.sql | while read line; do
    echo -e "${YELLOW}   $line${NC}"
done

# 6. Sıkıştırma (isteğe bağlı)
echo -e "${BLUE}📦 Dosyalar sıkıştırılıyor...${NC}"
gzip "$FULL_BACKUP_FILE"
gzip "$SCHEMA_BACKUP_FILE"
gzip "$DATA_BACKUP_FILE"
gzip "$FUNCTIONS_BACKUP_FILE"

echo -e "${GREEN}✅ Sıkıştırma tamamlandı${NC}"

# 7. Sıkıştırılmış dosya boyutları
echo -e "${BLUE}📊 Sıkıştırılmış dosya boyutları:${NC}"
ls -lh "$BACKUP_DIR"/*_$DATE.sql.gz | while read line; do
    echo -e "${YELLOW}   $line${NC}"
done

# 8. Restore talimatları oluştur
RESTORE_INSTRUCTIONS="$BACKUP_DIR/restore_instructions_$DATE.txt"
cat > "$RESTORE_INSTRUCTIONS" << EOF
=================================================================
VERİTABANI GERİ YÜKLEME TALİMATLARI
=================================================================
Tarih: $(date)
Yedek Dosyaları: $DATE

1. TAMAMEN GERİ YÜKLEME (Full Restore):
   gunzip full_backup_$DATE.sql.gz
   psql -h your-supabase-host -p 5432 -U postgres -d postgres -f full_backup_$DATE.sql

2. SADECE SCHEMA GERİ YÜKLEME:
   gunzip schema_backup_$DATE.sql.gz
   psql -h your-supabase-host -p 5432 -U postgres -d postgres -f schema_backup_$DATE.sql

3. SADECE VERİ GERİ YÜKLEME:
   gunzip data_backup_$DATE.sql.gz
   psql -h your-supabase-host -p 5432 -U postgres -d postgres -f data_backup_$DATE.sql

4. ÖZEL FONKSİYONLAR GERİ YÜKLEME:
   gunzip functions_triggers_$DATE.sql.gz
   psql -h your-supabase-host -p 5432 -U postgres -d postgres -f functions_triggers_$DATE.sql

UYARI:
- Geri yükleme işlemi öncesinde mevcut veritabanını temizleyin
- RLS (Row Level Security) politikalarının aktif olduğundan emin olun
- Environment variables'ları (.env dosyası) da geri yükleyin

=================================================================
EOF

echo -e "${GREEN}📋 Restore talimatları oluşturuldu: $RESTORE_INSTRUCTIONS${NC}"

# 9. Eski yedekleri temizle (7 günden eski olanları sil)
echo -e "${BLUE}🗑️  Eski yedekler temizleniyor (7 günden eski)...${NC}"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.txt" -mtime +7 -delete 2>/dev/null || true

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}🎉 YEDEKLEme İŞLEMİ BAŞARIYLA TAMAMLANDI!${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "${YELLOW}📁 Yedek konumu: $BACKUP_DIR${NC}"
echo -e "${YELLOW}📅 Yedek tarihi: $DATE${NC}"
echo -e "${YELLOW}📋 Restore talimatları: $RESTORE_INSTRUCTIONS${NC}"
echo -e "${GREEN}==================================================================${NC}"