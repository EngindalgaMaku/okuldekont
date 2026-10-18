#!/usr/bin/env node

/**
 * =================================================================
 * BACKUP SİLME HATASI DÜZELTİLMESİ
 * =================================================================
 * backup_operations tablosundaki eksik operation_type sütunu düzeltilir
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

const fixBackupDeletionSQL = `
-- First, check if backup_operations table exists, if not create it
CREATE TABLE IF NOT EXISTS backup_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id UUID REFERENCES database_backups(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL DEFAULT 'delete',
    operation_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Add operation_type column if it doesn't exist
ALTER TABLE backup_operations 
ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'delete';

-- Update existing records to have operation_type
UPDATE backup_operations 
SET operation_type = 'delete' 
WHERE operation_type IS NULL;

-- Create or replace the backup deletion function
CREATE OR REPLACE FUNCTION delete_backup_complete(p_backup_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_info RECORD;
    v_result JSON;
    v_operation_id UUID;
    v_files_to_cleanup TEXT[] := '{}';
BEGIN
    -- Get backup info before deletion
    SELECT * INTO v_backup_info
    FROM database_backups
    WHERE id = p_backup_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup not found'
        );
    END IF;
    
    -- Create operation record
    v_operation_id := gen_random_uuid();
    INSERT INTO backup_operations (
        id, backup_id, operation_type, operation_status, notes
    ) VALUES (
        v_operation_id, 
        p_backup_id, 
        'delete', 
        'in_progress',
        'Deleting backup: ' || v_backup_info.backup_name
    );
    
    -- Add typical files that would need cleanup
    v_files_to_cleanup := ARRAY[
        'database_backups/' || v_backup_info.backup_name || '.json',
        'database_backups/' || v_backup_info.backup_name || '.sql',
        'backups/' || v_backup_info.backup_name || '.zip'
    ];
    
    -- Delete the backup record
    DELETE FROM database_backups WHERE id = p_backup_id;
    
    -- Update operation status
    UPDATE backup_operations 
    SET operation_status = 'completed', updated_at = NOW() 
    WHERE id = v_operation_id;
    
    -- Build success result
    v_result := json_build_object(
        'success', true,
        'deleted_backup', json_build_object(
            'id', v_backup_info.id,
            'backup_name', v_backup_info.backup_name,
            'created_at', v_backup_info.created_at,
            'table_count', v_backup_info.table_count,
            'record_count', v_backup_info.record_count
        ),
        'files_to_cleanup', v_files_to_cleanup,
        'operation_id', v_operation_id
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Update operation status to failed
    UPDATE backup_operations 
    SET operation_status = 'failed', 
        notes = 'Error: ' || SQLERRM,
        updated_at = NOW() 
    WHERE id = v_operation_id;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'operation_id', v_operation_id
    );
END;
$$;

-- Create a simpler backup deletion function as fallback
CREATE OR REPLACE FUNCTION delete_backup_simple(p_backup_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backup_info RECORD;
BEGIN
    -- Get backup info before deletion
    SELECT * INTO v_backup_info
    FROM database_backups
    WHERE id = p_backup_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup not found'
        );
    END IF;
    
    -- Delete the backup record
    DELETE FROM database_backups WHERE id = p_backup_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'deleted_backup', json_build_object(
            'id', v_backup_info.id,
            'backup_name', v_backup_info.backup_name,
            'created_at', v_backup_info.created_at,
            'table_count', v_backup_info.table_count,
            'record_count', v_backup_info.record_count
        ),
        'files_to_cleanup', ARRAY[
            'database_backups/' || v_backup_info.backup_name || '.json',
            'database_backups/' || v_backup_info.backup_name || '.sql',
            'backups/' || v_backup_info.backup_name || '.zip'
        ]
    );
    
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
    log('blue', '    BACKUP SİLME HATASI DÜZELTİLMESİ');
    log('blue', '='.repeat(80));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        log('red', '❌ .env.local dosyasında gerekli değişkenler eksik!');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        log('yellow', '🔧 Backup deletion sistemi düzeltiliyor...');

        // Execute the fix
        const { data: result, error: createError } = await supabase.rpc('exec_sql', {
            query: fixBackupDeletionSQL
        });

        if (createError) {
            log('red', `❌ Düzeltme hatası: ${createError.message}`);
            process.exit(1);
        }

        log('green', '✅ backup_operations tablosu oluşturuldu/güncellendi!');
        log('green', '✅ operation_type sütunu eklendi!');
        log('green', '✅ delete_backup_complete fonksiyonu oluşturuldu!');
        log('green', '✅ delete_backup_simple fallback fonksiyonu oluşturuldu!');

        // Test backup list to make sure we have backups to potentially delete
        log('yellow', '\n🧪 Backup listesi kontrol ediliyor...');
        const { data: backupList, error: listError } = await supabase.rpc('get_backup_list');

        if (listError) {
            log('red', `❌ Backup list hatası: ${listError.message}`);
        } else {
            log('green', `✅ ${backupList?.length || 0} backup bulundu`);
            
            if (backupList && backupList.length > 0) {
                // Test with the oldest backup (just test the function, don't actually delete)
                const testBackup = backupList[backupList.length - 1];
                log('cyan', `📝 Test için hazır backup: ${testBackup.backup_name}`);
                log('cyan', `🔧 delete_backup_complete fonksiyonu test edilebilir`);
            }
        }

        log('green', '\n🎉 BACKUP SİLME HATASI DÜZELTİLDİ!');
        log('yellow', '✅ Artık backup silme işlemi çalışmalı!');
        log('cyan', '📝 backup_operations tablosu ve gerekli fonksiyonlar oluşturuldu');

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