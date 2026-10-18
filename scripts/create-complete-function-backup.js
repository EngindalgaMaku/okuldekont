#!/usr/bin/env node

/**
 * =================================================================
 * TAMAM FONKSIYON YEDEĞI ALMA
 * =================================================================
 * Tüm fonksiyonların tam kodlarını alır
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

const getFunctionDefinitionsSQL = `
-- Get complete function definitions with their bodies
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as complete_definition,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments,
    n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    TAMAM FONKSIYON YEDEĞI ALMA');
    log('blue', '='.repeat(80));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        log('yellow', '🔍 Tüm fonksiyon tanımları alınıyor...');

        // Get complete function definitions
        const { data: functions, error } = await supabase.rpc('exec_sql', {
            query: getFunctionDefinitionsSQL
        });

        if (error) {
            log('red', `❌ Fonksiyon tanımları alınırken hata: ${error.message}`);
            process.exit(1);
        }

        // Parse the result (exec_sql returns string, we need to parse it)
        log('yellow', '📝 Fonksiyon tanımları dosyaya yazılıyor...');

        // Since exec_sql might return a string, let's try a different approach
        // We'll create a proper query using the backup system
        const { data: backupResult, error: backupError } = await supabase.rpc('create_advanced_backup', {
            p_backup_name: 'Complete_Functions_Backup_' + Date.now(),
            p_backup_type: 'full',
            p_notes: 'Complete backup with all function definitions for safe restore'
        });

        if (backupError) {
            log('red', `❌ Backup oluşturma hatası: ${backupError.message}`);
            process.exit(1);
        }

        log('green', '✅ Tam backup başarıyla oluşturuldu!');
        log('cyan', `📊 Backup ID: ${backupResult.backup_id}`);
        log('cyan', `📋 Backup Adı: ${backupResult.backup_name}`);
        log('cyan', `🔧 RPC Fonksiyon Sayısı: ${backupResult.rpc_function_count}`);

        // Now get the export data
        log('yellow', '📤 Backup export data alınıyor...');
        const { data: exportData, error: exportError } = await supabase.rpc('get_backup_export_data', {
            p_backup_id: backupResult.backup_id
        });

        if (exportError) {
            log('red', `❌ Export data alınırken hata: ${exportError.message}`);
        } else if (exportData?.success) {
            // Write the complete backup to a file
            const fs = require('fs');
            const backupFileName = `complete_backup_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '_')}.json`;
            
            fs.writeFileSync(backupFileName, JSON.stringify(exportData, null, 2));
            
            log('green', `✅ Tam backup dosyaya yazıldı: ${backupFileName}`);
            log('green', `📊 Tablo sayısı: ${exportData.backup_info.table_count}`);
            log('green', `📈 Kayıt sayısı: ${exportData.backup_info.record_count}`);
            
            if (exportData.schema?.functions) {
                log('green', `🔧 Fonksiyon sayısı: ${exportData.schema.functions.length}`);
            }
        }

        log('green', '\n🎉 TAMAM FONKSIYON YEDEĞİ ALINDI!');
        log('yellow', '✅ Bu backup ile tüm fonksiyonları geri yükleyebilirsiniz');
        log('red', '⚠️ Sadece fonksiyon imzaları YETERSİZ - Bu tam backup gerekli!');

    } catch (error) {
        log('red', `❌ Beklenmeyen hata: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };