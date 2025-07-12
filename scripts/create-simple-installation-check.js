#!/usr/bin/env node

/**
 * =================================================================
 * BASİT KURULUM KONTROL FONKSİYONU
 * =================================================================
 * Karmaşık logic yerine basit bir sistem durumu kontrolü
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

const simpleInstallationCheckSQL = `
-- BASİT KURULUM KONTROL FONKSİYONU
CREATE OR REPLACE FUNCTION check_installation_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_count INTEGER := 0;
    v_admin_count INTEGER := 0;
    v_system_settings_count INTEGER := 0;
    v_is_installed BOOLEAN := false;
    v_system_ready BOOLEAN := false;
BEGIN
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
    
    -- Sistem durumunu belirle - eğer temel tablolar ve admin varsa kurulu kabul et
    v_system_ready := (v_table_count >= 5 AND v_admin_count > 0 AND v_system_settings_count > 0);
    v_is_installed := v_system_ready;
    
    -- Sonucu döndür
    RETURN json_build_object(
        'is_installed', v_is_installed,
        'installation_status', CASE WHEN v_is_installed THEN 'installed' ELSE 'not_installed' END,
        'installation_date', NOW(),
        'installation_version', '1.0.0',
        'environment_type', 'production',
        'installation_method', 'auto_detected',
        'hostname', 'auto-detected-system',
        'table_count', v_table_count,
        'admin_count', v_admin_count,
        'system_settings_count', v_system_settings_count,
        'system_ready', v_system_ready,
        'installation_notes', 'Auto-detected based on existing data'
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    BASİT KURULUM KONTROL FONKSİYONU');
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
        log('yellow', '🔧 Basit kurulum kontrol fonksiyonu oluşturuluyor...');
        
        // Fonksiyonu oluştur
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
            query: simpleInstallationCheckSQL
        });

        if (createError) {
            log('red', `❌ Fonksiyon oluşturma hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ Basit fonksiyon oluşturuldu!');

        // Test et
        log('yellow', '\n🔍 Yeni fonksiyonu test ediliyor...');
        const { data: testResult, error: testError } = await supabase.rpc('check_installation_status');

        if (testError) {
            log('red', `❌ Test hatası: ${testError.message}`);
        } else {
            log('green', '✅ Test başarılı!');
            log('cyan', '📋 Test Sonucu:');
            log('cyan', JSON.stringify(testResult, null, 2));
            
            if (testResult.is_installed) {
                log('green', '\n🎉 SİSTEM ARTIK KURULU OLARAK TANIMLANDI!');
                log('blue', '🔄 Artık sisteme normal şekilde giriş yapabilirsiniz.');
            } else {
                log('red', '\n❌ Sistem henüz kurulu olarak tanımlanmadı.');
                log('yellow', '💡 Kontrol kriterleri:');
                log('yellow', `   - Tablo sayısı: ${testResult.table_count} (>=5 olmalı)`);
                log('yellow', `   - Admin sayısı: ${testResult.admin_count} (>0 olmalı)`);
                log('yellow', `   - System settings: ${testResult.system_settings_count} (>0 olmalı)`);
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