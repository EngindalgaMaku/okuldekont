const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabaseSchema() {
  console.log('🔍 Veritabanı Şeması Kontrolü')
  console.log('════════════════════════════════════════════════════════════════')
  
  try {
    // 1. İşletmeler tablosunun yapısını kontrol et
    console.log('📋 1. İşletmeler tablosu şeması...')
    
    const { data: isletmeler, error: isletmeError } = await supabase
      .from('isletmeler')
      .select('*')
      .limit(1)
    
    if (isletmeError) {
      console.error('❌ İşletmeler sorgusu hatası:', isletmeError)
    } else if (isletmeler && isletmeler.length > 0) {
      console.log('   İşletmeler tablosu kolonları:')
      Object.keys(isletmeler[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof isletmeler[0][key]}`)
      })
    }
    
    // 2. Stajlar tablosunun yapısını kontrol et
    console.log('\n📋 2. Stajlar tablosu şeması...')
    
    const { data: stajlar, error: stajError } = await supabase
      .from('stajlar')
      .select('*')
      .limit(1)
    
    if (stajError) {
      console.error('❌ Stajlar sorgusu hatası:', stajError)
    } else if (stajlar && stajlar.length > 0) {
      console.log('   Stajlar tablosu kolonları:')
      Object.keys(stajlar[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof stajlar[0][key]}`)
      })
    }
    
    // 3. Öğretmenler tablosunun yapısını kontrol et
    console.log('\n📋 3. Öğretmenler tablosu şeması...')
    
    const { data: ogretmenler, error: ogretmenError } = await supabase
      .from('ogretmenler')
      .select('*')
      .limit(1)
    
    if (ogretmenError) {
      console.error('❌ Öğretmenler sorgusu hatası:', ogretmenError)
    } else if (ogretmenler && ogretmenler.length > 0) {
      console.log('   Öğretmenler tablosu kolonları:')
      Object.keys(ogretmenler[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof ogretmenler[0][key]}`)
      })
    }
    
    // 4. Koordinatör ilişkisini nasıl bulabiliriz?
    console.log('\n📋 4. Koordinatör ilişkisi araştırması...')
    
    // Stajlar tablosunda koordinatör bilgisi var mı?
    const { data: stajlarWithCoordinator } = await supabase
      .from('stajlar')
      .select('*')
      .not('ogretmen_id', 'is', null)
      .limit(5)
    
    if (stajlarWithCoordinator && stajlarWithCoordinator.length > 0) {
      console.log('   Stajlarda öğretmen ID\'si mevcut:')
      stajlarWithCoordinator.forEach((staj, index) => {
        console.log(`   ${index + 1}. Öğretmen ID: ${staj.ogretmen_id}`)
      })
    }
    
    // 5. İşletmeler tablosundaki tüm kolonları listele
    console.log('\n📋 5. İşletmeler tablosundaki tüm kayıtlar (ilk 3)...')
    
    const { data: allIsletmeler } = await supabase
      .from('isletmeler')
      .select('*')
      .limit(3)
    
    if (allIsletmeler && allIsletmeler.length > 0) {
      allIsletmeler.forEach((isletme, index) => {
        console.log(`   ${index + 1}. İşletme: ${isletme.ad}`)
        console.log(`      ID: ${isletme.id}`)
        console.log(`      Tüm alanlar:`)
        Object.keys(isletme).forEach(key => {
          console.log(`        ${key}: ${isletme[key]}`)
        })
        console.log()
      })
    }
    
    // 6. Koordinatör-İşletme ilişkisini nasıl kuruyoruz?
    console.log('📋 6. Koordinatör sistemini anlamaya çalışıyoruz...')
    
    // Belki stajlar tablosundaki öğretmen, o işletmenin koordinatörü oluyor?
    const { data: stajlarWithDetails } = await supabase
      .from('stajlar')
      .select(`
        id,
        ogretmen_id,
        isletme_id,
        ogrenciler(ad, soyad),
        isletmeler(ad),
        ogretmenler(ad, soyad)
      `)
      .not('ogretmen_id', 'is', null)
      .limit(5)
    
    if (stajlarWithDetails && stajlarWithDetails.length > 0) {
      console.log('   Staj-Öğretmen-İşletme ilişkisi:')
      stajlarWithDetails.forEach((staj, index) => {
        console.log(`   ${index + 1}. ${staj.ogrenciler?.ad} ${staj.ogrenciler?.soyad}`)
        console.log(`      İşletme: ${staj.isletmeler?.ad}`)
        console.log(`      Öğretmen: ${staj.ogretmenler?.ad} ${staj.ogretmenler?.soyad}`)
        console.log()
      })
    }
    
    console.log('✅ Şema kontrolü tamamlandı!')
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
  }
}

checkDatabaseSchema()