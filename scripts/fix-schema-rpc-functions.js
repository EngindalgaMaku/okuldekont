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

const fixedSchemaFunctions = `
-- Drop existing functions
DROP FUNCTION IF EXISTS get_schema_tables();
DROP FUNCTION IF EXISTS get_schema_triggers();
DROP FUNCTION IF EXISTS get_schema_indexes();
DROP FUNCTION IF EXISTS get_schema_policies();
DROP FUNCTION IF EXISTS get_schema_functions();

-- Create working tables function
CREATE OR REPLACE FUNCTION get_schema_tables()
RETURNS TABLE (
    table_name text,
    table_type text,
    row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tbl record;
    row_cnt bigint;
BEGIN
    FOR tbl IN
        SELECT t.table_name::text as tname
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', tbl.tname) INTO row_cnt;
        EXCEPTION
            WHEN OTHERS THEN
                row_cnt := 0;
        END;
        
        table_name := tbl.tname;
        table_type := 'BASE TABLE';
        row_count := row_cnt;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;

-- Create working trigger function
CREATE OR REPLACE FUNCTION get_schema_triggers()
RETURNS TABLE (
    trigger_name text,
    table_name text,
    function_name text,
    timing text,
    event text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        t.tgname::text as trigger_name,
        c.relname::text as table_name,
        p.proname::text as function_name,
        CASE 
            WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
            WHEN t.tgtype & 4 = 4 THEN 'AFTER'
            ELSE 'INSTEAD OF'
        END::text as timing,
        CASE 
            WHEN t.tgtype & 4 = 4 THEN 'INSERT'
            WHEN t.tgtype & 8 = 8 THEN 'DELETE'
            WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
            ELSE 'UNKNOWN'
        END::text as event
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgisinternal = false
    AND n.nspname = 'public'
    ORDER BY c.relname, t.tgname;
END;
$$;

-- Create working indexes function
CREATE OR REPLACE FUNCTION get_schema_indexes()
RETURNS TABLE (
    index_name text,
    table_name text,
    index_definition text,
    is_unique boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        i.indexname::text as index_name,
        i.tablename::text as table_name,
        i.indexdef::text as index_definition,
        idx.indisunique as is_unique
    FROM pg_indexes i
    JOIN pg_class c ON i.tablename = c.relname
    JOIN pg_index idx ON c.oid = idx.indrelid
    JOIN pg_class ic ON idx.indexrelid = ic.oid
    WHERE i.schemaname = 'public'
    AND i.indexname = ic.relname
    AND i.indexname NOT LIKE '%_pkey'
    ORDER BY i.tablename, i.indexname;
END;
$$;

-- Create working policies function
CREATE OR REPLACE FUNCTION get_schema_policies()
RETURNS TABLE (
    schema_name text,
    table_name text,
    policy_name text,
    permissive text,
    roles text[],
    cmd text,
    qual text,
    with_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        p.schemaname::text as schema_name,
        p.tablename::text as table_name,
        p.policyname::text as policy_name,
        p.permissive::text as permissive,
        p.roles::text[] as roles,
        p.cmd::text as cmd,
        p.qual::text as qual,
        p.with_check::text as with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
END;
$$;

-- Create working functions function
CREATE OR REPLACE FUNCTION get_schema_functions()
RETURNS TABLE (
    function_name text,
    return_type text,
    argument_types text,
    function_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.routine_name::text as function_name,
        r.data_type::text as return_type,
        COALESCE(
            (SELECT string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
             FROM information_schema.parameters p
             WHERE p.specific_name = r.specific_name),
            ''
        )::text as argument_types,
        r.routine_type::text as function_type
    FROM information_schema.routines r
    WHERE r.routine_schema = 'public'
    AND r.routine_type = 'FUNCTION'
    ORDER BY r.routine_name;
END;
$$;
`;

async function fixSchemaRPCFunctions() {
  console.log('🔧 Fixing Schema RPC Functions...\n');

  try {
    console.log('📝 Creating fixed schema detection functions...');
    const { data, error } = await supabase.rpc('exec_sql', {
      query: fixedSchemaFunctions
    });

    if (error) {
      console.error('❌ Error creating functions:', error);
      return;
    }

    console.log('✅ Functions created successfully:', data);

    // Test the fixed functions
    console.log('\n🧪 Testing fixed functions...\n');

    // Test tables
    console.log('=== Testing Fixed get_schema_tables ===');
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');
    if (tablesError) {
      console.log('❌ Tables function error:', tablesError);
    } else {
      console.log(`✅ Found ${tables?.length || 0} tables:`);
      tables?.slice(0, 5).forEach(table => {
        console.log(`  - ${table.table_name} (${table.row_count} rows)`);
      });
      if (tables?.length > 5) {
        console.log(`  ... and ${tables.length - 5} more tables`);
      }
    }

    // Test triggers
    console.log('\n=== Testing Fixed get_schema_triggers ===');
    const { data: triggers, error: triggerError } = await supabase.rpc('get_schema_triggers');
    if (triggerError) {
      console.log('❌ Trigger function error:', triggerError);
    } else {
      console.log(`✅ Found ${triggers?.length || 0} triggers:`);
      triggers?.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} on ${trigger.table_name} (${trigger.timing} ${trigger.event})`);
      });
    }

    // Test indexes
    console.log('\n=== Testing Fixed get_schema_indexes ===');
    const { data: indexes, error: indexError } = await supabase.rpc('get_schema_indexes');
    if (indexError) {
      console.log('❌ Index function error:', indexError);
    } else {
      console.log(`✅ Found ${indexes?.length || 0} indexes:`);
      indexes?.forEach(index => {
        console.log(`  - ${index.index_name} on ${index.table_name}`);
      });
    }

    // Test policies
    console.log('\n=== Testing Fixed get_schema_policies ===');
    const { data: policies, error: policyError } = await supabase.rpc('get_schema_policies');
    if (policyError) {
      console.log('❌ Policy function error:', policyError);
    } else {
      console.log(`✅ Found ${policies?.length || 0} policies:`);
      policies?.slice(0, 5).forEach(policy => {
        console.log(`  - ${policy.policy_name} on ${policy.table_name} (${policy.cmd})`);
      });
      if (policies?.length > 5) {
        console.log(`  ... and ${policies.length - 5} more policies`);
      }
    }

    // Test functions
    console.log('\n=== Testing Fixed get_schema_functions ===');
    const { data: functions, error: functionsError } = await supabase.rpc('get_schema_functions');
    if (functionsError) {
      console.log('❌ Functions function error:', functionsError);
    } else {
      console.log(`✅ Found ${functions?.length || 0} functions:`);
      functions?.slice(0, 5).forEach(func => {
        console.log(`  - ${func.function_name} (${func.function_type})`);
      });
      if (functions?.length > 5) {
        console.log(`  ... and ${functions.length - 5} more functions`);
      }
    }

    console.log('\n✅ Schema RPC functions have been fixed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSchemaRPCFunctions().catch(console.error);