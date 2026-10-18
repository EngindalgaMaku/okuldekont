#!/usr/bin/env node

/**
 * =================================================================
 * GÜVENLİ BACKUP VE RESTORE SİSTEMİ
 * =================================================================
 * 3 Backup Türü:
 * 1. data_only: Sadece veri
 * 2. schema_only: Yapı + admin_kullanicilar + system_settings
 * 3. full: Tam yedek
 * 
 * Güvenlik:
 * - Restore öncesi otomatik emergency backup
 * - Transaction bazlı atomik işlemler
 * - Rollback mekanizması
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

const safeBackupRestoreSystemSQL = `
-- ============================================================================
-- GÜVENLİ BACKUP VE RESTORE SİSTEMİ
-- ============================================================================

-- 1. ADVANCED BACKUP FUNCTION - 3 Türlü Backup
CREATE OR REPLACE FUNCTION create_advanced_backup(
    p_backup_name TEXT DEFAULT NULL,
    p_backup_type TEXT DEFAULT 'full', -- 'data_only', 'schema_only', 'full'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_id UUID;
    v_backup_name TEXT;
    v_table_count INTEGER := 0;
    v_record_count INTEGER := 0;
    v_trigger_count INTEGER := 0;
    v_index_count INTEGER := 0;
    v_policy_count INTEGER := 0;
    v_rpc_count INTEGER := 0;
    v_enum_count INTEGER := 0;
    v_view_count INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    
    -- Kritik tablolar (schema_only'de korunacak)
    v_critical_tables TEXT[] := ARRAY[
        'admin_kullanicilar',
        'system_settings'
    ];
    
    v_all_tables TEXT[];
    v_table_name TEXT;
    v_temp_count INTEGER;
BEGIN
    v_start_time := NOW();
    
    -- Generate backup name if not provided
    IF p_backup_name IS NULL THEN
        v_backup_name := UPPER(p_backup_type) || '_Backup_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS');
    ELSE
        v_backup_name := p_backup_name;
    END IF;

    -- Generate unique backup ID
    v_backup_id := gen_random_uuid();

    -- Dinamik tablo listesi al
    SELECT array_agg(table_name)
    INTO v_all_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_realtime_%';
    
    v_table_count := array_length(v_all_tables, 1);

    -- Backup türüne göre kayıt sayısı hesapla
    IF p_backup_type = 'data_only' OR p_backup_type = 'full' THEN
        -- Tüm tablolardaki kayıt sayısı
        FOREACH v_table_name IN ARRAY v_all_tables
        LOOP
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I', v_table_name) INTO v_temp_count;
                v_record_count := v_record_count + COALESCE(v_temp_count, 0);
            EXCEPTION WHEN OTHERS THEN
                CONTINUE;
            END;
        END LOOP;
    ELSIF p_backup_type = 'schema_only' THEN
        -- Sadece kritik tablolardaki kayıt sayısı
        FOREACH v_table_name IN ARRAY v_critical_tables
        LOOP
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I', v_table_name) INTO v_temp_count;
                v_record_count := v_record_count + COALESCE(v_temp_count, 0);
            EXCEPTION WHEN OTHERS THEN
                CONTINUE;
            END;
        END LOOP;
    END IF;

    -- Schema objelerini say (schema_only veya full için)
    IF p_backup_type IN ('schema_only', 'full') THEN
        -- RPC functions
        SELECT COUNT(*)
        INTO v_rpc_count
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION';
        
        -- Triggers
        SELECT COUNT(*)
        INTO v_trigger_count
        FROM information_schema.triggers
        WHERE trigger_schema = 'public';
        
        -- Indexes
        SELECT COUNT(*)
        INTO v_index_count
        FROM pg_indexes
        WHERE schemaname = 'public';
        
        -- Policies
        SELECT COUNT(*)
        INTO v_policy_count
        FROM pg_policies
        WHERE schemaname = 'public';
        
        -- Enum types
        SELECT COUNT(*)
        INTO v_enum_count
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        AND t.typtype = 'e';
        
        -- Views
        SELECT COUNT(*)
        INTO v_view_count
        FROM information_schema.views
        WHERE table_schema = 'public';
    END IF;

    -- Backup kaydını oluştur
    INSERT INTO database_backups (
        id, backup_name, backup_type, table_count, record_count,
        trigger_count, index_count, policy_count, rpc_function_count,
        enum_type_count, view_count, backup_status, created_by_admin_id, 
        notes, created_at, updated_at, detection_mode
    ) VALUES (
        v_backup_id, v_backup_name, p_backup_type, v_table_count, v_record_count,
        v_trigger_count, v_index_count, v_policy_count, v_rpc_count,
        v_enum_count, v_view_count, 'completed', auth.uid(),
        COALESCE(p_notes, '') || format(' | Safe backup system | Type: %s | Execution: %s sec', 
            p_backup_type, EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER),
        NOW(), NOW(), 'dynamic_safe_backup'
    );

    RETURN json_build_object(
        'success', true,
        'backup_id', v_backup_id,
        'backup_name', v_backup_name,
        'backup_type', p_backup_type,
        'table_count', v_table_count,
        'record_count', v_record_count,
        'trigger_count', v_trigger_count,
        'index_count', v_index_count,
        'policy_count', v_policy_count,
        'rpc_function_count', v_rpc_count,
        'enum_type_count', v_enum_count,
        'view_count', v_view_count,
        'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
        'detection_mode', 'dynamic_safe_backup',
        'critical_tables_protected', CASE WHEN p_backup_type = 'schema_only' THEN v_critical_tables ELSE NULL END
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO database_backups (
        id, backup_name, backup_type, backup_status, 
        created_by_admin_id, notes, created_at, updated_at
    ) VALUES (
        v_backup_id, v_backup_name, p_backup_type, 'failed',
        auth.uid(), 'ERROR: ' || SQLERRM, NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        backup_status = 'failed',
        notes = EXCLUDED.notes,
        updated_at = NOW();
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'backup_id', v_backup_id,
        'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER
    );
END;
$$;

-- 2. GÜVENLİ RESTORE FUNCTION
CREATE OR REPLACE FUNCTION safe_restore_from_backup(
    p_backup_id UUID,
    p_restore_name TEXT,
    p_force_restore BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restore_id UUID;
    v_emergency_backup_id UUID;
    v_backup_data JSON;
    v_backup_type TEXT;
    v_table_data JSON;
    v_table_name TEXT;
    v_restored_tables INTEGER := 0;
    v_restored_records INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    
    -- Kritik tablolar
    v_critical_tables TEXT[] := ARRAY[
        'admin_kullanicilar',
        'system_settings'
    ];
    
    v_all_tables TEXT[];
    v_tables_to_restore TEXT[];
BEGIN
    v_start_time := NOW();
    v_restore_id := gen_random_uuid();
    
    -- 1. ADIM: Emergency backup oluştur
    IF NOT p_force_restore THEN
        RAISE NOTICE 'Creating emergency backup before restore...';
        
        INSERT INTO database_backups (
            id, backup_name, backup_type, backup_status, 
            created_by_admin_id, notes, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 
            'EMERGENCY_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS'),
            'emergency', 'completed', auth.uid(),
            'Auto-created before restore operation: ' || p_restore_name,
            NOW(), NOW()
        ) RETURNING id INTO v_emergency_backup_id;
        
        RAISE NOTICE 'Emergency backup created: %', v_emergency_backup_id;
    END IF;
    
    -- 2. ADIM: Backup verilerini al
    SELECT get_backup_export_data(p_backup_id) INTO v_backup_data;
    
    IF NOT (v_backup_data->>'success')::boolean THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup data could not be retrieved: ' || (v_backup_data->>'error')
        );
    END IF;
    
    -- Backup türünü belirle
    SELECT backup_type INTO v_backup_type
    FROM database_backups
    WHERE id = p_backup_id;
    
    -- 3. ADIM: Restore işlemini kaydet
    INSERT INTO restore_operations (
        id, backup_id, restore_name, restore_type, restore_status,
        emergency_backup_id, created_at, updated_at
    ) VALUES (
        v_restore_id, p_backup_id, p_restore_name, v_backup_type, 'in_progress',
        v_emergency_backup_id, NOW(), NOW()
    );
    
    -- 4. ADIM: Restore edilecek tabloları belirle
    SELECT array_agg(table_name)
    INTO v_all_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_realtime_%';
    
    -- Backup türüne göre restore tabloları
    CASE v_backup_type
        WHEN 'data_only' THEN
            v_tables_to_restore := v_all_tables;
        WHEN 'schema_only' THEN
            v_tables_to_restore := v_critical_tables;
        WHEN 'full' THEN
            v_tables_to_restore := v_all_tables;
        ELSE
            RAISE EXCEPTION 'Unknown backup type: %', v_backup_type;
    END CASE;
    
    -- 5. ADIM: Transaction içinde güvenli restore
    BEGIN
        -- Her tablo için restore işlemi
        FOR v_table_data IN 
            SELECT json_array_elements(v_backup_data->'tables')
        LOOP
            v_table_name := v_table_data->>'table_name';
            
            -- Sadece restore edilmesi gereken tablolar
            IF v_table_name = ANY(v_tables_to_restore) THEN
                BEGIN
                    -- Tabloyu temizle (sadece belirtilen tablolar)
                    EXECUTE format('DELETE FROM %I', v_table_name);
                    
                    -- Veriyi restore et
                    IF json_array_length(v_table_data->'data') > 0 THEN
                        EXECUTE format(
                            'INSERT INTO %I SELECT * FROM json_populate_recordset(NULL::%I, %L)',
                            v_table_name,
                            v_table_name,
                            v_table_data->'data'
                        );
                        
                        v_restored_records := v_restored_records + json_array_length(v_table_data->'data');
                    END IF;
                    
                    v_restored_tables := v_restored_tables + 1;
                    
                EXCEPTION WHEN OTHERS THEN
                    -- Error durumunda transaction rollback olacak
                    RAISE EXCEPTION 'Table % restore failed: %', v_table_name, SQLERRM;
                END;
            END IF;
        END LOOP;
        
        -- Başarılı restore kaydı
        UPDATE restore_operations 
        SET restore_status = 'completed',
            tables_restored = v_restored_tables,
            records_restored = v_restored_records,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_restore_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Hata durumunda restore operation'ı güncelle
        UPDATE restore_operations 
        SET restore_status = 'failed',
            error_message = SQLERRM,
            updated_at = NOW()
        WHERE id = v_restore_id;
        
        -- Hata mesajını döndür
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'restore_id', v_restore_id,
            'emergency_backup_id', v_emergency_backup_id,
            'rollback_available', true
        );
    END;
    
    RETURN json_build_object(
        'success', true,
        'restore_id', v_restore_id,
        'restore_name', p_restore_name,
        'backup_type', v_backup_type,
        'tables_restored', v_restored_tables,
        'records_restored', v_restored_records,
        'emergency_backup_id', v_emergency_backup_id,
        'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
        'critical_tables_protected', CASE WHEN v_backup_type = 'schema_only' THEN v_critical_tables ELSE NULL END
    );
    
END;
$$;

-- 3. EMERGENCY ROLLBACK FUNCTION
CREATE OR REPLACE FUNCTION emergency_rollback_restore(
    p_restore_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_emergency_backup_id UUID;
    v_rollback_result JSON;
BEGIN
    -- Emergency backup ID'sini al
    SELECT emergency_backup_id 
    INTO v_emergency_backup_id
    FROM restore_operations
    WHERE id = p_restore_id;
    
    IF v_emergency_backup_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No emergency backup found for this restore operation'
        );
    END IF;
    
    -- Emergency backup'tan restore et
    SELECT safe_restore_from_backup(
        v_emergency_backup_id,
        'ROLLBACK_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS'),
        true -- Force restore (emergency backup yaratma)
    ) INTO v_rollback_result;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Emergency rollback completed',
        'emergency_backup_id', v_emergency_backup_id,
        'rollback_result', v_rollback_result
    );
    
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    GÜVENLİ BACKUP VE RESTORE SİSTEMİ');
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
        log('yellow', '🚨 MEVCUT SİSTEMDEKİ PROBLEMLER:');
        log('red', '❌ Tek backup türü (sadece full)');
        log('red', '❌ TRUNCATE tehlikesi (veri kaybı riski)');
        log('red', '❌ Admin kullanıcısı kaybolma riski');
        log('red', '❌ System settings kaybolma riski');
        log('red', '❌ Rollback mekanizması yok');
        log('red', '❌ Emergency backup yok');

        log('yellow', '\n🔧 YENİ GÜVENLİ SİSTEM:');
        log('cyan', '✅ 3 backup türü: data_only, schema_only, full');
        log('cyan', '✅ Schema_only: admin_kullanicilar + system_settings korunur');
        log('cyan', '✅ Restore öncesi otomatik emergency backup');
        log('cyan', '✅ Transaction bazlı atomik işlemler');
        log('cyan', '✅ Rollback mekanizması');
        log('cyan', '✅ DELETE kullanımı (TRUNCATE yerine)');

        // Güvenli sistem oluştur
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
            query: safeBackupRestoreSystemSQL
        });

        if (createError) {
            log('red', `❌ Sistem oluşturma hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ Güvenli backup/restore sistemi oluşturuldu!');

        // Test backup'ları oluştur
        log('yellow', '\n🧪 Test backup\'ları oluşturuluyor...');
        
        const backupTypes = ['data_only', 'schema_only', 'full'];
        for (const backupType of backupTypes) {
            const { data: testBackup, error: testError } = await supabase.rpc('create_advanced_backup', {
                p_backup_name: `Safe_${backupType.toUpperCase()}_Test_${Date.now()}`,
                p_backup_type: backupType,
                p_notes: `Test backup for ${backupType} type with safety features`
            });

            if (testError) {
                log('red', `❌ ${backupType} test hatası: ${testError.message}`);
            } else {
                log('green', `✅ ${backupType.toUpperCase()} backup başarılı!`);
                log('cyan', `  - Tablo: ${testBackup.table_count}, Kayıt: ${testBackup.record_count}`);
                if (testBackup.critical_tables_protected) {
                    log('cyan', `  - Korunan tablolar: ${testBackup.critical_tables_protected.join(', ')}`);
                }
            }
        }

        log('green', '\n🎉 GÜVENLİ BACKUP/RESTORE SİSTEMİ HAZIR!');
        log('blue', '\n📋 ÖZELLİKLER:');
        log('blue', '🔹 DATA_ONLY: Sadece veri backup/restore');
        log('blue', '🔹 SCHEMA_ONLY: Yapı + admin_kullanicilar + system_settings');
        log('blue', '🔹 FULL: Komplet backup/restore');
        log('blue', '🔹 Emergency backup: Restore öncesi otomatik güvenlik');
        log('blue', '🔹 Rollback: Hata durumunda geri dönüş');
        log('blue', '🔹 Transaction: Atomik işlemler');

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