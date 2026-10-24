const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ve Service Role Key gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBackupDownloadSystem() {
  console.log('🔧 Backup Download Sistemi oluşturuluyor...')

  // RPC function to generate backup export data
  const downloadFunction = `
    CREATE OR REPLACE FUNCTION get_backup_export_data(p_backup_id UUID)
    RETURNS JSON AS $$
    DECLARE
        backup_record record;
        result JSON;
        tables_data JSON;
        triggers_data JSON;
        indexes_data JSON;
        policies_data JSON;
        functions_data JSON;
    BEGIN
        -- Get backup information
        SELECT * INTO backup_record
        FROM backup_operations
        WHERE id = p_backup_id AND backup_status = 'completed';
        
        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Backup not found or not completed'
            );
        END IF;

        -- Get all table data using a single query with json_agg
        WITH table_data_cte AS (
            SELECT
                t.table_name,
                CASE
                    WHEN t.table_name = 'admin_kullanicilar' THEN
                        (SELECT json_agg(json_build_object('id', id, 'email', email, 'created_at', created_at)) FROM admin_kullanicilar)
                    WHEN t.table_name = 'alanlar' THEN
                        (SELECT json_agg(row_to_json(alanlar)) FROM alanlar)
                    WHEN t.table_name = 'ogrenciler' THEN
                        (SELECT json_agg(row_to_json(ogrenciler)) FROM ogrenciler)
                    WHEN t.table_name = 'ogretmenler' THEN
                        (SELECT json_agg(row_to_json(ogretmenler)) FROM ogretmenler)
                    WHEN t.table_name = 'isletmeler' THEN
                        (SELECT json_agg(row_to_json(isletmeler)) FROM isletmeler)
                    WHEN t.table_name = 'dekontlar' THEN
                        (SELECT json_agg(row_to_json(dekontlar)) FROM dekontlar)
                    WHEN t.table_name = 'belgeler' THEN
                        (SELECT json_agg(row_to_json(belgeler)) FROM belgeler)
                    WHEN t.table_name = 'system_settings' THEN
                        (SELECT json_agg(row_to_json(system_settings)) FROM system_settings)
                    WHEN t.table_name = 'backup_operations' THEN
                        (SELECT json_agg(json_build_object('id', id, 'backup_name', backup_name, 'backup_date', backup_date, 'backup_status', backup_status)) FROM backup_operations)
                    ELSE '[]'::JSON
                END as table_data
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
        )
        SELECT json_agg(
            json_build_object(
                'table_name', table_name,
                'data', COALESCE(table_data, '[]'::JSON)
            )
        ) INTO tables_data
        FROM table_data_cte;

        -- Get schema objects
        SELECT json_agg(
            json_build_object(
                'trigger_name', trigger_name,
                'table_name', event_object_table,
                'event', event_manipulation,
                'timing', action_timing
            )
        ) INTO triggers_data
        FROM information_schema.triggers
        WHERE trigger_schema = 'public';

        SELECT json_agg(
            json_build_object(
                'index_name', indexname,
                'table_name', tablename,
                'definition', indexdef
            )
        ) INTO indexes_data
        FROM pg_indexes
        WHERE schemaname = 'public';

        SELECT json_agg(
            json_build_object(
                'policy_name', policyname,
                'table_name', tablename,
                'command', cmd,
                'permissive', permissive,
                'roles', roles
            )
        ) INTO policies_data
        FROM pg_policies
        WHERE schemaname = 'public';

        -- Get detailed function information including parameters and definitions
        WITH function_details AS (
            SELECT
                r.routine_name,
                r.data_type as return_type,
                r.external_language as language,
                r.security_type,
                r.is_deterministic,
                COALESCE(r.routine_comment, '') as description,
                pg_get_functiondef(p.oid) as function_definition,
                -- Get parameters
                (
                    SELECT json_agg(
                        json_build_object(
                            'parameter_name', COALESCE(parameter_name, ''),
                            'data_type', data_type,
                            'parameter_mode', parameter_mode,
                            'ordinal_position', ordinal_position
                        ) ORDER BY ordinal_position
                    )
                    FROM information_schema.parameters
                    WHERE specific_name = r.specific_name
                    AND parameter_mode IN ('IN', 'OUT', 'INOUT')
                ) as parameters
            FROM information_schema.routines r
            LEFT JOIN pg_proc p ON p.proname = r.routine_name
            WHERE r.routine_schema = 'public'
            AND r.routine_type = 'FUNCTION'
        )
        SELECT json_agg(
            json_build_object(
                'function_name', routine_name,
                'return_type', return_type,
                'language', language,
                'security_type', security_type,
                'is_deterministic', is_deterministic,
                'description', description,
                'parameters', COALESCE(parameters, '[]'::json),
                'function_definition', function_definition
            )
        ) INTO functions_data
        FROM function_details;

        -- Build final result
        result := json_build_object(
            'success', true,
            'backup_info', json_build_object(
                'id', backup_record.id,
                'backup_name', backup_record.backup_name,
                'backup_date', backup_record.backup_date,
                'backup_type', backup_record.backup_type,
                'notes', backup_record.notes,
                'table_count', backup_record.table_count,
                'record_count', backup_record.record_count,
                'trigger_count', backup_record.trigger_count,
                'index_count', backup_record.index_count,
                'policy_count', backup_record.policy_count
            ),
            'export_date', NOW(),
            'tables', COALESCE(tables_data, '[]'::JSON),
            'schema', json_build_object(
                'triggers', COALESCE(triggers_data, '[]'::JSON),
                'indexes', COALESCE(indexes_data, '[]'::JSON),
                'policies', COALESCE(policies_data, '[]'::JSON),
                'functions', COALESCE(functions_data, '[]'::JSON)
            )
        );

        RETURN result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  try {
    console.log('📝 Backup download RPC fonksiyonu oluşturuluyor...')
    const { error: downloadError } = await supabase.rpc('exec_sql', {
      query: downloadFunction
    })

    if (downloadError) {
      throw downloadError
    }

    console.log('✅ Backup download sistemi başarıyla oluşturuldu!')
    console.log('\n📋 Oluşturulan RPC Fonksiyonlar:')
    console.log('   • get_backup_export_data(p_backup_id) - Backup verilerini JSON olarak export eder')

  } catch (error) {
    console.error('❌ Backup download sistemi oluşturulurken hata:', error)
    throw error
  }
}

// Eğer script doğrudan çalıştırılıyorsa
if (require.main === module) {
  createBackupDownloadSystem()
    .then(() => {
      console.log('\n🎉 Backup Download Sistemi kurulumu tamamlandı!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Kurulum başarısız:', error)
      process.exit(1)
    })
}

module.exports = { createBackupDownloadSystem }