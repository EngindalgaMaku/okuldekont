#!/usr/bin/env node

/**
 * =================================================================
 * KURULUM DURUMU DEBUG SCRIPTI
 * =================================================================
 * Installation status sorununu debug etmek için
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
    log('blue', '    KURULUM DURUMU DEBUG');
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
        log('yellow', '🔍 system_installation tablosundaki kayıtları kontrol ediliyor...');
        
        // Tüm installation kayıtlarını listele
        const { data: installations, error: installError } = await supabase
            .from('system_installation')
            .select('*')
            .order('created_at', { ascending: false });

        if (installError) {
            log('red', `❌ Installation kayıtları alınamadı: ${installError.message}`);
            process.exit(1);
        }

        log('cyan', `📋 Toplam Installation Kayıtları: ${installations.length}`);
        
        installations.forEach((install, index) => {
            log('cyan', `\n${index + 1}. Kayıt:`);
            log('cyan', `  - ID: ${install.id}`);
            log('cyan', `  - Status: ${install.installation_status}`);
            log('cyan', `  - Date: ${install.installation_date}`);
            log('cyan', `  - Environment: ${install.environment_type}`);
            log('cyan', `  - Method: ${install.installation_method}`);
            log('cyan', `  - Created: ${install.created_at}`);
        });

        // check_installation_status fonksiyonunu çağır
        log('yellow', '\n🔍 check_installation_status fonksiyonu çağırılıyor...');
        const { data: statusResult, error: statusError } = await supabase.rpc('check_installation_status');

        if (statusError) {
            log('red', `❌ Status check hatası: ${statusError.message}`);
        } else {
            log('green', '✅ Status check sonucu:');
            log('cyan', JSON.stringify(statusResult, null, 2));
        }

        // Manuel SQL query ile kontrol et
        log('yellow', '\n🔍 Manuel SQL query ile kontrol ediliyor...');
        const { data: manualCheck, error: manualError } = await supabase
            .from('system_installation')
            .select('*')
            .eq('installation_status', 'installed')
            .order('installation_date', { ascending: false })
            .limit(1);

        if (manualError) {
            log('red', `❌ Manuel check hatası: ${manualError.message}`);
        } else {
            log('green', `✅ Manuel check sonucu: ${manualCheck.length} kayıt bulundu`);
            if (manualCheck.length > 0) {
                log('cyan', JSON.stringify(manualCheck[0], null, 2));
            }
        }

        // Temel tabloları kontrol et
        log('yellow', '\n🔍 Temel tablolar kontrol ediliyor...');
        const requiredTables = ['admin_kullanicilar', 'ogrenciler', 'ogretmenler', 'isletmeler', 'dekontlar'];
        
        for (const tableName of requiredTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('count')
                    .limit(1);
                
                if (error) {
                    log('red', `❌ ${tableName}: ${error.message}`);
                } else {
                    log('green', `✅ ${tableName}: OK`);
                }
            } catch (err) {
                log('red', `❌ ${tableName}: ${err.message}`);
            }
        }

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