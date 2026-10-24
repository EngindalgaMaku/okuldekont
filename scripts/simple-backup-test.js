#!/usr/bin/env node

/**
 * =================================================================
 * BASİT BACKUP TEST SCRİPTİ
 * =================================================================
 * Admin panelindeki timeout sorununu debug eder
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
    log('blue', '    BASİT BACKUP TEST SCRİPTİ');
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
        // 1. Normal backup test - timeout kontrolü ile
        log('yellow', '🧪 Test 1: Normal backup (60s timeout)...');
        const startTime1 = Date.now();
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('60 saniye timeout')), 60000);
        });

        const backupPromise = supabase.rpc('create_database_backup', {
            p_backup_name: 'Timeout_Test_' + Date.now(),
            p_backup_type: 'full',
            p_notes: 'Testing timeout issue'
        });

        try {
            const { data: result1, error: error1 } = await Promise.race([backupPromise, timeoutPromise]);
            const executionTime1 = Date.now() - startTime1;
            
            if (error1) {
                log('red', `❌ Test 1 hatası: ${error1.message}`);
            } else {
                log('green', `✅ Test 1 başarılı! Süre: ${executionTime1}ms`);
                log('cyan', `📊 Tablo: ${result1.table_count}, Kayıt: ${result1.record_count}`);
            }
        } catch (timeoutError) {
            const executionTime1 = Date.now() - startTime1;
            log('red', `🚨 Test 1 TIMEOUT! Süre: ${executionTime1}ms`);
            log('red', `❌ Hata: ${timeoutError.message}`);
        }

        // 2. Lite backup test
        log('yellow', '\n🧪 Test 2: Lite backup...');
        const startTime2 = Date.now();
        
        const { data: result2, error: error2 } = await supabase.rpc('create_database_backup_lite', {
            p_backup_name: 'Lite_Test_' + Date.now()
        });

        const executionTime2 = Date.now() - startTime2;
        
        if (error2) {
            log('red', `❌ Test 2 hatası: ${error2.message}`);
        } else {
            log('green', `✅ Test 2 başarılı! Süre: ${executionTime2}ms`);
            log('cyan', `📊 Tablo: ${result2.table_count}, Kayıt: ${result2.record_count}`);
        }

        // 3. Manual count test - hangi table yavaş?
        log('yellow', '\n🧪 Test 3: Manuel tablo sayımı...');
        const tablesToTest = [
            'ogrenciler', 'ogretmenler', 'isletmeler', 'dekontlar',
            'stajlar', 'gorev_belgeleri', 'notifications'
        ];

        for (const tableName of tablesToTest) {
            try {
                const startTime = Date.now();
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                const duration = Date.now() - startTime;
                
                if (error) {
                    log('red', `❌ ${tableName}: ${error.message}`);
                } else {
                    const color = duration > 5000 ? 'red' : duration > 1000 ? 'yellow' : 'green';
                    log(color, `📊 ${tableName}: ${count} kayıt (${duration}ms)`);
                }
            } catch (err) {
                log('red', `❌ ${tableName}: ${err.message}`);
            }
        }

        // 4. Connection test
        log('yellow', '\n🧪 Test 4: Bağlantı testi...');
        const { data: connectionTest, error: connectionError } = await supabase
            .from('system_settings')
            .select('count')
            .limit(1);
            
        if (connectionError) {
            log('red', `❌ Bağlantı hatası: ${connectionError.message}`);
        } else {
            log('green', '✅ Bağlantı başarılı');
        }

        // 5. RPC functions list
        log('yellow', '\n🧪 Test 5: Mevcut RPC fonksiyonları...');
        const { data: rpcList, error: rpcError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT proname as function_name 
                FROM pg_proc p 
                JOIN pg_namespace n ON p.pronamespace = n.oid 
                WHERE n.nspname = 'public' 
                AND proname LIKE '%backup%'
                ORDER BY proname;
            `
        });

        if (rpcError) {
            log('red', `❌ RPC liste hatası: ${rpcError.message}`);
        } else {
            log('green', '✅ Backup RPC fonksiyonları:');
            rpcList.forEach(func => {
                log('cyan', `  - ${func.function_name}`);
            });
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