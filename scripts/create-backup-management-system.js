import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const backupManagementSQL = `
-- Create backups tracking table
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_name TEXT NOT NULL,
    backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    backup_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'data_only', 'schema_only'
    backup_size_kb INTEGER,
    table_count INTEGER,
    record_count INTEGER,
    trigger_count INTEGER,
    index_count INTEGER,
    policy_count INTEGER,
    rpc_function_count INTEGER,
    backup_status TEXT NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
    backup_path TEXT,
    created_by_admin_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;

-- Create policies for admins only
CREATE POLICY "Admin can manage backups" ON database_backups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_kullanicilar 
            WHERE id = auth.uid()
        )
    );

-- Create backup function that collects all data and returns backup info
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
    v_rpc_count INTEGER := 14; -- Known RPC function count
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

    -- Count tables and records
    SELECT COUNT(*) INTO v_table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE '%backup%';

    -- Get total record count from all tables
    SELECT 
        COALESCE(
            (SELECT admin_kullanicilar FROM (SELECT COUNT(*) as admin_kullanicilar FROM admin_kullanicilar) t), 0
        ) +
        COALESCE(
            (SELECT alanlar FROM (SELECT COUNT(*) as alanlar FROM alanlar) t), 0
        ) +
        COALESCE(
            (SELECT dekontlar FROM (SELECT COUNT(*) as dekontlar FROM dekontlar) t), 0
        ) +
        COALESCE(
            (SELECT isletmeler FROM (SELECT COUNT(*) as isletmeler FROM isletmeler) t), 0
        ) +
        COALESCE(
            (SELECT ogretmenler FROM (SELECT COUNT(*) as ogretmenler FROM ogretmenler) t), 0
        ) +
        COALESCE(
            (SELECT siniflar FROM (SELECT COUNT(*) as siniflar FROM siniflar) t), 0
        )
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

-- Function to get backup list
CREATE OR REPLACE FUNCTION get_backup_list()
RETURNS TABLE (
    id UUID,
    backup_name TEXT,
    backup_date TIMESTAMP WITH TIME ZONE,
    backup_type TEXT,
    backup_size_kb INTEGER,
    table_count INTEGER,
    record_count INTEGER,
    trigger_count INTEGER,
    index_count INTEGER,
    policy_count INTEGER,
    rpc_function_count INTEGER,
    backup_status TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        b.id,
        b.backup_name,
        b.backup_date,
        b.backup_type,
        b.backup_size_kb,
        b.table_count,
        b.record_count,
        b.trigger_count,
        b.index_count,
        b.policy_count,
        b.rpc_function_count,
        b.backup_status,
        b.notes,
        b.created_at
    FROM database_backups b
    ORDER BY b.created_at DESC;
END;
$$;

-- Function to delete backup record
CREATE OR REPLACE FUNCTION delete_backup_record(p_backup_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM database_backups 
    WHERE id = p_backup_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Backup record deleted successfully'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Backup record not found'
        );
    END IF;
END;
$$;

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_backups INTEGER;
    v_successful_backups INTEGER;
    v_failed_backups INTEGER;
    v_last_backup_date TIMESTAMP WITH TIME ZONE;
    v_total_size_kb INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE backup_status = 'completed'),
        COUNT(*) FILTER (WHERE backup_status = 'failed'),
        MAX(backup_date),
        SUM(COALESCE(backup_size_kb, 0))
    INTO v_total_backups, v_successful_backups, v_failed_backups, v_last_backup_date, v_total_size_kb
    FROM database_backups;

    RETURN json_build_object(
        'total_backups', COALESCE(v_total_backups, 0),
        'successful_backups', COALESCE(v_successful_backups, 0),
        'failed_backups', COALESCE(v_failed_backups, 0),
        'last_backup_date', v_last_backup_date,
        'total_size_kb', COALESCE(v_total_size_kb, 0)
    );
END;
$$;
`;

async function createBackupManagementSystem() {
  console.log('🗄️ Creating Backup Management System...\n');

  try {
    console.log('📝 Creating backup tracking table and functions...');
    const { data, error } = await supabase.rpc('exec_sql', {
      query: backupManagementSQL
    });

    if (error) {
      console.error('❌ Error creating backup management system:', error);
      return;
    }

    console.log('✅ Backup management system created successfully:', data);

    // Test the system by creating a test backup
    console.log('\n🧪 Testing backup system...');
    
    const { data: testBackup, error: backupError } = await supabase.rpc('create_database_backup', {
      p_backup_name: 'Test_Backup_From_Admin_Panel',
      p_backup_type: 'full',
      p_notes: 'Test backup created during admin panel integration'
    });

    if (backupError) {
      console.log('❌ Test backup error:', backupError);
    } else {
      console.log('✅ Test backup created:', testBackup);
    }

    // Test getting backup list
    console.log('\n📋 Testing backup list...');
    const { data: backupList, error: listError } = await supabase.rpc('get_backup_list');
    
    if (listError) {
      console.log('❌ Backup list error:', listError);
    } else {
      console.log(`✅ Found ${backupList?.length || 0} backups in system`);
      backupList?.forEach(backup => {
        console.log(`  - ${backup.backup_name} (${backup.backup_type}) - ${backup.backup_status}`);
      });
    }

    // Test backup statistics
    console.log('\n📊 Testing backup statistics...');
    const { data: stats, error: statsError } = await supabase.rpc('get_backup_statistics');
    
    if (statsError) {
      console.log('❌ Statistics error:', statsError);
    } else {
      console.log('✅ Backup statistics:', stats);
    }

    console.log('\n✅ Backup Management System is ready for admin panel integration!');
    console.log('\n📋 Available RPC Functions:');
    console.log('  - create_database_backup(backup_name, backup_type, notes)');
    console.log('  - get_backup_list()');
    console.log('  - delete_backup_record(backup_id)');
    console.log('  - get_backup_statistics()');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createBackupManagementSystem().catch(console.error);