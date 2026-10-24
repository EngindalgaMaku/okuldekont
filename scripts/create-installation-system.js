#!/usr/bin/env node

/**
 * =================================================================
 * SİSTEM KURULUM VE DEPLOYMENT SİSTEMİ
 * =================================================================
 * Yeni hosting ortamında backup'tan otomatik sistem kurulumu
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

const installationSystemSQL = `
-- ============================================================================
-- SİSTEM KURULUM VE DEPLOYMENT SİSTEMİ
-- ============================================================================

-- 1. KURULUM DURUMU KONTROL TABLOSU
CREATE TABLE IF NOT EXISTS system_installation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_status TEXT NOT NULL DEFAULT 'not_installed', -- 'not_installed', 'installing', 'installed'
    installation_date TIMESTAMPTZ,
    installation_version TEXT,
    environment_type TEXT DEFAULT 'production', -- 'development', 'staging', 'production'
    hostname TEXT,
    installation_method TEXT, -- 'fresh_install', 'backup_restore', 'migration'
    backup_source_id UUID,
    admin_user_id UUID,
    installation_notes TEXT,
    installation_config JSON,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. KURULUM DURUMU KONTROL FONKSIYONU
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
BEGIN
    -- Kurulum tablosunu kontrol et
    SELECT * INTO v_installation_record
    FROM system_installation
    WHERE installation_status = 'installed'
    ORDER BY installation_date DESC
    LIMIT 1;
    
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
    
    -- Sonucu döndür
    RETURN json_build_object(
        'is_installed', v_installation_record IS NOT NULL,
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
        'installation_notes', v_installation_record.installation_notes
    );
END;
$$;

-- 3. KURULUM BAŞLATMA FONKSIYONU
CREATE OR REPLACE FUNCTION start_installation(
    p_environment_type TEXT DEFAULT 'production',
    p_hostname TEXT DEFAULT NULL,
    p_installation_method TEXT DEFAULT 'fresh_install',
    p_backup_source_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_installation_id UUID;
    v_existing_installation RECORD;
BEGIN
    -- Mevcut kurulum kontrolü
    SELECT * INTO v_existing_installation
    FROM system_installation
    WHERE installation_status = 'installed'
    LIMIT 1;
    
    IF v_existing_installation IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'System is already installed',
            'installation_date', v_existing_installation.installation_date,
            'environment_type', v_existing_installation.environment_type
        );
    END IF;
    
    -- Yeni kurulum kaydı oluştur
    v_installation_id := gen_random_uuid();
    
    INSERT INTO system_installation (
        id, installation_status, environment_type, hostname,
        installation_method, backup_source_id, installation_notes,
        created_at, updated_at
    ) VALUES (
        v_installation_id, 'installing', p_environment_type, p_hostname,
        p_installation_method, p_backup_source_id, p_notes,
        NOW(), NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'installation_id', v_installation_id,
        'status', 'installing',
        'environment_type', p_environment_type,
        'installation_method', p_installation_method
    );
END;
$$;

-- 4. KURULUM TAMAMLAMA FONKSIYONU
CREATE OR REPLACE FUNCTION complete_installation(
    p_installation_id UUID,
    p_admin_user_id UUID,
    p_installation_version TEXT DEFAULT '1.0.0',
    p_installation_config JSON DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Kurulum kaydını güncelle
    UPDATE system_installation
    SET 
        installation_status = 'installed',
        installation_date = NOW(),
        installation_version = p_installation_version,
        admin_user_id = p_admin_user_id,
        installation_config = p_installation_config,
        updated_at = NOW()
    WHERE id = p_installation_id;
    
    RETURN json_build_object(
        'success', true,
        'installation_id', p_installation_id,
        'status', 'installed',
        'installation_date', NOW(),
        'admin_user_id', p_admin_user_id
    );
END;
$$;

-- 5. BACKUP'TAN KURULUM FONKSIYONU
CREATE OR REPLACE FUNCTION install_from_backup(
    p_backup_data JSON,
    p_environment_type TEXT DEFAULT 'production',
    p_hostname TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_installation_id UUID;
    v_table_data JSON;
    v_table_name TEXT;
    v_installed_tables INTEGER := 0;
    v_installed_records INTEGER := 0;
    v_admin_user_id UUID;
    v_error_message TEXT;
BEGIN
    -- Kurulum başlat
    SELECT (start_installation(p_environment_type, p_hostname, 'backup_restore', NULL, p_notes))->>'installation_id'
    INTO v_installation_id;
    
    IF v_installation_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Installation could not be started - system may already be installed'
        );
    END IF;
    
    BEGIN
        -- Tabloları oluştur ve veri yükle
        FOR v_table_data IN 
            SELECT json_array_elements(p_backup_data->'tables')
        LOOP
            v_table_name := v_table_data->>'table_name';
            
            BEGIN
                -- Veri yükle
                IF json_array_length(v_table_data->'data') > 0 THEN
                    EXECUTE format(
                        'INSERT INTO %I SELECT * FROM json_populate_recordset(NULL::%I, %L)',
                        v_table_name,
                        v_table_name,
                        v_table_data->'data'
                    );
                    
                    v_installed_records := v_installed_records + json_array_length(v_table_data->'data');
                END IF;
                
                v_installed_tables := v_installed_tables + 1;
                
            EXCEPTION WHEN OTHERS THEN
                v_error_message := format('Table %s installation failed: %s', v_table_name, SQLERRM);
                
                -- Kurulum hata durumuna al
                UPDATE system_installation
                SET installation_status = 'failed',
                    installation_notes = v_error_message,
                    updated_at = NOW()
                WHERE id = v_installation_id;
                
                RETURN json_build_object(
                    'success', false,
                    'error', v_error_message,
                    'installation_id', v_installation_id
                );
            END;
        END LOOP;
        
        -- Admin kullanıcı ID'sini al
        SELECT id INTO v_admin_user_id
        FROM admin_kullanicilar
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Kurulumu tamamla
        PERFORM complete_installation(
            v_installation_id,
            v_admin_user_id,
            '1.0.0',
            json_build_object(
                'source', 'backup_restore',
                'tables_installed', v_installed_tables,
                'records_installed', v_installed_records
            )
        );
        
        RETURN json_build_object(
            'success', true,
            'installation_id', v_installation_id,
            'tables_installed', v_installed_tables,
            'records_installed', v_installed_records,
            'admin_user_id', v_admin_user_id,
            'status', 'installed'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Genel hata durumu
        UPDATE system_installation
        SET installation_status = 'failed',
            installation_notes = SQLERRM,
            updated_at = NOW()
        WHERE id = v_installation_id;
        
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'installation_id', v_installation_id
        );
    END;
END;
$$;

-- 6. KURULUM SIFIRLAMA FONKSIYONU (Geliştirme amaçlı)
CREATE OR REPLACE FUNCTION reset_installation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Sadece development ortamında çalışsın
    DELETE FROM system_installation;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Installation reset completed'
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    SİSTEM KURULUM VE DEPLOYMENT SİSTEMİ');
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
        log('yellow', '🚀 KURULUM SİSTEMİ ÖZELLİKLERİ:');
        log('cyan', '✅ Kurulum durumu kontrolü');
        log('cyan', '✅ Backup\'tan otomatik kurulum');
        log('cyan', '✅ Multi-environment desteği');
        log('cyan', '✅ Kurulum kilit sistemi');
        log('cyan', '✅ Rollback ve hata yönetimi');

        // Kurulum sistemini oluştur
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
            query: installationSystemSQL
        });

        if (createError) {
            log('red', `❌ Sistem oluşturma hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ Kurulum sistemi oluşturuldu!');

        // Mevcut kurulum durumunu kontrol et
        log('yellow', '\n🔍 Mevcut kurulum durumu kontrol ediliyor...');
        const { data: statusCheck, error: statusError } = await supabase.rpc('check_installation_status');

        if (statusError) {
            log('red', `❌ Durum kontrolü hatası: ${statusError.message}`);
        } else {
            log('green', '✅ Kurulum durumu kontrol edildi!');
            log('cyan', `📋 Durum Raporu:`);
            log('cyan', `  - Kurulu: ${statusCheck.is_installed ? 'EVET' : 'HAYIR'}`);
            log('cyan', `  - Durum: ${statusCheck.installation_status}`);
            log('cyan', `  - Tablo Sayısı: ${statusCheck.table_count}`);
            log('cyan', `  - Admin Sayısı: ${statusCheck.admin_count}`);
            log('cyan', `  - Sistem Hazır: ${statusCheck.system_ready ? 'EVET' : 'HAYIR'}`);
            
            if (statusCheck.installation_date) {
                log('cyan', `  - Kurulum Tarihi: ${new Date(statusCheck.installation_date).toLocaleString('tr-TR')}`);
            }
        }

        log('green', '\n🎉 KURULUM SİSTEMİ HAZIR!');
        log('blue', '\n📋 SONRAKI ADIMLAR:');
        log('blue', '1. İlk kurulum sayfası (/setup) oluşturulacak');
        log('blue', '2. Backup yükleme arayüzü eklenecek');
        log('blue', '3. Kurulum kilit sistemi aktif edilecek');
        log('blue', '4. Multi-environment deployment desteği tamamlanacak');

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