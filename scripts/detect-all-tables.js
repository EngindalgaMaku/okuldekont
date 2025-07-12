#!/usr/bin/env node

/**
 * =================================================================
 * TÜM TABLOLARI TESPİT ETME SCRİPTİ
 * =================================================================
 * Supabase veritabanındaki gerçek tablo sayısını tespit eder
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Renk kodları
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    TÜM TABLOLARI TESPİT ETME SCRİPTİ');
    log('blue', '='.repeat(80));

    // Environment variables kontrol
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    // Supabase client oluştur
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Gerçek tabloları PostgreSQL sistem tablosundan al
        await detectAllTables(supabase);

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        process.exit(1);
    }
}

async function detectAllTables(supabase) {
    log('blue', '🔍 Veritabanındaki TÜM tablolar tespit ediliyor...');
    
    // PostgreSQL information_schema'dan tablo listesini al
    const tableQuery = `
        SELECT 
            table_name,
            table_type,
            table_schema
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;

    try {
        log('yellow', '  📋 PostgreSQL sistem tablolarından veri alınıyor...');
        
        const { data: tables, error: sqlError } = await supabase.rpc('exec_sql', { 
            query: tableQuery 
        });
        
        if (sqlError) {
            log('red', `    ❌ SQL hatası: ${sqlError.message}`);
            return;
        }

        if (!tables || !Array.isArray(tables) || tables.length === 0) {
            log('yellow', '    ⚠️ Hiç tablo bulunamadı');
            return;
        }

        log('green', `✅ ${tables.length} gerçek tablo bulundu:`);
        log('cyan', '='.repeat(80));

        const tableNames = [];
        tables.forEach((table, index) => {
            log('green', `${index + 1}. ${table.table_name}`);
            tableNames.push(table.table_name);
        });

        // Array formatında yazdır
        log('blue', '\n📋 JavaScript Array formatı:');
        log('cyan', '='.repeat(80));
        console.log('const tableList = [');
        tableNames.forEach((tableName, index) => {
            const comma = index < tableNames.length - 1 ? ',' : '';
            console.log(`    '${tableName}'${comma}`);
        });
        console.log('];');

        // Database.types.ts'teki liste ile karşılaştır
        const databaseTypeTables = [
            'admin_kullanicilar',
            'alanlar', 
            'belgeler',
            'dekontlar',
            'egitim_yillari',
            'gorev_belgeleri',
            'isletme_koordinatorler',
            'isletmeler',
            'isletme_giris_denemeleri',
            'notifications',
            'ogrenciler',
            'ogretmenler',
            'ogretmen_giris_denemeleri',
            'siniflar',
            'stajlar',
            'system_settings'
        ];

        log('yellow', '\n🔍 KARŞILAŞTIRMA:');
        log('cyan', '='.repeat(80));
        
        const missingFromScript = tableNames.filter(table => !databaseTypeTables.includes(table));
        const missingFromDB = databaseTypeTables.filter(table => !tableNames.includes(table));

        if (missingFromScript.length > 0) {
            log('red', `❌ Backup scriptinde EKSIK tablolar (${missingFromScript.length} adet):`);
            missingFromScript.forEach(table => log('red', `  - ${table}`));
        }

        if (missingFromDB.length > 0) {
            log('yellow', `⚠️ Veritabanında BULUNMAYAN tablolar (${missingFromDB.length} adet):`);
            missingFromDB.forEach(table => log('yellow', `  - ${table}`));
        }

        if (missingFromScript.length === 0 && missingFromDB.length === 0) {
            log('green', '✅ Tüm tablolar backup scriptinde mevcut!');
        }

        // Özet
        log('blue', '\n📊 ÖZET:');
        log('cyan', '='.repeat(80));
        log('green', `✅ Gerçek veritabanında: ${tables.length} tablo`);
        log('cyan', `🔧 Backup scriptinde: ${databaseTypeTables.length} tablo`);
        log('red', `❌ Eksik tablolar: ${missingFromScript.length} adet`);

        // Test etme - her tabloya erişim kontrolü
        log('blue', '\n🧪 Tablo erişim testi yapılıyor...');
        log('cyan', '='.repeat(80));

        const accessibleTables = [];
        const inaccessibleTables = [];

        for (const tableName of tableNames) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                if (error) {
                    log('red', `  ❌ ${tableName} - ERİŞİM HATASI: ${error.message}`);
                    inaccessibleTables.push({ table: tableName, error: error.message });
                } else {
                    log('green', `  ✅ ${tableName} - ERİŞİLEBİLİR`);
                    accessibleTables.push(tableName);
                }
            } catch (error) {
                log('red', `  ❌ ${tableName} - EXCEPTION: ${error.message}`);
                inaccessibleTables.push({ table: tableName, error: error.message });
            }
        }

        log('blue', '\n📋 ERİŞİM RAPORU:');
        log('cyan', '='.repeat(80));
        log('green', `✅ Erişilebilir tablolar: ${accessibleTables.length}`);
        log('red', `❌ Erişilemeyen tablolar: ${inaccessibleTables.length}`);

        if (inaccessibleTables.length > 0) {
            log('red', '\nErişilemeyen tablolar:');
            inaccessibleTables.forEach(item => {
                log('red', `  - ${item.table}: ${item.error}`);
            });
        }

        // Final öneri
        log('yellow', '\n💡 ÖNERİ:');
        log('cyan', '='.repeat(80));
        if (missingFromScript.length > 0) {
            log('yellow', 'Backup scriptini güncellemek için eksik tabloları ekleyin:');
            missingFromScript.forEach(table => {
                log('cyan', `  '${table}',`);
            });
        } else {
            log('green', 'Backup scripti güncel! Tüm tablolar dahil.');
        }

    } catch (error) {
        log('red', `❌ Tablo tespit hatası: ${error.message}`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };