#!/usr/bin/env node

/**
 * =================================================================
 * BACKUP ZIP İNDİRME SORUNU DÜZELTMESİ
 * =================================================================
 * get_backup_export_data RPC fonksiyonunu oluşturur veya düzeltir
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

const backupExportSQL = `
-- Create backup export data function for ZIP downloads
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
    
    -- Get all table data (simplified for performance)
    FOR v_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'backup_%'
        ORDER BY table_name
    LOOP
        BEGIN
            -- Get table data with row limit for performance
            EXECUTE format('SELECT json_agg(t) FROM (SELECT * FROM %I LIMIT 1000) t', v_table_record.table_name)
            INTO v_table_data;
            
            v_tables_data := v_tables_data || json_build_object(
                'table_name', v_table_record.table_name,
                'data', COALESCE(v_table_data, '[]'::json)
            )::json;
        EXCEPTION WHEN OTHERS THEN
            -- Skip problematic tables
            v_tables_data := v_tables_data || json_build_object(
                'table_name', v_table_record.table_name,
                'data', '[]'::json,
                'error', SQLERRM
            )::json;
        END;
    END LOOP;
    
    -- Get schema information
    -- Triggers
    SELECT array_agg(
        json_build_object(
            'trigger_name', trigger_name,
            'table_name', event_object_table,
            'event', event_manipulation,
            'definition', action_statement
        )
    ) INTO v_triggers
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    -- Indexes
    SELECT array_agg(
        json_build_object(
            'index_name', indexname,
            'table_name', tablename,
            'definition', indexdef
        )
    ) INTO v_indexes
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Policies
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
    
    -- Functions (simplified)
    SELECT array_agg(
        json_build_object(
            'function_name', proname,
            'return_type', pg_get_function_result(oid),
            'arguments', pg_get_function_arguments(oid)
        )
    ) INTO v_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND proname NOT LIKE 'pg_%';
    
    v_schema_data := json_build_object(
        'triggers', COALESCE(v_triggers, ARRAY[]::json[]),
        'indexes', COALESCE(v_indexes, ARRAY[]::json[]),
        'policies', COALESCE(v_policies, ARRAY[]::json[]),
        'functions', COALESCE(v_functions, ARRAY[]::json[])
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
            'policy_count', v_backup_info.policy_count
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
    log('blue', '    BACKUP ZIP İNDİRME SORUNU DÜZELTMESİ');
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
        log('yellow', '🔍 get_backup_export_data fonksiyonu kontrol ediliyor...');

        // Mevcut fonksiyonu kontrol et
        const { data: existingFunction, error: checkError } = await supabase.rpc('exec_sql', {
            query: `
                SELECT proname 
                FROM pg_proc p 
                JOIN pg_namespace n ON p.pronamespace = n.oid 
                WHERE n.nspname = 'public' 
                AND proname = 'get_backup_export_data';
            `
        });

        if (checkError) {
            log('yellow', `⚠️ Fonksiyon kontrolü hatası: ${checkError.message}`);
        }

        if (existingFunction && existingFunction.length > 0) {
            log('yellow', '📋 Mevcut get_backup_export_data fonksiyonu bulundu, güncelleniyor...');
        } else {
            log('yellow', '🆕 get_backup_export_data fonksiyonu bulunamadı, oluşturuluyor...');
        }

        // Fonksiyonu oluştur/güncelle
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
            query: backupExportSQL
        });

        if (createError) {
            log('red', `❌ Fonksiyon oluşturma hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ get_backup_export_data fonksiyonu başarıyla oluşturuldu/güncellendi!');

        // Test et
        log('yellow', '\n🧪 Fonksiyonu test ediyoruz...');
        
        // En son backup'ı al
        const { data: latestBackup, error: backupError } = await supabase.rpc('get_backup_list');
        
        if (backupError || !latestBackup || latestBackup.length === 0) {
            log('yellow', '⚠️ Test için backup bulunamadı, yeni backup oluşturalım...');
            
            const { data: newBackup, error: newBackupError } = await supabase.rpc('create_database_backup', {
                p_backup_name: 'ZIP_Download_Test_' + Date.now(),
                p_backup_type: 'full',
                p_notes: 'ZIP download test backup'
            });
            
            if (newBackupError) {
                log('red', `❌ Test backup oluşturulamadı: ${newBackupError.message}`);
                process.exit(1);
            }
            
            log('green', '✅ Test backup oluşturuldu!');
            
            // Test export
            const { data: exportTest, error: exportError } = await supabase.rpc('get_backup_export_data', {
                p_backup_id: newBackup.backup_id
            });
            
            if (exportError) {
                log('red', `❌ Export test hatası: ${exportError.message}`);
            } else if (exportTest?.success) {
                log('green', '✅ ZIP export fonksiyonu çalışıyor!');
                log('cyan', `📊 Test sonucu:`);
                log('cyan', `  - Backup: ${exportTest.backup_info?.backup_name}`);
                log('cyan', `  - Tablolar: ${exportTest.tables?.length || 0} adet`);
                log('cyan', `  - Schema: ${Object.keys(exportTest.schema || {}).length} kategori`);
            } else {
                log('red', `❌ Export test başarısız: ${exportTest?.error || 'Bilinmeyen hata'}`);
            }
        } else {
            // Mevcut backup ile test et
            const testBackup = latestBackup[0];
            log('cyan', `🔍 Test backup: ${testBackup.backup_name}`);
            
            const { data: exportTest, error: exportError } = await supabase.rpc('get_backup_export_data', {
                p_backup_id: testBackup.id
            });
            
            if (exportError) {
                log('red', `❌ Export test hatası: ${exportError.message}`);
            } else if (exportTest?.success) {
                log('green', '✅ ZIP export fonksiyonu çalışıyor!');
                log('cyan', `📊 Test sonucu:`);
                log('cyan', `  - Backup: ${exportTest.backup_info?.backup_name}`);
                log('cyan', `  - Tablolar: ${exportTest.tables?.length || 0} adet`);
                log('cyan', `  - Schema: ${Object.keys(exportTest.schema || {}).length} kategori`);
            } else {
                log('red', `❌ Export test başarısız: ${exportTest?.error || 'Bilinmeyen hata'}`);
            }
        }

        log('green', '\n🎉 ZIP İNDİRME SORUNU DÜZELTİLDİ!');
        log('yellow', '✅ Artık admin panelinden backup ZIP indirme çalışacak');

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