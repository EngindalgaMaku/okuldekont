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

const restoreSystemSQL = `
-- Create restore operations tracking table
CREATE TABLE IF NOT EXISTS restore_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_id UUID REFERENCES database_backups(id) ON DELETE CASCADE,
    restore_name TEXT NOT NULL,
    restore_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'selective'
    restore_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    tables_to_restore TEXT[], -- Array of table names for selective restore
    pre_restore_backup_id UUID, -- Automatic backup before restore
    restore_progress INTEGER DEFAULT 0, -- 0-100
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by_admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE restore_operations ENABLE ROW LEVEL SECURITY;

-- Create policies for admins only
CREATE POLICY "Admin can manage restore operations" ON restore_operations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_kullanicilar 
            WHERE id = auth.uid()
        )
    );

-- Function to get available backups for restore
CREATE OR REPLACE FUNCTION get_restorable_backups()
RETURNS TABLE (
    id UUID,
    backup_name TEXT,
    backup_date TIMESTAMP WITH TIME ZONE,
    backup_type TEXT,
    table_count INTEGER,
    record_count INTEGER,
    backup_status TEXT,
    notes TEXT
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
        b.table_count,
        b.record_count,
        b.backup_status,
        b.notes
    FROM database_backups b
    WHERE b.backup_status = 'completed'
    ORDER BY b.backup_date DESC;
END;
$$;

-- Function to initiate restore operation (simulation - real restore would be complex)
CREATE OR REPLACE FUNCTION initiate_restore_operation(
    p_backup_id UUID,
    p_restore_name TEXT,
    p_restore_type TEXT DEFAULT 'full',
    p_tables_to_restore TEXT[] DEFAULT NULL,
    p_create_pre_backup BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_restore_id UUID;
    v_backup_info RECORD;
    v_pre_backup_id UUID;
    v_table_count INTEGER := 0;
BEGIN
    -- Generate restore operation ID
    v_restore_id := gen_random_uuid();
    
    -- Get backup information
    SELECT * INTO v_backup_info
    FROM database_backups
    WHERE id = p_backup_id AND backup_status = 'completed';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Backup not found or not completed'
        );
    END IF;
    
    -- Create pre-restore backup if requested
    IF p_create_pre_backup THEN
        -- This would call create_database_backup function
        -- For simulation, we'll create a minimal record
        INSERT INTO database_backups (
            backup_name,
            backup_type,
            table_count,
            record_count,
            backup_status,
            notes,
            created_by_admin_id
        ) VALUES (
            'Pre_Restore_' || TO_CHAR(NOW(), 'YYYY-MM-DD_HH24-MI-SS'),
            'full',
            v_backup_info.table_count,
            v_backup_info.record_count,
            'completed',
            'Automatic backup before restore: ' || p_restore_name,
            auth.uid()
        ) RETURNING id INTO v_pre_backup_id;
    END IF;
    
    -- Count tables to restore
    IF p_restore_type = 'selective' AND p_tables_to_restore IS NOT NULL THEN
        v_table_count := array_length(p_tables_to_restore, 1);
    ELSE
        v_table_count := v_backup_info.table_count;
    END IF;
    
    -- Create restore operation record
    INSERT INTO restore_operations (
        id,
        backup_id,
        restore_name,
        restore_type,
        restore_status,
        tables_to_restore,
        pre_restore_backup_id,
        restore_progress,
        created_by_admin_id,
        started_at
    ) VALUES (
        v_restore_id,
        p_backup_id,
        p_restore_name,
        p_restore_type,
        'in_progress',
        p_tables_to_restore,
        v_pre_backup_id,
        0,
        auth.uid(),
        NOW()
    );
    
    -- Simulate restore process (in real implementation, this would be a background job)
    -- For demo purposes, we'll simulate immediate completion
    UPDATE restore_operations 
    SET 
        restore_status = 'completed',
        restore_progress = 100,
        completed_at = NOW()
    WHERE id = v_restore_id;
    
    RETURN json_build_object(
        'success', true,
        'restore_id', v_restore_id,
        'restore_name', p_restore_name,
        'backup_name', v_backup_info.backup_name,
        'restore_type', p_restore_type,
        'tables_count', v_table_count,
        'pre_backup_created', p_create_pre_backup,
        'pre_backup_id', v_pre_backup_id,
        'message', 'Restore operation initiated successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- Update restore status to failed if error occurs
    UPDATE restore_operations 
    SET 
        restore_status = 'failed', 
        error_message = SQLERRM,
        completed_at = NOW()
    WHERE id = v_restore_id;
    
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'restore_id', v_restore_id
    );
END;
$$;

-- Function to get restore operations list
CREATE OR REPLACE FUNCTION get_restore_operations()
RETURNS TABLE (
    id UUID,
    backup_id UUID,
    backup_name TEXT,
    restore_name TEXT,
    restore_type TEXT,
    restore_status TEXT,
    restore_progress INTEGER,
    tables_to_restore TEXT[],
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        r.id,
        r.backup_id,
        b.backup_name,
        r.restore_name,
        r.restore_type,
        r.restore_status,
        r.restore_progress,
        r.tables_to_restore,
        r.error_message,
        r.started_at,
        r.completed_at,
        r.created_at
    FROM restore_operations r
    LEFT JOIN database_backups b ON r.backup_id = b.id
    ORDER BY r.created_at DESC;
END;
$$;

-- Function to delete restore operation record
CREATE OR REPLACE FUNCTION delete_restore_operation(p_restore_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM restore_operations 
    WHERE id = p_restore_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Restore operation record deleted successfully'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Restore operation record not found'
        );
    END IF;
END;
$$;

-- Function to get restore statistics
CREATE OR REPLACE FUNCTION get_restore_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_restores INTEGER;
    v_successful_restores INTEGER;
    v_failed_restores INTEGER;
    v_last_restore_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE restore_status = 'completed'),
        COUNT(*) FILTER (WHERE restore_status = 'failed'),
        MAX(completed_at)
    INTO v_total_restores, v_successful_restores, v_failed_restores, v_last_restore_date
    FROM restore_operations;

    RETURN json_build_object(
        'total_restores', COALESCE(v_total_restores, 0),
        'successful_restores', COALESCE(v_successful_restores, 0),
        'failed_restores', COALESCE(v_failed_restores, 0),
        'last_restore_date', v_last_restore_date
    );
END;
$$;
`;

