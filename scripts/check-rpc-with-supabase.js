const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Environment variables gerekli! .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRpcFunctions() {
  console.log('📋 Supabase RPC fonksiyonları kontrol ediliyor...\n')
  
  try {
    // Test some known RPC functions
    const testFunctions = [
      'get_admin_users',
      'create_admin_user', 
      'update_admin_user',
      'delete_admin_user',
      'is_user_admin',
      'get_system_setting',
      'update_system_setting',
      'check_isletme_pin_giris',
      'check_ogretmen_pin_giris',
      'get_gorev_belgeleri_detayli',
      'exec_sql'
    ]
    
    console.log('🔍 Test edilen RPC fonksiyonları:')
    console.log('=' .repeat(50))
    
    for (const funcName of testFunctions) {
      try {
        // Try to call the function with minimal parameters to see if it exists
        let result
        
        switch(funcName) {
          case 'get_admin_users':
            result = await supabase.rpc('get_admin_users')
            break
          case 'get_system_setting':
            result = await supabase.rpc('get_system_setting', { p_setting_key: 'test' })
            break
          case 'is_user_admin':
            result = await supabase.rpc('is_user_admin', { p_user_id: '00000000-0000-0000-0000-000000000000' })
            break
          default:
            // Just try to call it and see if we get a function not found error
            result = await supabase.rpc(funcName, {})
        }
        
        if (result.error) {
          if (result.error.message.includes('function') && result.error.message.includes('does not exist')) {
            console.log(`❌ ${funcName} - FONKSİYON BULUNAMADI`)
          } else {
            console.log(`✅ ${funcName} - MEVCUT (${result.error.message.substring(0, 50)}...)`)
          }
        } else {
          console.log(`✅ ${funcName} - MEVCUT VE ÇALIŞIYOR`)
        }
      } catch (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`❌ ${funcName} - FONKSİYON BULUNAMADI`)
        } else {
          console.log(`✅ ${funcName} - MEVCUT (Hata: ${error.message.substring(0, 30)}...)`)
        }
      }
    }
    
    console.log('\n🔍 SQL sorgusu ile fonksiyon listesi kontrol ediliyor...')
    
    // Try to get function list via SQL
    const sqlQuery = `
      SELECT 
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type,
        CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public' 
        AND l.lanname != 'internal'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'information_schema_%'
      ORDER BY p.proname;
    `
    
    const { data: functions, error: sqlError } = await supabase.rpc('exec_sql', {
      query: sqlQuery
    })
    
    if (sqlError) {
      console.log('❌ SQL sorgusu başarısız:', sqlError.message)
    } else {
      console.log('\n📋 Veritabanından alınan fonksiyon listesi:')
      console.log('=' .repeat(50))
      
      console.log('Fonksiyon verisi:', typeof functions, functions)
      
      if (functions && Array.isArray(functions) && functions.length > 0) {
        functions.forEach((func, index) => {
          console.log(`${index + 1}. ${func.function_name}(${func.arguments || ''})`)
          console.log(`   📤 Dönüş: ${func.return_type}`)
          console.log(`   🔒 Güvenlik: ${func.security}`)
          console.log('')
        })
      } else if (functions && typeof functions === 'string') {
        console.log('Raw SQL sonucu:', functions)
      } else {
        console.log('⚠️ Fonksiyon listesi alınamadı veya boş. Tip:', typeof functions)
      }
    }
    
  } catch (error) {
    console.error('❌ Genel hata:', error.message)
  }
}

checkRpcFunctions()