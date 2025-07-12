const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSchemaFunctions() {
    console.log('🐛 Schema fonksiyonları debug ediliyor...\n');
    
    // 1. Trigger test - manual
    console.log('1. Manual trigger sorgusu test ediliyor...');
    try {
        // Basit manuel SQL ile trigger kontrolü
        const triggerSQL = `SELECT count(*) as trigger_count FROM pg_trigger t WHERE t.tgname NOT LIKE 'pg_%' AND NOT t.tgisinternal`;
        const { data, error } = await supabase.rpc('exec_sql', { query: triggerSQL });
        console.log('Trigger count result:', data, error?.message);
    } catch (error) {
        console.log('Manual trigger error:', error.message);
    }
    
    // 2. Schema trigger fonksiyon test
    console.log('\n2. get_schema_triggers fonksiyonu test ediliyor...');
    try {
        const { data, error } = await supabase.rpc('get_schema_triggers');
        console.log('Schema triggers result:');
        console.log('- Data type:', typeof data);
        console.log('- Is array:', Array.isArray(data));
        console.log('- Data:', data);
        console.log('- Error:', error?.message);
    } catch (error) {
        console.log('Schema triggers exception:', error.message);
    }
    
    // 3. Index test  
    console.log('\n3. get_schema_indexes fonksiyonu test ediliyor...');
    try {
        const { data, error } = await supabase.rpc('get_schema_indexes');
        console.log('Schema indexes result:');
        console.log('- Data type:', typeof data);
        console.log('- Is array:', Array.isArray(data));
        console.log('- Data:', data);
        console.log('- Error:', error?.message);
    } catch (error) {
        console.log('Schema indexes exception:', error.message);
    }
    
    // 4. Policy test
    console.log('\n4. get_schema_policies fonksiyonu test ediliyor...');
    try {
        const { data, error } = await supabase.rpc('get_schema_policies');
        console.log('Schema policies result:');
        console.log('- Data type:', typeof data);
        console.log('- Is array:', Array.isArray(data));
        console.log('- Data:', data);
        console.log('- Error:', error?.message);
    } catch (error) {
        console.log('Schema policies exception:', error.message);
    }
    
    // 5. Manual table check
    console.log('\n5. Manuel tablo kontrolü...');
    try {
        const tableSQL = `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
        const { data, error } = await supabase.rpc('exec_sql', { query: tableSQL });
        console.log('Tables result:', data, error?.message);
    } catch (error) {
        console.log('Tables error:', error.message);
    }
    
    // 6. Information schema test  
    console.log('\n6. Information schema erişim test...');
    try {
        const infoSQL = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5`;
        const { data, error } = await supabase.rpc('exec_sql', { query: infoSQL });
        console.log('Info schema result:', data, error?.message);
    } catch (error) {
        console.log('Info schema error:', error.message);
    }
    
    // 7. pg_class erişim test
    console.log('\n7. pg_class erişim test...');
    try {
        const pgClassSQL = `SELECT relname FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') LIMIT 5`;
        const { data, error } = await supabase.rpc('exec_sql', { query: pgClassSQL });
        console.log('pg_class result:', data, error?.message);
    } catch (error) {
        console.log('pg_class error:', error.message);
    }
    
    console.log('\n🔍 Debug tamamlandı!');
}

debugSchemaFunctions().catch(console.error);