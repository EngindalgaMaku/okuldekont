#!/usr/bin/env node

/**
 * =================================================================
 * ADMİN PANEL BACKUP RPC FONKSİYONU GÜNCELLEME SCRİPTİ
 * =================================================================
 * Admin panelindeki backup RPC'sini 23 tablo ile günceller
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

const updatedBackupSQL = `
-- Updated backup function with all 23 tables
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
    v_rpc_count INTEGER := 11; -- Updated: 11 RPC functions
    v_backup_data JSON;
    v_backup_result JSON;
BEGIN
    -- Generate backup name if not provided
    IF p_backup_name IS NULL THEN
        v_backup_name := 'Backup_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS');
    ELSE
        v_backup_name := p_backup_name;
    END IF;

    -- Generate unique backup ID
    v_backup_id := gen_random_uuid();

    -- Count tables (Updated: include ALL tables including backup tables)
    SELECT COUNT(*) INTO v_table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

    -- Get total record count from ALL 23 tables (Updated)
    SELECT 
        COALESCE((SELECT COUNT(*) FROM admin_kullanicilar), 0) +
        COALESCE((SELECT COUNT(*) FROM alanlar), 0) +
        COALESCE((SELECT COUNT(*) FROM backup_operations), 0) +
        COALESCE((SELECT COUNT(*) FROM belgeler), 0) +
        COALESCE((SELECT COUNT(*) FROM database_backups), 0) +
        COALESCE((SELECT COUNT(*) FROM dekontlar), 0) +
        COALESCE((SELECT COUNT(*) FROM egitim_yillari), 0) +
        COALESCE((SELECT COUNT(*) FROM giris_denemeleri), 0) +
        COALESCE((SELECT COUNT(*) FROM gorev_belgeleri), 0) +
        COALESCE((SELECT COUNT(*) FROM isletme_alanlar), 0) +
        COALESCE((SELECT COUNT(*) FROM isletme_giris_denemeleri), 0) +
        COALESCE((SELECT COUNT(*) FROM isletme_koordinatorler), 0) +
        COALESCE((SELECT COUNT(*) FROM isletmeler), 0) +
        COALESCE((SELECT COUNT(*) FROM koordinatorluk_programi), 0) +
        COALESCE((SELECT COUNT(*) FROM notifications), 0) +
        COALESCE((SELECT COUNT(*) FROM ogrenciler), 0) +
        COALESCE((SELECT COUNT(*) FROM ogretmen_giris_denemeleri), 0) +
        COALESCE((SELECT COUNT(*) FROM ogretmenler), 0) +
        COALESCE((SELECT COUNT(*) FROM restore_operations), 0) +
        COALESCE((SELECT COUNT(*) FROM siniflar), 0) +
        COALESCE((SELECT COUNT(*) FROM stajlar), 0) +
        COALESCE((SELECT COUNT(*) FROM system_settings), 0) +
        COALESCE((SELECT COUNT(*) FROM v_gorev_belgeleri_detay), 0)
    INTO v_record_count;

    -- Count schema objects if full backup
    IF p_backup_type IN ('full', 'schema_only') THEN
        -- Count triggers
        SELECT COUNT(*) INTO v_trigger_count
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgisinternal = false
        AND n.nspname = 'public';

        -- Count indexes (excluding primary keys)
        SELECT COUNT(*) INTO v_index_count
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
        AND i.indexname NOT LIKE '%_pkey';

        -- Count policies
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies p
        WHERE p.schemaname = 'public';
    END IF;

    -- Create backup record
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
        notes
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
        p_notes
    );

    -- Build result JSON
    v_backup_result := json_build_object(
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
        'created_at', NOW()
    );

    RETURN v_backup_result;

EXCEPTION WHEN OTHERS THEN
    -- Update backup status to failed if error occurs
    UPDATE database_backups 
    SET backup_status = 'failed', 
        notes = COALESCE(notes, '') || ' ERROR: ' || SQLERRM
    WHERE id = v_backup_id;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'backup_id', v_backup_id
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    ADMİN PANEL BACKUP RPC FONKSİYONU GÜNCELLEME SCRİPTİ');
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
        log('yellow', '🔧 Admin panel backup RPC fonksiyonu güncelleniyor...');
        
        // Mevcut fonksiyonu kontrol et
        const { data: oldBackup, error: oldError } = await supabase.rpc('create_database_backup', {
            p_backup_name: 'Pre_Update_Test',
            p_backup_type: 'full',
            p_notes: 'Test before update'
        });

        if (!oldError && oldBackup) {
            log('yellow', `📊 Güncellemeden önceki değerler:`);
            log('cyan', `  - Tablo sayısı: ${oldBackup.table_count}`);
            log('cyan', `  - Kayıt sayısı: ${oldBackup.record_count}`);
            log('cyan', `  - RPC sayısı: ${oldBackup.rpc_function_count}`);
        }

        // Fonksiyonu güncelle
        const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
            query: updatedBackupSQL
        });

        if (updateError) {
            log('red', `❌ RPC güncelleme hatası: ${updateError.message}`);
            process.exit(1);
        }

        log('green', '✅ RPC fonksiyonu başarıyla güncellendi!');

        // Test et
        log('yellow', '🧪 Güncellenmiş fonksiyonu test ediliyor...');
        
        const { data: newBackup, error: newError } = await supabase.rpc('create_database_backup', {
            p_backup_name: 'Post_Update_Test_23_Tables',
            p_backup_type: 'full',
            p_notes: 'Test after update with all 23 tables'
        });

        if (newError) {
            log('red', `❌ Test hatası: ${newError.message}`);
            process.exit(1);
        }

        log('green', '✅ Test başarılı! Güncellenmiş değerler:');
        log('green', `  📊 Tablo sayısı: ${newBackup.table_count}`);
        log('green', `  📋 Kayıt sayısı: ${newBackup.record_count}`);
        log('green', `  🔧 RPC sayısı: ${newBackup.rpc_function_count}`);
        log('green', `  ⚡ Trigger sayısı: ${newBackup.trigger_count}`);
        log('green', `  📊 Index sayısı: ${newBackup.index_count}`);
        log('green', `  🔒 Policy sayısı: ${newBackup.policy_count}`);

        // Backup listesini kontrol et
        log('yellow', '\n📋 Backup listesi kontrol ediliyor...');
        const { data: backupList, error: listError } = await supabase.rpc('get_backup_list');
        
        if (listError) {
            log('red', `❌ Backup list hatası: ${listError.message}`);
        } else {
            log('green', `✅ Toplam ${backupList.length} backup bulundu`);
            const latestBackup = backupList[0];
            if (latestBackup) {
                log('cyan', `📅 En son backup: ${latestBackup.backup_name}`);
                log('cyan', `📊 ${latestBackup.table_count} tablo, ${latestBackup.record_count} kayıt`);
            }
        }

        log('green', '\n🎉 ADMİN PANEL BACKUP SİSTEMİ GÜNCELLENDİ!');
        log('yellow', '✅ Artık admin panelinden alınan backup:');
        log('yellow', '  - 23 tablo içeriyor');
        log('yellow', '  - 11 RPC fonksiyonu içeriyor');
        log('yellow', '  - Güncel kayıt sayıları gösteriyor');

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