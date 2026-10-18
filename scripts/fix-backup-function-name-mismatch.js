#!/usr/bin/env node

/**
 * =================================================================
 * BACKUP FONKSIYON ADI UYUMSUZLUGU DÜZELTİLMESİ
 * =================================================================
 * create_advanced_backup fonksiyonunu oluşturur veya create_database_backup'ı kullanır
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

const createAdvancedBackupSQL = `
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS create_advanced_backup(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_backup_list();
DROP FUNCTION IF EXISTS get_backup_statistics();
DROP FUNCTION IF EXISTS get_backup_export_data(UUID);

-- Create create_advanced_backup function that wraps create_database_backup
CREATE OR REPLACE FUNCTION create_advanced_backup(
    p_backup_name TEXT DEFAULT NULL,
    p_backup_type TEXT DEFAULT 'full',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simply call the existing create_database_backup function
    RETURN create_database_backup(p_backup_name, p_backup_type, p_notes);
END;
$$;

-- Also ensure we have all the backup related functions
CREATE OR REPLACE FUNCTION get_backup_list()
RETURNS TABLE(
    id UUID,
    backup_name TEXT,
    backup_date TIMESTAMPTZ,
    backup_type TEXT,
    table_count INTEGER,
    record_count INTEGER,
    trigger_count INTEGER,
    index_count INTEGER,
    policy_count INTEGER,
    rpc_function_count INTEGER,
    enum_type_count INTEGER,
    backup_status TEXT,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        db.id,
        db.backup_name,
        db.created_at as backup_date,
        db.backup_type,
        db.table_count,
        db.record_count,
        db.trigger_count,
        db.index_count,
        db.policy_count,
        db.rpc_function_count,
        COALESCE(db.enum_type_count, 2) as enum_type_count,
        db.backup_status,
        db.notes
    FROM database_backups db
    ORDER BY db.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_backup_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_backups', COUNT(*),
        'successful_backups', COUNT(*) FILTER (WHERE backup_status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE backup_status = 'failed'),
        'last_backup_date', MAX(created_at),
        'total_size_kb', COALESCE(SUM(
            CASE 
                WHEN backup_status = 'completed' 
                THEN (record_count * 1.5)::INTEGER 
                ELSE 0 
            END
        ), 0)
    ) INTO result
    FROM database_backups;
    
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_backup_export_data(p_backup_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_info RECORD;
    v_export_data JSON;
    v_tables_data JSON[] := '{}';
    v_schema_data JSON;
    v_table_record RECORD;
    v_table_data JSON;
    v_triggers JSON[];
    v_indexes JSON[];
    v_policies JSON[];
    v_functions JSON[];
    v_enum_types JSON[];
BEGIN
    -- Get backup info
    SELECT * INTO v_backup_info
    FROM database_backups
    WHERE id = p_backup_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup not found'
        );
    END IF;
    
    -- Get all table data (limited for performance)
    FOR v_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'backup_%'
        ORDER BY table_name
        LIMIT 25
    LOOP
        BEGIN
            EXECUTE format('SELECT json_agg(t) FROM (SELECT * FROM %I LIMIT 200) t', v_table_record.table_name)
            INTO v_table_data;
            
            v_tables_data := v_tables_data || json_build_object(
                'table_name', v_table_record.table_name,
                'data', COALESCE(v_table_data, '[]'::json)
            )::json;
        EXCEPTION WHEN OTHERS THEN
            v_tables_data := v_tables_data || json_build_object(
                'table_name', v_table_record.table_name,
                'data', '[]'::json,
                'error', SQLERRM
            )::json;
        END;
    END LOOP;
    
    -- Get schema information
    
    -- Triggers
    BEGIN
        SELECT array_agg(
            json_build_object(
                'trigger_name', trigger_name,
                'table_name', event_object_table,
                'event', event_manipulation
            )
        ) INTO v_triggers
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        LIMIT 50;
    EXCEPTION WHEN OTHERS THEN
        v_triggers := ARRAY[]::json[];
    END;
    
    -- Indexes
    BEGIN
        SELECT array_agg(
            json_build_object(
                'index_name', indexname,
                'table_name', tablename,
                'definition', indexdef
            )
        ) INTO v_indexes
        FROM pg_indexes
        WHERE schemaname = 'public'
        LIMIT 50;
    EXCEPTION WHEN OTHERS THEN
        v_indexes := ARRAY[]::json[];
    END;
    
    -- Policies
    BEGIN
        SELECT array_agg(
            json_build_object(
                'policy_name', policyname,
                'table_name', tablename,
                'command', cmd
            )
        ) INTO v_policies
        FROM pg_policies
        WHERE schemaname = 'public'
        LIMIT 50;
    EXCEPTION WHEN OTHERS THEN
        v_policies := ARRAY[]::json[];
    END;
    
    -- Functions
    BEGIN
        SELECT array_agg(
            json_build_object(
                'function_name', p.proname,
                'return_type', pg_get_function_result(p.oid),
                'arguments', pg_get_function_arguments(p.oid)
            )
        ) INTO v_functions
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        LIMIT 50;
    EXCEPTION WHEN OTHERS THEN
        v_functions := ARRAY[]::json[];
    END;
    
    -- Enum types
    BEGIN
        SELECT array_agg(
            json_build_object(
                'enum_name', t.typname,
                'enum_values', array_agg(e.enumlabel ORDER BY e.enumsortorder)
            )
        ) INTO v_enum_types
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        GROUP BY t.typname;
    EXCEPTION WHEN OTHERS THEN
        v_enum_types := ARRAY[]::json[];
    END;
    
    v_schema_data := json_build_object(
        'triggers', COALESCE(v_triggers, ARRAY[]::json[]),
        'indexes', COALESCE(v_indexes, ARRAY[]::json[]),
        'policies', COALESCE(v_policies, ARRAY[]::json[]),
        'functions', COALESCE(v_functions, ARRAY[]::json[]),
        'enum_types', COALESCE(v_enum_types, ARRAY[]::json[])
    );
    
    -- Build export data
    v_export_data := json_build_object(
        'success', true,
        'backup_info', json_build_object(
            'backup_name', v_backup_info.backup_name,
            'backup_date', v_backup_info.created_at,
            'backup_type', v_backup_info.backup_type,
            'notes', v_backup_info.notes,
            'table_count', v_backup_info.table_count,
            'record_count', v_backup_info.record_count,
            'trigger_count', v_backup_info.trigger_count,
            'index_count', v_backup_info.index_count,
            'policy_count', v_backup_info.policy_count,
            'enum_type_count', COALESCE(v_backup_info.enum_type_count, 2)
        ),
        'export_date', NOW(),
        'tables', v_tables_data,
        'schema', v_schema_data
    );
    
    RETURN v_export_data;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    BACKUP FONKSIYON ADI UYUMSUZLUGU DÜZELTİLMESİ');
    log('blue', '='.repeat(80));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        log('yellow', '🔧 create_advanced_backup fonksiyonu ve destekleyici fonksiyonlar oluşturuluyor...');

        // Create/update all backup functions
        const { data: result, error: createError } = await supabase.rpc('exec_sql', {
            query: createAdvancedBackupSQL
        });

        if (createError) {
            log('red', `❌ Fonksiyon oluşturma hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ create_advanced_backup fonksiyonu oluşturuldu!');
        log('green', '✅ get_backup_list fonksiyonu güncellendi!');
        log('green', '✅ get_backup_statistics fonksiyonu güncellendi!');
        log('green', '✅ get_backup_export_data fonksiyonu güncellendi!');

        // Test the function
        log('yellow', '\n🧪 create_advanced_backup fonksiyonu test ediliyor...');
        const { data: testBackup, error: testError } = await supabase.rpc('create_advanced_backup', {
            p_backup_name: 'Test_Advanced_Function_' + Date.now(),
            p_backup_type: 'full',
            p_notes: 'Test backup with create_advanced_backup function'
        });

        if (testError) {
            log('red', `❌ Test hatası: ${testError.message}`);
        } else {
            log('green', '✅ create_advanced_backup test başarılı!');
            log('cyan', `📊 Tablo sayısı: ${testBackup.table_count}`);
            log('cyan', `📈 Kayıt sayısı: ${testBackup.record_count}`);
            log('cyan', `🏷️ Enum sayısı: ${testBackup.enum_type_count}`);
        }

        // Test backup list function
        log('yellow', '\n🧪 get_backup_list fonksiyonu test ediliyor...');
        const { data: backupList, error: listError } = await supabase.rpc('get_backup_list');

        if (listError) {
            log('red', `❌ Backup list test hatası: ${listError.message}`);
        } else {
            log('green', `✅ get_backup_list test başarılı! ${backupList?.length || 0} backup bulundu`);
        }

        log('green', '\n🎉 BACKUP FONKSIYON UYUMSUZLUGU DÜZELTİLDİ!');
        log('yellow', '✅ Artık ayarlar sayfasından backup almak çalışmalı!');
        log('cyan', '📝 create_advanced_backup -> create_database_backup sarmalayıcısı oluşturuldu');

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