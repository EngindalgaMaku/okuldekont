const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL veya Service Role Key bulunamadı!')
  console.error('Lütfen .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBackupCreation() {
  console.log('🔍 Backup oluşturma işlemi test ediliyor...')

  try {
    console.log('1️⃣ RPC fonksiyon listesi kontrol ediliyor...')
    
    // Test if create_database_backup function exists
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%backup%'
        ORDER BY routine_name;
      `
    })

    if (funcError) {
      console.error('❌ RPC fonksiyonları listelenemedi:', funcError)
      return
    }

    console.log('📋 Mevcut backup RPC fonksiyonları:')
    console.log(functions)

    console.log('\n2️⃣ Schema detection test ediliyor...')
    
    // Test schema detection functions
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables')
    if (tablesError) {
      console.error('❌ Schema tables alınamadı:', tablesError)
      return
    }
    console.log(`✅ ${tables?.length || 0} tablo bulundu`)

    const { data: triggers, error: triggersError } = await supabase.rpc('get_schema_triggers')
    if (triggersError) {
      console.error('❌ Schema triggers alınamadı:', triggersError)
      return
    }
    console.log(`✅ ${triggers?.length || 0} trigger bulundu`)

    console.log('\n3️⃣ Basit backup test ediliyor...')
    
    // Test backup creation with timeout
    const backupPromise = supabase.rpc('create_database_backup', {
      p_backup_name: 'Test_Debug_Backup',
      p_backup_type: 'full', 
      p_notes: 'Debug test backup'
    })

    // Add timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Backup işlemi 30 saniyede tamamlanmadı')), 30000)
    })

    const { data, error } = await Promise.race([backupPromise, timeoutPromise])

    if (error) {
      console.error('❌ Backup oluşturma hatası:', error)
      return
    }

    console.log('✅ Backup test sonucu:', data)

    if (data?.success) {
      console.log('🎉 Backup başarıyla oluşturuldu!')
      
      // Check backup list
      const { data: backupList, error: listError } = await supabase.rpc('get_backup_list')
      if (listError) {
        console.error('❌ Backup listesi alınamadı:', listError)
        return
      }
      
      console.log(`📊 Toplam backup sayısı: ${backupList?.length || 0}`)
      if (backupList && backupList.length > 0) {
        console.log('📋 Son backup:', backupList[0])
      }
    } else {
      console.error('❌ Backup oluşturulamadı:', data?.error)
    }

  } catch (error) {
    console.error('💥 Test sırasında hata:', error)
  }
}

testBackupCreation()
  .then(() => {
    console.log('\n🏁 Test tamamlandı!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test başarısız:', error)
    process.exit(1)
  })