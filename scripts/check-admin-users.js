const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdminUsers() {
  console.log('🔍 Admin kullanıcıları kontrol ediliyor...\n')
  
  try {
    // admin_users tablosunu kontrol et
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (adminError) {
      console.error('❌ admin_users tablosu sorgulanırken hata:', adminError.message)
    } else {
      console.log(`📊 admin_users tablosunda ${adminUsers?.length || 0} kayıt bulundu:`)
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.ad} ${user.soyad} (${user.email})`)
          console.log(`     - Yetki: ${user.yetki_seviyesi}`)
          console.log(`     - Aktif: ${user.aktif ? 'Evet' : 'Hayır'}`)
          console.log(`     - ID: ${user.id}`)
          console.log(`     - Oluşturulma: ${new Date(user.created_at).toLocaleString('tr-TR')}\n`)
        })
      } else {
        console.log('  ℹ️  admin_users tablosu boş\n')
      }
    }

    // auth.users tablosundaki admin kullanıcıları da kontrol et
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ auth.users sorgulanırken hata:', authError.message)
    } else {
      console.log(`📊 auth.users tablosunda ${authUsers?.users?.length || 0} kayıt bulundu:`)
      if (authUsers?.users && authUsers.users.length > 0) {
        authUsers.users.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email}`)
          console.log(`     - ID: ${user.id}`)
          console.log(`     - Doğrulanmış: ${user.email_confirmed_at ? 'Evet' : 'Hayır'}`)
          console.log(`     - Son giriş: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('tr-TR') : 'Hiç'}`)
          console.log(`     - Metadata: ${JSON.stringify(user.user_metadata, null, 2)}\n`)
        })
      } else {
        console.log('  ℹ️  auth.users tablosu boş\n')
      }
    }

    // Tablolar arasındaki ilişkiyi kontrol et
    if (adminUsers && adminUsers.length > 0 && authUsers?.users && authUsers.users.length > 0) {
      console.log('🔗 Tablo ilişkileri kontrol ediliyor...')
      
      for (const adminUser of adminUsers) {
        const authUser = authUsers.users.find(u => u.id === adminUser.id)
        if (authUser) {
          console.log(`✅ ${adminUser.email} - Admin ve Auth tablolarında mevcut`)
        } else {
          console.log(`⚠️  ${adminUser.email} - Admin tablosunda mevcut ama Auth tablosunda yok`)
        }
      }
      
      for (const authUser of authUsers.users) {
        const adminUser = adminUsers.find(u => u.id === authUser.id)
        if (!adminUser) {
          console.log(`⚠️  ${authUser.email} - Auth tablosunda mevcut ama Admin tablosunda yok`)
        }
      }
    }

    // admin_users tablosunun yapısını kontrol et
    console.log('\n📋 admin_users tablo yapısı kontrol ediliyor...')
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'admin_users' })
    
    if (schemaError) {
      console.log('⚠️  Tablo şeması alınamadı, manuel kontrol yapılıyor...')
      
      // Basit bir test sorgusu ile kolonları öğren
      const { data: testData, error: testError } = await supabase
        .from('admin_users')
        .select('*')
        .limit(1)
      
      if (!testError && testData) {
        console.log('🔍 Tablo kolonları:', Object.keys(testData[0] || {}))
      }
    } else {
      console.log('✅ Tablo şeması başarıyla alındı')
    }

  } catch (error) {
    console.error('❌ Genel hata:', error.message)
  }
}

// Script'i çalıştır
checkAdminUsers()
  .then(() => {
    console.log('\n✅ Kontrol tamamlandı')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error.message)
    process.exit(1)
  })