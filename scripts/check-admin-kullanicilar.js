const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdminKullanicilar() {
  console.log('🔍 admin_kullanicilar tablosu kontrol ediliyor...\n')
  
  try {
    // admin_kullanicilar tablosunu kontrol et
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_kullanicilar')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (adminError) {
      console.error('❌ admin_kullanicilar tablosu sorgulanırken hata:', adminError.message)
    } else {
      console.log(`📊 admin_kullanicilar tablosunda ${adminUsers?.length || 0} kayıt bulundu:`)
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.ad} ${user.soyad} (${user.email})`)
          console.log(`     - Yetki: ${user.yetki_seviyesi}`)
          console.log(`     - Aktif: ${user.aktif ? 'Evet' : 'Hayır'}`)
          console.log(`     - ID: ${user.id}`)
          console.log(`     - Oluşturulma: ${new Date(user.created_at).toLocaleString('tr-TR')}\n`)
        })
      } else {
        console.log('  ℹ️  admin_kullanicilar tablosu boş\n')
      }
    }

    // Tablonun yapısını kontrol et
    console.log('📋 admin_kullanicilar tablo yapısı kontrol ediliyor...')
    const { data: testData, error: testError } = await supabase
      .from('admin_kullanicilar')
      .select('*')
      .limit(1)
    
    if (!testError && testData) {
      console.log('🔍 Tablo kolonları:', Object.keys(testData[0] || {}))
    } else if (testError) {
      console.log('❌ Test sorgusu hatası:', testError.message)
    }

  } catch (error) {
    console.error('❌ Genel hata:', error.message)
  }
}

// Script'i çalıştır
checkAdminKullanicilar()
  .then(() => {
    console.log('\n✅ Kontrol tamamlandı')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error.message)
    process.exit(1)
  })