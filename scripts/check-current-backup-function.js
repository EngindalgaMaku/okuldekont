#!/usr/bin/env node

/**
 * =================================================================
 * BACKUP FONKSİYONU DURUM KONTROLÜ
 * =================================================================
 * Mevcut backup fonksiyonunun güncellenip güncellenmediğini kontrol eder
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
    log('blue', '    BACKUP FONKSİYONU DURUM KONTROLÜ');
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
        log('yellow', '🔍 Mevcut backup fonksiyonunu kontrol ediliyor...');

        // Fonksiyon tanımını kontrol et
        const { data: functionDef, error: defError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT 
                    p.proname as function_name,
                    pg_get_functiondef(p.oid) as definition,
                    p.prosrc as source_code
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public' 
                AND p.proname = 'create_database_backup'
                ORDER BY p.oid DESC
                LIMIT 1;
            `
        });

        if (defError) {
            log('red', `❌ Fonksiyon tanımı kontrolü hatası: ${defError.message}`);
        } else if (functionDef && functionDef.length > 0) {
            const func = functionDef[0];
            log('green', '✅ Fonksiyon bulundu');
            
            // Optimize edilmiş versiyon mu kontrol et
            const isOptimized = func.source_code.includes('pg_stat_user_tables') && 
                              func.source_code.includes('v_main_tables');
                              
            if (isOptimized) {
                log('green', '✅ Fonksiyon optimize edilmiş versiyonda');
            } else {
                log('red', '❌ Fonksiyon hala eski versiyonda!');
                log('yellow', '🔄 Yeniden optimize etme gerekiyor...');
            }
        } else {
            log('red', '❌ Backup fonksiyonu bulunamadı!');
        }

        // Test backup oluştur
        log('yellow', '\n🧪 Test backup oluşturuluyor...');
        const startTime = Date.now();
        
        const { data: testResult, error: testError } = await supabase.rpc('create_database_backup', {
            p_backup_name: 'Debug_Test_' + Date.now(),
            p_backup_type: 'full',
            p_notes: 'Debug test from check script'
        });

        const executionTime = Date.now() - startTime;
        
        if (testError) {
            log('red', `❌ Test backup hatası: ${testError.message}`);
            log('yellow', `⏱️ Timeout süresi: ${executionTime}ms`);
            
            if (executionTime > 30000) {
                log('red', '🚨 TIMEOUT SORUNU DEVAM EDİYOR!');
                log('yellow', '🔧 Frontend cache temizlenmeli veya fonksiyon yeniden yüklenmeli');
            }
        } else {
            log('green', `✅ Test backup başarılı! Süre: ${executionTime}ms`);
            log('cyan', `📊 Sonuç: ${JSON.stringify(testResult, null, 2)}`);
        }

        // Alternatif lite backup test
        log('yellow', '\n🧪 Lite backup test ediliyor...');
        const { data: liteResult, error: liteError } = await supabase.rpc('create_database_backup_lite', {
            p_backup_name: 'Lite_Debug_Test_' + Date.now()
        });

        if (liteError) {
            log('red', `❌ Lite backup hatası: ${liteError.message}`);
        } else {
            log('green', '✅ Lite backup başarılı!');
            log('cyan', `📊 Lite sonuç: ${JSON.stringify(liteResult, null, 2)}`);
        }

        // Son backup listesini kontrol et
        log('yellow', '\n📋 Son backup\'ları kontrol ediliyor...');
        const { data: backupList, error: listError } = await supabase.rpc('get_backup_list');
        
        if (listError) {
            log('red', `❌ Backup list hatası: ${listError.message}`);
        } else {
            log('green', `✅ ${backupList.length} backup bulundu`);
            if (backupList.length > 0) {
                const latest = backupList[0];
                log('cyan', `📅 En son: ${latest.backup_name} (${latest.created_at})`);
                log('cyan', `📊 ${latest.table_count} tablo, ${latest.record_count} kayıt`);
            }
        }

    } catch (error) {
        log('red', `❌ Beklenmeyen hata: ${error.message}`);
        console.error(error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };