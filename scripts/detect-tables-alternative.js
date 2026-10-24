#!/usr/bin/env node

/**
 * =================================================================
 * ALTERNATİF TABLO TESPİT SCRİPTİ
 * =================================================================
 * Supabase client ile direkt tablo erişimi yaparak tabloları tespit eder
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
    log('blue', '    ALTERNATİF TABLO TESPİT SCRİPTİ');
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
        // Potansiyel tabloları test et
        await detectTablesByTesting(supabase);

    } catch (error) {
        log('red', `❌ Hata: ${error.message}`);
        process.exit(1);
    }
}

async function detectTablesByTesting(supabase) {
    log('blue', '🔍 Potansiyel tablolar test ediliyor...');
    
    // Admin panelden görünen ve Database.types.ts'ten potansiyel tablo listesi
    const potentialTables = [
        // Database.types.ts'teki tablolar
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
        'system_settings',
        
        // Potansiyel eksik tablolar (admin panelde 20 tablo var, tahmin edilen)
        'users',
        'profiles',
        'sessions',
        'roles',
        'permissions',
        'logs',
        'audit_logs',
        'configurations',
        'categories',
        'tags',
        'files',
        'uploads',
        'backups',
        'migrations',
        'schema_version',
        'auth_users',
        'auth_sessions',
        'auth_tokens',
        'metadata',
        'settings'
    ];

    log('yellow', `  🧪 ${potentialTables.length} potansiyel tablo test ediliyor...`);

    const existingTables = [];
    const nonExistingTables = [];
    const accessibleTables = [];
    const rowCounts = {};

    for (const tableName of potentialTables) {
        try {
            log('cyan', `    🔍 Test ediliyor: ${tableName}`);
            
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(1);

            if (error) {
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    log('red', `      ❌ ${tableName} - TABLO YOK`);
                    nonExistingTables.push(tableName);
                } else {
                    log('yellow', `      ⚠️ ${tableName} - ERİŞİM HATASI: ${error.message.substring(0, 50)}...`);
                    existingTables.push(tableName);
                }
            } else {
                log('green', `      ✅ ${tableName} - MEVCUT (${count !== null ? count : data?.length || 0} kayıt)`);
                existingTables.push(tableName);
                accessibleTables.push(tableName);
                rowCounts[tableName] = count !== null ? count : data?.length || 0;
            }
        } catch (error) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                log('red', `      ❌ ${tableName} - TABLO YOK`);
                nonExistingTables.push(tableName);
            } else {
                log('yellow', `      ⚠️ ${tableName} - EXCEPTION: ${error.message.substring(0, 50)}...`);
                existingTables.push(tableName);
            }
        }
    }

    // Sonuçları analiz et
    log('blue', '\n📊 TESPİT SONUÇLARI:');
    log('cyan', '='.repeat(80));
    log('green', `✅ Mevcut tablolar: ${existingTables.length}`);
    log('cyan', `🔓 Erişilebilir tablolar: ${accessibleTables.length}`);
    log('red', `❌ Olmayan tablolar: ${nonExistingTables.length}`);

    if (existingTables.length > 0) {
        log('green', '\n✅ MEVCUT TABLOLAR:');
        existingTables.forEach((table, index) => {
            const rowCount = rowCounts[table] !== undefined ? ` (${rowCounts[table]} kayıt)` : '';
            log('green', `${index + 1}. ${table}${rowCount}`);
        });

        // JavaScript array formatı
        log('blue', '\n📋 JavaScript Array formatı (Backup script için):');
        log('cyan', '='.repeat(80));
        console.log('const tableList = [');
        existingTables.forEach((tableName, index) => {
            const comma = index < existingTables.length - 1 ? ',' : '';
            console.log(`    '${tableName}'${comma}`);
        });
        console.log('];');

        // Mevcut backup scripti ile karşılaştır
        const currentBackupTables = [
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

        const missingFromBackup = existingTables.filter(table => !currentBackupTables.includes(table));
        const extraInBackup = currentBackupTables.filter(table => !existingTables.includes(table));

        log('yellow', '\n🔍 BACKUP SCRİPTİ KARŞILAŞTIRMASI:');
        log('cyan', '='.repeat(80));
        log('cyan', `🔧 Mevcut backup scriptinde: ${currentBackupTables.length} tablo`);
        log('green', `✅ Gerçek veritabanında: ${existingTables.length} tablo`);

        if (missingFromBackup.length > 0) {
            log('red', `\n❌ Backup scriptinde EKSIK tablolar (${missingFromBackup.length} adet):`);
            missingFromBackup.forEach(table => {
                const rowCount = rowCounts[table] !== undefined ? ` (${rowCounts[table]} kayıt)` : '';
                log('red', `  - ${table}${rowCount}`);
            });
        }

        if (extraInBackup.length > 0) {
            log('yellow', `\n⚠️ Backup scriptinde FAZLA tablolar (${extraInBackup.length} adet):`);
            extraInBackup.forEach(table => log('yellow', `  - ${table}`));
        }

        if (missingFromBackup.length === 0 && extraInBackup.length === 0) {
            log('green', '\n🎉 Backup scripti mükemmel! Tüm tablolar dahil.');
        }

        // Toplam kayıt sayısı
        const totalRecords = Object.values(rowCounts).reduce((sum, count) => sum + count, 0);
        log('blue', '\n📈 GENEL İSTATİSTİKLER:');
        log('cyan', '='.repeat(80));
        log('green', `📊 Toplam tablo sayısı: ${existingTables.length}`);
        log('green', `📋 Toplam kayıt sayısı: ${totalRecords}`);
        log('cyan', `🔓 Erişilebilir tablo oranı: ${Math.round((accessibleTables.length / existingTables.length) * 100)}%`);

        // Admin panelden gelen bilgiyle karşılaştır
        log('yellow', '\n🏛️ ADMİN PANEL KARŞILAŞTIRMASI:');
        log('cyan', '='.repeat(80));
        log('yellow', `📋 Admin panelde: 20 tablo`);
        log('green', `📋 Tespit edilen: ${existingTables.length} tablo`);
        
        if (existingTables.length < 20) {
            log('red', `❌ Eksik tablo sayısı: ${20 - existingTables.length}`);
            log('yellow', '💡 Bazı tablolar özel isimlendirme kullanıyor olabilir.');
        } else if (existingTables.length >= 20) {
            log('green', '✅ Tablo sayısı admin panelle uyumlu veya daha fazla!');
        }
    }

    return existingTables;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };