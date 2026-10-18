const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchemaQueries() {
    console.log('🔍 Schema sorguları test ediliyor...\n');
    
    // Test 1: Basit trigger sorgusu
    console.log('1. Trigger sorgusu test ediliyor...');
    try {
        const triggerQuery = `
          SELECT 
            t.tgname as trigger_name,
            c.relname as table_name
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public'
            AND NOT t.tgisinternal
          ORDER BY c.relname, t.tgname;
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { query: triggerQuery });
        
        if (error) {
            console.log('❌ Trigger sorgusu hatası:', error.message);
        } else {
            console.log('✅ Trigger sorgusu başarılı:', typeof data, Array.isArray(data) ? data.length + ' kayıt' : 'tek sonuç');
            console.log('Raw data:', data);
            if (Array.isArray(data) && data.length > 0) {
                console.log('İlk trigger:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ Trigger sorgusu exception:', error.message);
    }
    
    // Test 2: Basit index sorgusu  
    console.log('\n2. Index sorgusu test ediliyor...');
    try {
        const indexQuery = `
          SELECT 
            i.relname as index_name,
            t.relname as table_name
          FROM pg_index x
          JOIN pg_class i ON i.oid = x.indexrelid
          JOIN pg_class t ON t.oid = x.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND NOT x.indisprimary
          ORDER BY t.relname, i.relname;
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { query: indexQuery });
        
        if (error) {
            console.log('❌ Index sorgusu hatası:', error.message);
        } else {
            console.log('✅ Index sorgusu başarılı:', typeof data, Array.isArray(data) ? data.length + ' kayıt' : 'tek sonuç');
            if (Array.isArray(data) && data.length > 0) {
                console.log('İlk index:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ Index sorgusu exception:', error.message);
    }
    
    // Test 3: Basit policy sorgusu
    console.log('\n3. Policy sorgusu test ediliyor...');
    try {
        const policyQuery = `
          SELECT 
            pol.polname as policy_name,
            c.relname as table_name
          FROM pg_policy pol
          JOIN pg_class c ON c.oid = pol.polrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
          ORDER BY c.relname, pol.polname;
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { query: policyQuery });
        
        if (error) {
            console.log('❌ Policy sorgusu hatası:', error.message);
        } else {
            console.log('✅ Policy sorgusu başarılı:', typeof data, Array.isArray(data) ? data.length + ' kayıt' : 'tek sonuç');
            if (Array.isArray(data) && data.length > 0) {
                console.log('İlk policy:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ Policy sorgusu exception:', error.message);
    }
    
    // Test 4: pg_tables ile tablo listesi
    console.log('\n4. Tablo listesi test ediliyor...');
    try {
        const tableQuery = `
          SELECT tablename, schemaname 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `;
        
        const { data, error } = await supabase.rpc('exec_sql', { query: tableQuery });
        
        if (error) {
            console.log('❌ Tablo sorgusu hatası:', error.message);
        } else {
            console.log('✅ Tablo sorgusu başarılı:', typeof data, Array.isArray(data) ? data.length + ' kayıt' : 'tek sonuç');
            if (Array.isArray(data) && data.length > 0) {
                console.log('İlk tablo:', data[0]);
                console.log('Tüm tablolar:', data.map(t => t.tablename).join(', '));
            }
        }
    } catch (error) {
        console.log('❌ Tablo sorgusu exception:', error.message);
    }
}

testSchemaQueries().catch(console.error);