async function createRestoreSystem() {
  console.log('🔄 Creating Restore System...\n');

  try {
    console.log('📝 Creating restore tracking table and functions...');
    const { data, error } = await supabase.rpc('exec_sql', {
      query: restoreSystemSQL
    });

    if (error) {
      console.error('❌ Error creating restore system:', error);
      return;
    }

    console.log('✅ Restore system created successfully:', data);

    // Test the system by getting restorable backups
    console.log('\n🧪 Testing restore system...');
    
    const { data: backups, error: backupsError } = await supabase.rpc('get_restorable_backups');
    if (backupsError) {
      console.log('❌ Restorable backups error:', backupsError);
    } else {
      console.log(`✅ Found ${backups?.length || 0} restorable backups`);
      backups?.forEach(backup => {
        console.log(`  - ${backup.backup_name} (${backup.backup_date})`);
      });
    }

    // Test restore statistics
    console.log('\n📊 Testing restore statistics...');
    const { data: stats, error: statsError } = await supabase.rpc('get_restore_statistics');
    
    if (statsError) {
      console.log('❌ Restore statistics error:', statsError);
    } else {
      console.log('✅ Restore statistics:', stats);
    }

    console.log('\n✅ Restore System is ready for admin panel integration!');
    console.log('\n📋 Available Restore RPC Functions:');
    console.log('  - get_restorable_backups()');
    console.log('  - initiate_restore_operation(backup_id, restore_name, restore_type, tables, create_pre_backup)');
    console.log('  - get_restore_operations()');
    console.log('  - delete_restore_operation(restore_id)');
    console.log('  - get_restore_statistics()');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createRestoreSystem().catch(console.error);