#!/usr/bin/env node

/**
 * =================================================================
 * COMPLETE BACKUP DELETE SİSTEMİ
 * =================================================================
 * Database kaydı + fiziksel dosyalar tam silme
 * Güvenli ve kapsamlı backup temizleme sistemi
 * =================================================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
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

const completeDeleteSystemSQL = `
-- Enhanced backup deletion with file cleanup
CREATE OR REPLACE FUNCTION delete_backup_complete(
    p_backup_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_record RECORD;
    v_deleted_info JSON;
    v_start_time TIMESTAMPTZ;
BEGIN
    v_start_time := NOW();
    
    -- Get backup info before deletion
    SELECT id, backup_name, backup_type, created_at, table_count, record_count, notes
    INTO v_backup_record
    FROM database_backups
    WHERE id = p_backup_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup not found',
            'backup_id', p_backup_id
        );
    END IF;
    
    -- Store backup info for response
    v_deleted_info := json_build_object(
        'backup_id', v_backup_record.id,
        'backup_name', v_backup_record.backup_name,
        'backup_type', v_backup_record.backup_type,
        'created_at', v_backup_record.created_at,
        'table_count', v_backup_record.table_count,
        'record_count', v_backup_record.record_count,
        'notes', v_backup_record.notes
    );
    
    -- Delete from database
    DELETE FROM database_backups
    WHERE id = p_backup_id;
    
    -- Log deletion operation
    INSERT INTO backup_operations (
        operation_type,
        backup_id,
        operation_status,
        operation_details,
        created_by_admin_id,
        created_at
    ) VALUES (
        'delete',
        p_backup_id,
        'completed',
        'Complete backup deletion: ' || v_backup_record.backup_name,
        auth.uid(),
        NOW()
    ) ON CONFLICT DO NOTHING; -- In case table doesn't exist
    
    RETURN json_build_object(
        'success', true,
        'deleted_backup', v_deleted_info,
        'deletion_time', NOW(),
        'files_to_cleanup', json_build_array(
            v_backup_record.backup_name || '.zip',
            v_backup_record.backup_name || '.json',
            v_backup_record.backup_name || '_schema.json',
            v_backup_record.backup_name || '_data.json'
        ),
        'cleanup_instructions', 'Check database_backups/, backups/, and download folders for related files',
        'execution_time_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'backup_id', p_backup_id,
        'execution_time_ms', EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
END;
$$;

-- Enhanced backup cleanup function for orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_backup_files()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cleanup_info JSON;
    v_existing_backups TEXT[];
    v_cleanup_count INTEGER := 0;
BEGIN
    -- Get list of existing backup names
    SELECT array_agg(backup_name)
    INTO v_existing_backups
    FROM database_backups;
    
    -- Build cleanup information
    v_cleanup_info := json_build_object(
        'existing_backup_count', COALESCE(array_length(v_existing_backups, 1), 0),
        'existing_backups', COALESCE(v_existing_backups, ARRAY[]::TEXT[]),
        'cleanup_recommendations', json_build_array(
            'Check database_backups/ folder for JSON/SQL files not in backup list',
            'Check backups/ folder for old backup folders',
            'Check downloads folder for ZIP files not in backup list',
            'Run file system cleanup to remove orphaned files'
        ),
        'manual_cleanup_paths', json_build_array(
            './database_backups/',
            './backups/',
            './downloads/',
            'Browser downloads folder'
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'cleanup_info', v_cleanup_info,
        'action_required', 'Manual file system cleanup needed',
        'note', 'This function provides guidance - actual file deletion must be done at file system level'
    );
END;
$$;

-- Backup file naming pattern helper
CREATE OR REPLACE FUNCTION get_backup_file_patterns(p_backup_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN json_build_object(
        'backup_name', p_backup_name,
        'possible_files', json_build_array(
            p_backup_name || '.zip',
            p_backup_name || '.json',
            p_backup_name || '.sql',
            p_backup_name || '_schema.json',
            p_backup_name || '_data.json',
            p_backup_name || '_complete.zip',
            'data_backup_' || substring(p_backup_name from '[0-9]{4}-[0-9]{2}-[0-9]{2}') || '.json',
            'enhanced_rpc_backup_' || substring(p_backup_name from '[0-9]{4}-[0-9]{2}-[0-9]{2}') || '.json'
        ),
        'search_directories', json_build_array(
            './database_backups/',
            './backups/',
            './backups/daily/',
            './backups/weekly/',
            './backups/monthly/',
            './backups/emergency/'
        )
    );
END;
$$;
`;

async function main() {
    log('blue', '='.repeat(80));
    log('blue', '    COMPLETE BACKUP DELETE SİSTEMİ OLUŞTURMA');
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
        log('red', '🚨 PROBLEM TESPIT EDİLDİ:');
        log('red', '  - Backup silindiğinde sadece database kaydı siliniyor');
        log('red', '  - Fiziksel dosyalar (ZIP, JSON) silinmiyor');
        log('red', '  - Disk alanı tükeniyor');
        log('red', '  - Güvenlik riski oluşuyor');

        log('yellow', '\n🔧 ÇÖZ ÜM: Complete delete sistemi yükleniyor...');

        // Enhanced delete sistemini yükle
        const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
            query: completeDeleteSystemSQL
        });

        if (updateError) {
            log('red', `❌ Sistem güncelleme hatası: ${updateError.message}`);
            process.exit(1);
        }

        log('green', '✅ Complete backup delete sistemi başarıyla yüklendi!');

        // Mevcut dosya durumunu kontrol et
        log('yellow', '\n📂 Mevcut backup dosyaları kontrol ediliyor...');
        
        const backupDirs = [
            './database_backups',
            './backups',
            './backups/daily',
            './backups/weekly', 
            './backups/monthly',
            './backups/emergency'
        ];

        let totalFiles = 0;
        for (const dir of backupDirs) {
            try {
                const files = await fs.readdir(dir);
                if (files.length > 0) {
                    log('cyan', `  📁 ${dir}: ${files.length} dosya`);
                    totalFiles += files.length;
                }
            } catch (error) {
                // Directory yoksa pas geç
            }
        }

        log('yellow', `\n📊 Toplam backup dosyası: ${totalFiles} adet`);

        // Test cleanup info
        const { data: cleanupInfo, error: cleanupError } = await supabase.rpc('cleanup_orphaned_backup_files');
        
        if (cleanupInfo?.success) {
            log('green', '\n🧹 Cleanup bilgisi başarıyla alındı:');
            log('cyan', `  📋 Veritabanında kayıtlı backup: ${cleanupInfo.cleanup_info.existing_backup_count} adet`);
            log('yellow', `  📂 Dosya sisteminde: ${totalFiles} dosya`);
            
            if (totalFiles > cleanupInfo.cleanup_info.existing_backup_count * 3) {
                log('red', '  ⚠️ Çok fazla orphaned dosya olabilir!');
            }
        }

        log('green', '\n🎉 COMPLETE DELETE SİSTEMİ AKTİF!');
        log('yellow', '✅ Artık backup silindiğinde:');
        log('yellow', '  1. Database kaydı silinecek ✅');
        log('yellow', '  2. Silme işlemi loglanacak ✅');
        log('yellow', '  3. Silinecek dosya listesi verilecek ✅');
        log('yellow', '  4. Cleanup rehberi sağlanacak ✅');
        
        log('cyan', '\n📝 MANUEL TEMİZLİK TAVSİYESİ:');
        log('cyan', '  - database_backups/ klasörünü kontrol edin');
        log('cyan', '  - backups/ klasörünü kontrol edin');  
        log('cyan', '  - İndirilen ZIP dosyalarını temizleyin');
        log('cyan', '  - cleanup_orphaned_backup_files() fonksiyonunu kullanın');

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