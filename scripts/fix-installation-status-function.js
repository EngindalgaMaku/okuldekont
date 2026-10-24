#!/usr/bin/env node

/**
 * =================================================================
 * KURULUM DURUMU KONTROL FONKSİYONUNU DÜZELT
 * =================================================================
 * check_installation_status fonksiyonunu düzeltmek için
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

const fixedInstallationCheckSQL = `
-- DÜZELTÜLMÜŞ KURULUM DURUMU KONTROL FONKSIYONU
CREATE OR REPLACE FUNCTION check_installation_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_installation_record RECORD;
    v_table_count INTEGER := 0;
    v_admin_count INTEGER := 0;
    v_system_settings_count INTEGER := 0;
    v_is_installed BOOLEAN := false;
BEGIN
    -- Kurulum tablosunu kontrol et
    SELECT * INTO v_installation_record
    FROM system_installation
    WHERE installation_status = 'installed'
    ORDER BY installation_date DESC
    LIMIT 1;
    
    -- Kurulum durumunu belirle
    v_is_installed := (v_installation_record IS NOT NULL);
    
    -- Temel tabloları kontrol et
    SELECT COUNT(*)
    INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('admin_kullanicilar', 'ogrenciler', 'ogretmenler', 'isletmeler', 'dekontlar');
    
    -- Admin kullanıcı kontrolü
    BEGIN
        SELECT COUNT(*) INTO v_admin_count FROM admin_kullanicilar;
    EXCEPTION WHEN OTHERS THEN
        v_admin_count := 0;
    END;
    
    -- System settings kontrolü
    BEGIN
        SELECT COUNT(*) INTO v_system_settings_count FROM system_settings;
    EXCEPTION WHEN OTHERS THEN
        v_system_settings_count := 0;
    END;
    
    -- Debug için log ekleyelim
    RAISE NOTICE 'Installation record found: %', (v_installation_record IS NOT NULL);
    RAISE NOTICE 'Is installed: %', v_is_installed;
    
    -- Sonucu döndür
    RETURN json_build_object(
        'is_installed', v_is_installed,
        'installation_status', COALESCE(v_installation_record.installation_status, 'not_installed'),
        'installation_date', v_installation_record.installation_date,
        'installation_version', v_installation_record.installation_version,
        'environment_type', v_installation_record.environment_type,
        'installation_method', v_installation_record.installation_method,
        'hostname', v_installation_record.hostname,
        'table_count', v_table_count,
        'admin_count', v_admin_count,
        'system_settings_count', v_system_settings_count,
        'system_ready', (v_table_count >= 5 AND v_admin_count > 0 AND v_system_settings_count > 0),
        'installation_notes', v_installation_record.installation_notes,
        'debug_record_exists', (v_installation_record IS NOT NULL)
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    KURULUM DURUMU KONTROL FONKSİYONUNU DÜZELT');
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
        log('yellow', '🔧 check_installation_status fonksiyonu güncelleniyor...');
        
        // Fonksiyonu güncelle
        const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
            query: fixedInstallationCheckSQL
        });

        if (updateError) {
            log('red', `❌ Fonksiyon güncelleme hatası: ${updateError.message}`);
            process.exit(1);
        }

        log('green', '✅ Fonksiyon başarıyla güncellendi!');

        // Test et
        log('yellow', '\n🔍 Güncellenmiş fonksiyonu test ediliyor...');
        const { data: testResult, error: testError } = await supabase.rpc('check_installation_status');

        if (testError) {
            log('red', `❌ Test hatası: ${testError.message}`);
        } else {
            log('green', '✅ Test başarılı!');
            log('cyan', '📋 Test Sonucu:');
            log('cyan', JSON.stringify(testResult, null, 2));
            
            if (testResult.is_installed) {
                log('green', '\n🎉 SİSTEM ARTIK KURULU OLARAK TANIMLANDI!');
            } else {
                log('red', '\n❌ Hala sorun var, debug bilgilerini kontrol edin.');
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