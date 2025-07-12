#!/usr/bin/env node

/**
 * =================================================================
 * RLS VE İZİNLERİ KONTROL ET
 * =================================================================
 * system_installation tablosundaki RLS ve izin sorunlarını kontrol et
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

const rlsCheckSQL = `
-- RLS durumunu kontrol et
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'system_installation';
`;

const fixRLSSQL = `
-- RLS'i kapat ve gerekli izinleri ver
ALTER TABLE system_installation DISABLE ROW LEVEL SECURITY;

-- Public schema'ya select izni ver  
GRANT SELECT, INSERT, UPDATE, DELETE ON system_installation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_installation TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_installation TO service_role;

-- Fonksiyona izin ver
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
`;

const simpleTestSQL = `
-- Basit test query
SELECT 
    id, 
    installation_status, 
    installation_date,
    environment_type 
FROM system_installation 
WHERE installation_status = 'installed'
ORDER BY installation_date DESC 
LIMIT 1;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    RLS VE İZİNLERİ KONTROL ET');
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
        log('yellow', '🔍 RLS durumunu kontrol ediliyor...');
        
        // RLS durumunu kontrol et
        const { data: rlsCheck, error: rlsError } = await supabase.rpc('exec_sql', {
            query: rlsCheckSQL
        });

        if (rlsError) {
            log('red', `❌ RLS kontrol hatası: ${rlsError.message}`);
        } else {
            log('green', '✅ RLS durumu:');
            log('cyan', JSON.stringify(rlsCheck, null, 2));
        }

        log('yellow', '\n🔧 RLS düzeltmeleri uygulanıyor...');
        
        // RLS düzeltmelerini uygula
        const { data: fixResult, error: fixError } = await supabase.rpc('exec_sql', {
            query: fixRLSSQL
        });

        if (fixError) {
            log('red', `❌ RLS düzeltme hatası: ${fixError.message}`);
        } else {
            log('green', '✅ RLS düzeltmeleri uygulandı!');
        }

        log('yellow', '\n🔍 Basit SQL query test ediliyor...');
        
        // Basit query test et
        const { data: testResult, error: testError } = await supabase.rpc('exec_sql', {
            query: simpleTestSQL
        });

        if (testError) {
            log('red', `❌ SQL test hatası: ${testError.message}`);
        } else {
            log('green', '✅ SQL test başarılı!');
            log('cyan', JSON.stringify(testResult, null, 2));
        }

        log('yellow', '\n🔍 Fonksiyonu yeniden test ediliyor...');
        
        // check_installation_status'u tekrar test et
        const { data: finalTest, error: finalError } = await supabase.rpc('check_installation_status');

        if (finalError) {
            log('red', `❌ Final test hatası: ${finalError.message}`);
        } else {
            log('green', '✅ Final test başarılı!');
            log('cyan', JSON.stringify(finalTest, null, 2));
            
            if (finalTest.is_installed) {
                log('green', '\n🎉 SİSTEM ARTIK DÜZGÜN ÇALIŞIYOR!');
            } else {
                log('yellow', '\n⚠️  Hala sorun var, manuel çözüm gerekebilir.');
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