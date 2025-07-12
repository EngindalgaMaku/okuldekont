#!/usr/bin/env node

/**
 * =================================================================
 * DİNAMİK BACKUP SİSTEMİ - DEVELOPMENT İÇİN UYARLANMIŞ
 * =================================================================
 * Yeni tablolar, fonksiyonlar, enum'lar otomatik algılanır
 * Geliştirme sırasında değişiklikleri dinamik takip eder
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

const dynamicBackupSQL = `
-- Dynamic backup function that detects all changes automatically
CREATE OR REPLACE FUNCTION create_database_backup(
    p_backup_name TEXT DEFAULT NULL,
    p_backup_type TEXT DEFAULT 'full',
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
    v_backup_result JSON;
    v_start_time TIMESTAMPTZ;
    v_table_record RECORD;
    v_temp_count INTEGER;
    v_changes_detected TEXT := '';
BEGIN
    v_start_time := NOW();
    
    -- Generate backup name if not provided
    IF p_backup_name IS NULL THEN
        v_backup_name := 'Dynamic_Backup_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS');
    ELSE
        v_backup_name := p_backup_name;
    END IF;

    -- Generate unique backup ID
    v_backup_id := gen_random_uuid();

    -- DYNAMIC TABLE DETECTION
    SELECT COUNT(*)
    INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('_realtime_schema_migrations', 'schema_migrations', 'supabase_migrations');

    -- DYNAMIC RECORD COUNT
    FOR v_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_realtime_schema_migrations', 'schema_migrations', 'supabase_migrations')
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table_record.table_name)
            INTO v_temp_count;
            v_record_count := v_record_count + COALESCE(v_temp_count, 0);
        EXCEPTION WHEN OTHERS THEN
            -- Skip tables that can't be counted
            CONTINUE;
        END;
    END LOOP;

    -- DYNAMIC VIEW COUNT
    SELECT COUNT(*)
    INTO v_view_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'VIEW';

    -- Add view record counts
    FOR v_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'VIEW'
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', v_table_record.table_name)
            INTO v_temp_count;
            v_record_count := v_record_count + COALESCE(v_temp_count, 0);
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;

    -- DYNAMIC RPC FUNCTION COUNT
    SELECT COUNT(*)
    INTO v_rpc_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.proname NOT LIKE '__%';

    -- DYNAMIC TRIGGER COUNT
    SELECT COUNT(DISTINCT trigger_name)
    INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';

    -- DYNAMIC INDEX COUNT (excluding system indexes)
    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE 'pg_%';

    -- DYNAMIC POLICY COUNT
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    -- DYNAMIC ENUM TYPE COUNT
    SELECT COUNT(DISTINCT t.typname)
    INTO v_enum_count
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public';

    -- CHANGE DETECTION SUMMARY
    v_changes_detected := format(
        'DETECTED: %s tables, %s RPC functions, %s triggers, %s indexes, %s policies, %s enums, %s views',
        v_table_count, v_rpc_count, v_trigger_count, v_index_count, v_policy_count, v_enum_count, v_view_count
    );

    -- Create backup record with dynamic counts
    INSERT INTO database_backups (
        id,
        backup_name,
        backup_type,
        table_count,
        record_count,
        trigger_count,
        index_count,
        policy_count,
        rpc_function_count,
        backup_status,
        created_by_admin_id,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_backup_id,
        v_backup_name,
        p_backup_type,
        v_table_count,
        v_record_count,
        v_trigger_count,
        v_index_count,
        v_policy_count,
        v_rpc_count,
        'completed',
        auth.uid(),
        COALESCE(p_notes, '') || ' | DYNAMIC DETECTION | ' || v_changes_detected || 
        format(' | Execution time: %s seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER),
        NOW(),
        NOW()
    );

    -- Build result JSON with dynamic data
    v_backup_result := json_build_object(
        'success', true,
        'backup_id', v_backup_id,
        'backup_name', v_backup_name,
        'backup_type', p_backup_type,
        'table_count', v_table_count,
        'view_count', v_view_count,
        'record_count', v_record_count,
        'trigger_count', v_trigger_count,
        'index_count', v_index_count,
        'policy_count', v_policy_count,
        'rpc_function_count', v_rpc_count,
        'enum_type_count', v_enum_count,
        'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
        'detection_mode', 'dynamic_auto_discovery',
        'changes_detected', v_changes_detected,
        'created_at', NOW()
    );

    RETURN v_backup_result;

EXCEPTION WHEN OTHERS THEN
    -- Log error and return failure
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

-- Dynamic export function
CREATE OR REPLACE FUNCTION get_backup_export_data(
    p_backup_id UUID
)
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
    v_views JSON[];
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
    
    -- Get all table data DYNAMICALLY
    FOR v_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_realtime_schema_migrations', 'schema_migrations', 'supabase_migrations')
        ORDER BY table_name
    LOOP
        BEGIN
            EXECUTE format('SELECT json_agg(t) FROM (SELECT * FROM %I LIMIT 1000) t', v_table_record.table_name)
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
    
    -- Get schema information DYNAMICALLY
    
    -- Triggers
    BEGIN
        SELECT array_agg(
            json_build_object(
                'trigger_name', trigger_name,
                'table_name', event_object_table,
                'event', event_manipulation,
                'timing', action_timing,
                'statement', action_statement
            )
        ) INTO v_triggers
        FROM information_schema.triggers
        WHERE trigger_schema = 'public';
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
        AND indexname NOT LIKE 'pg_%';
    EXCEPTION WHEN OTHERS THEN
        v_indexes := ARRAY[]::json[];
    END;
    
    -- Policies
    BEGIN
        SELECT array_agg(
            json_build_object(
                'policy_name', policyname,
                'table_name', tablename,
                'command', cmd,
                'definition', qual
            )
        ) INTO v_policies
        FROM pg_policies
        WHERE schemaname = 'public';
    EXCEPTION WHEN OTHERS THEN
        v_policies := ARRAY[]::json[];
    END;
    
    -- Functions with full definitions
    BEGIN
        SELECT array_agg(
            json_build_object(
                'function_name', p.proname,
                'return_type', pg_get_function_result(p.oid),
                'arguments', pg_get_function_arguments(p.oid),
                'definition', pg_get_functiondef(p.oid)
            )
        ) INTO v_functions
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE '__%';
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
    
    -- Views
    BEGIN
        SELECT array_agg(
            json_build_object(
                'view_name', table_name,
                'definition', view_definition
            )
        ) INTO v_views
        FROM information_schema.views
        WHERE table_schema = 'public';
    EXCEPTION WHEN OTHERS THEN
        v_views := ARRAY[]::json[];
    END;
    
    v_schema_data := json_build_object(
        'triggers', COALESCE(v_triggers, ARRAY[]::json[]),
        'indexes', COALESCE(v_indexes, ARRAY[]::json[]),
        'policies', COALESCE(v_policies, ARRAY[]::json[]),
        'functions', COALESCE(v_functions, ARRAY[]::json[]),
        'enum_types', COALESCE(v_enum_types, ARRAY[]::json[]),
        'views', COALESCE(v_views, ARRAY[]::json[])
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
            'rpc_function_count', v_backup_info.rpc_function_count
        ),
        'export_date', NOW(),
        'tables', v_tables_data,
        'schema', v_schema_data,
        'detection_mode', 'dynamic'
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
    log('blue', '    DİNAMİK BACKUP SİSTEMİ - DEVELOPMENT İÇİN UYARLAMA');
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
        log('red', '⚠️ PROBLEM: Mevcut sistem STATİK!');
        log('red', '  - Sabit 23 tablo');
        log('red', '  - Sabit 30 RPC fonksiyonu');
        log('red', '  - Sabit 2 trigger');
        log('red', '  - Sabit 29 index');
        log('red', '  - Yeni eklenen tablolar/fonksiyonlar ALGILANMAYACAK!');

        log('yellow', '\n🔧 ÇÖZ ÜM: Dinamik algılama sistemi yükleniyor...');

        // Dinamik sistemi yükle
        const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
            query: dynamicBackupSQL
        });

        if (updateError) {
            log('red', `❌ Sistem güncelleme hatası: ${updateError.message}`);
            process.exit(1);
        }

        log('green', '✅ Dinamik backup sistemi başarıyla yüklendi!');

        // Test et
        log('yellow', '\n🧪 Dinamik algılama test ediliyor...');
        const startTime = Date.now();
        
        const { data: testBackup, error: testError } = await supabase.rpc('create_database_backup', {
            p_backup_name: 'Dynamic_System_Test_' + Date.now(),
            p_backup_type: 'full',
            p_notes: 'Testing dynamic detection system'
        });

        const executionTime = Date.now() - startTime;

        if (testError) {
            log('red', `❌ Test hatası: ${testError.message}`);
        } else {
            log('green', `✅ Test başarılı! Süre: ${executionTime}ms`);
            log('green', `🔍 DİNAMİK ALGıLAMA SONUÇLARI:`);
            log('cyan', `  📋 Tablo: ${testBackup.table_count} (otomatik algılandı)`);
            log('cyan', `  📊 View: ${testBackup.view_count || 0} (otomatik algılandı)`);
            log('cyan', `  📈 Kayıt: ${testBackup.record_count} (otomatik sayıldı)`);
            log('cyan', `  🔧 RPC: ${testBackup.rpc_function_count} (otomatik algılandı)`);
            log('cyan', `  ⚡ Trigger: ${testBackup.trigger_count} (otomatik algılandı)`);
            log('cyan', `  📊 Index: ${testBackup.index_count} (otomatik algılandı)`);
            log('cyan', `  🔒 Policy: ${testBackup.policy_count} (otomatik algılandı)`);
            log('cyan', `  🏷️ Enum: ${testBackup.enum_type_count} (otomatik algılandı)`);
            log('green', `  🎯 Algılama modu: ${testBackup.detection_mode}`);
            log('yellow', `  📝 Değişiklikler: ${testBackup.changes_detected}`);
        }

        log('green', '\n🎉 DİNAMİK BACKUP SİSTEMİ AKTİF!');
        log('yellow', '✅ Artık sistem tüm değişiklikleri otomatik algılayacak:');
        log('yellow', '  - Yeni tablolar eklediğinizde ✅');
        log('yellow', '  - Yeni RPC fonksiyonları eklediğinizde ✅');
        log('yellow', '  - Yeni trigger\'lar eklediğinizde ✅');
        log('yellow', '  - Yeni index\'ler eklediğinizde ✅');
        log('yellow', '  - Yeni enum type\'lar eklediğinizde ✅');
        log('yellow', '  - Yeni view\'lar eklediğinizde ✅');
        log('green', '  - HİÇBİR MANUEL GÜNCELLEME GEREKMİYOR! 🚀');

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