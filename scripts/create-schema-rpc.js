const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSchemaFunctions() {
    console.log('🔧 Schema RPC fonksiyonları oluşturuluyor...\n');
    
    // 1. Triggers fonksiyonu
    console.log('1. get_schema_triggers fonksiyonu oluşturuluyor...');
    const triggerFunction = `
CREATE OR REPLACE FUNCTION get_schema_triggers()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'trigger_name', t.tgname,
            'table_name', c.relname,
            'function_name', p.proname,
            'timing', CASE t.tgtype & 66
                WHEN 2 THEN 'BEFORE'
                WHEN 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END,
            'events', CASE t.tgtype & 28
                WHEN 4 THEN 'INSERT'
                WHEN 8 THEN 'DELETE'
                WHEN 16 THEN 'UPDATE'
                WHEN 12 THEN 'INSERT, DELETE'
                WHEN 20 THEN 'INSERT, UPDATE'
                WHEN 24 THEN 'DELETE, UPDATE'
                WHEN 28 THEN 'INSERT, DELETE, UPDATE'
            END
        )
    ) INTO result
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[]'::json;
END;
$$;
    `;
    
    try {
        const { error } = await supabase.rpc('exec_sql', { query: triggerFunction });
        if (error) {
            console.log('❌ Trigger fonksiyonu hatası:', error.message);
        } else {
            console.log('✅ get_schema_triggers fonksiyonu oluşturuldu');
        }
    } catch (error) {
        console.log('❌ Trigger fonksiyonu exception:', error.message);
    }
    
    // 2. Indexes fonksiyonu
    console.log('\n2. get_schema_indexes fonksiyonu oluşturuluyor...');
    const indexFunction = `
CREATE OR REPLACE FUNCTION get_schema_indexes()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'index_name', i.relname,
            'table_name', t.relname,
            'is_unique', x.indisunique,
            'is_primary', x.indisprimary
        )
    ) INTO result
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND i.relname NOT LIKE 'pg_%'
    ORDER BY t.relname, i.relname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[]'::json;
END;
$$;
    `;
    
    try {
        const { error } = await supabase.rpc('exec_sql', { query: indexFunction });
        if (error) {
            console.log('❌ Index fonksiyonu hatası:', error.message);
        } else {
            console.log('✅ get_schema_indexes fonksiyonu oluşturuldu');
        }
    } catch (error) {
        console.log('❌ Index fonksiyonu exception:', error.message);
    }
    
    // 3. Policies fonksiyonu
    console.log('\n3. get_schema_policies fonksiyonu oluşturuluyor...');
    const policyFunction = `
CREATE OR REPLACE FUNCTION get_schema_policies()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'policy_name', pol.polname,
            'table_name', c.relname,
            'command', pol.polcmd
        )
    ) INTO result
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.relname, pol.polname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[]'::json;
END;
$$;
    `;
    
    try {
        const { error } = await supabase.rpc('exec_sql', { query: policyFunction });
        if (error) {
            console.log('❌ Policy fonksiyonu hatası:', error.message);
        } else {
            console.log('✅ get_schema_policies fonksiyonu oluşturuldu');
        }
    } catch (error) {
        console.log('❌ Policy fonksiyonu exception:', error.message);
    }
    
    // 4. Test fonksiyonları
    console.log('\n🔍 Schema fonksiyonları test ediliyor...\n');
    
    // Test triggers
    try {
        const { data: triggers, error: triggerError } = await supabase.rpc('get_schema_triggers');
        if (triggerError) {
            console.log('❌ Trigger test hatası:', triggerError.message);
        } else {
            console.log(`✅ Triggers test başarılı: ${Array.isArray(triggers) ? triggers.length : 'object'} sonuç`);
            if (Array.isArray(triggers) && triggers.length > 0) {
                console.log('İlk trigger:', triggers[0]);
            }
        }
    } catch (error) {
        console.log('❌ Trigger test exception:', error.message);
    }
    
    // Test indexes
    try {
        const { data: indexes, error: indexError } = await supabase.rpc('get_schema_indexes');
        if (indexError) {
            console.log('❌ Index test hatası:', indexError.message);
        } else {
            console.log(`✅ Indexes test başarılı: ${Array.isArray(indexes) ? indexes.length : 'object'} sonuç`);
            if (Array.isArray(indexes) && indexes.length > 0) {
                console.log('İlk index:', indexes[0]);
            }
        }
    } catch (error) {
        console.log('❌ Index test exception:', error.message);
    }
    
    // Test policies
    try {
        const { data: policies, error: policyError } = await supabase.rpc('get_schema_policies');
        if (policyError) {
            console.log('❌ Policy test hatası:', policyError.message);
        } else {
            console.log(`✅ Policies test başarılı: ${Array.isArray(policies) ? policies.length : 'object'} sonuç`);
            if (Array.isArray(policies) && policies.length > 0) {
                console.log('İlk policy:', policies[0]);
            }
        }
    } catch (error) {
        console.log('❌ Policy test exception:', error.message);
    }
    
    console.log('\n🎉 Schema fonksiyonları oluşturma ve test işlemi tamamlandı!');
}

createSchemaFunctions().catch(console.error);