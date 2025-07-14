const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyMockData() {
  console.log('🔍 Mock Veri Doğrulama Sistemi')
  console.log('════════════════════════════════════════════════════════')
  
  try {
    // Tüm tabloları kontrol et
    const tables = [
      { name: 'alanlar', display: '🎯 Alanlar' },
      { name: 'siniflar', display: '📚 Sınıflar' },
      { name: 'ogretmenler', display: '👨‍🏫 Öğretmenler' },
      { name: 'isletmeler', display: '🏢 İşletmeler' },
      { name: 'ogrenciler', display: '👨‍🎓 Öğrenciler' },
      { name: 'stajlar', display: '📋 Stajlar' },
      { name: 'dekontlar', display: '💰 Dekontlar' }
    ]
    
    console.log('\n📊 Mevcut Veri Durumu:')
    console.log('─'.repeat(50))
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table.name).select('*', { count: 'exact' })
      
      if (error) {
        console.log(`${table.display}: ❌ Hata - ${error.message}`)
      } else {
        console.log(`${table.display}: ✅ ${data?.length || 0} kayıt`)
      }
    }
    
    // Öğretmen detayları
    console.log('\n👨‍🏫 Öğretmen Örnekleri:')
    console.log('─'.repeat(50))
    const { data: ogretmenler } = await supabase
      .from('ogretmenler')
      .select('ad, soyad, pin, email')
      .limit(5)
    
    if (ogretmenler) {
      ogretmenler.forEach((o, i) => {
        console.log(`${i+1}. ${o.ad} ${o.soyad} - PIN: ${o.pin} - ${o.email}`)
      })
    }
    
    // İşletme detayları
    console.log('\n🏢 İşletme Örnekleri:')
    console.log('─'.repeat(50))
    const { data: isletmeler } = await supabase
      .from('isletmeler')
      .select('ad, yetkili_kisi, pin')
      .limit(5)
    
    if (isletmeler) {
      isletmeler.forEach((i, idx) => {
        console.log(`${idx+1}. ${i.ad} - Yetkili: ${i.yetkili_kisi} - PIN: ${i.pin}`)
      })
    }
    
    // Öğrenci detayları
    console.log('\n👨‍🎓 Öğrenci Örnekleri:')
    console.log('─'.repeat(50))
    const { data: ogrenciler } = await supabase
      .from('ogrenciler')
      .select('ad, soyad, sinif, no')
      .limit(5)
    
    if (ogrenciler) {
      ogrenciler.forEach((o, i) => {
        console.log(`${i+1}. ${o.ad} ${o.soyad} - ${o.sinif} - No: ${o.no}`)
      })
    }
    
    // Dekont durumu
    console.log('\n💰 Dekont Durumu:')
    console.log('─'.repeat(50))
    const { data: dekontDurum } = await supabase
      .from('dekontlar')
      .select('onay_durumu')
    
    if (dekontDurum) {
      const onayliCount = dekontDurum.filter(d => d.onay_durumu === 'onaylandi').length
      const bekleyenCount = dekontDurum.filter(d => d.onay_durumu === 'bekliyor').length
      
      console.log(`✅ Onaylanan: ${onayliCount}`)
      console.log(`⏳ Bekleyen: ${bekleyenCount}`)
      console.log(`📊 Toplam: ${dekontDurum.length}`)
    }
    
    console.log('\n✅ Veri doğrulama tamamlandı!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

// Script çalıştırılırsa otomatik başlat
if (require.main === module) {
  verifyMockData()
}

module.exports = { verifyMockData }