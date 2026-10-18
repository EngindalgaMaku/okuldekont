const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInformationSchema() {
    console.log('🔍 Information Schema test ediliyor...\n');
    
    // Test 1: information_schema kullanarak trigger'ları al
    console.log('1. Information Schema ile trigger\'ları alma...');
    try {
        const { data, error } = await supabase
            .from('information_schema.triggers')
            .select('*')
            .eq('trigger_schema', 'public');
            
        if (error) {
            console.log('❌ Information Schema triggers hatası:', error.message);
        } else {
            console.log('✅ Information Schema triggers başarılı:', data ? data.length + ' kayıt' : 'boş');
            if (data && data.length > 0) {
                console.log('İlk trigger:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ Information Schema triggers exception:', error.message);
    }
    
    // Test 2: pg_class view'ini kontrol et
    console.log('\n2. pg_class erişimi test ediliyor...');
    try {
        const { data, error } = await supabase
            .from('pg_class')
            .select('relname')
            .limit(5);
            
        if (error) {
            console.log('❌ pg_class hatası:', error.message);
        } else {
            console.log('✅ pg_class başarılı:', data ? data.length + ' kayıt' : 'boş');
            if (data && data.length > 0) {
                console.log('İlk class:', data[0]);
            }
        }
    } catch (error) {
        console.log('❌ pg_class exception:', error.message);
    }
    
    // Test 3: Supabase REST API ile schema bilgisi
    console.log('\n3. Supabase REST API ile schema bilgisi...');
    try {
        // Basit tablo listesi alma
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(10);
            
        if (error) {
            console.log('❌ Schema tables hatası:', error.message);
        } else {
            console.log('✅ Schema tables başarılı:', data ? data.length + ' kayıt' : 'boş');
            if (data && data.length > 0) {
                console.log('Tablolar:', data.map(t => t.table_name).join(', '));
            }
        }
    } catch (error) {
        console.log('❌ Schema tables exception:', error.message);
    }
    
    // Test 4: Raw SQL ile function test
    console.log('\n4. Function definitions SQL test...');
    try {
        const funcQuery = `
          SELECT 
            p.proname as function_name,
            n.nspname as schema_name
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          LIMIT 5;
        `;
        
        // exec_sql yerine başka bir yol deneyelim
        console.log('exec_sql sorgusu:', funcQuery);
        const { data, error } = await supabase.rpc('exec_sql', { query: funcQuery });
        
        console.log('Sonuç tipi:', typeof data);
        console.log('Sonuç:', data);
        
        if (error) {
            console.log('❌ Function definitions hatası:', error.message);
        }
    } catch (error) {
        console.log('❌ Function definitions exception:', error.message);
    }
}

testInformationSchema().catch(console.error);