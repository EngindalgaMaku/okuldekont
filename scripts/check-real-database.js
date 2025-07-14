const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// .env.local dosyasından güvenli şekilde oku
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRealDatabase() {
  console.log('🔍 GERÇEK VERİTABANI KONTROLÜ')
  console.log('URL: https://okuldb.run.place/')
  console.log('═══════════════════════════════════════════════')
  
  try {
    // Önce bağlantı test et
    const { data, error } = await supabase.from('ogretmenler').select('*', { count: 'exact' }).limit(1)
    
    if (error) {
      console.log('❌ Bağlantı hatası:', error.message)
      return
    }
    
    console.log('✅ Veritabanına başarıyla bağlanıldı')
    
    // Tüm tabloları kontrol et
    const tables = [
      { name: 'ogretmenler', display: '👨‍🏫 Öğretmenler' },
      { name: 'isletmeler', display: '🏢 İşletmeler' },
      { name: 'ogrenciler', display: '👨‍🎓 Öğrenciler' },
      { name: 'stajlar', display: '📋 Stajlar' },
      { name: 'dekontlar', display: '💰 Dekontlar' },
      { name: 'alanlar', display: '🎯 Alanlar' },
      { name: 'siniflar', display: '📚 Sınıflar' }
    ]
    
    console.log('\n📊 Gerçek veri durumu:')
    console.log('─'.repeat(50))
    
    for (const table of tables) {
      try {
        const { count } = await supabase.from(table.name).select('*', { count: 'exact' })
        console.log(`${table.display}: ${count} kayıt`)
      } catch (error) {
        console.log(`${table.display}: Hata - ${error.message}`)
      }
    }
    
    // Öğretmen detayları
    console.log('\n👨‍🏫 Gerçek öğretmen örnekleri:')
    console.log('─'.repeat(50))
    const { data: ogretmenler } = await supabase
      .from('ogretmenler')
      .select('ad, soyad, pin, email')
      .limit(5)
    
    if (ogretmenler && ogretmenler.length > 0) {
      ogretmenler.forEach((o, i) => {
        console.log(`${i+1}. ${o.ad} ${o.soyad} - PIN: ${o.pin} - ${o.email}`)
      })
    } else {
      console.log('Hiç öğretmen bulunamadı')
    }
    
  } catch (error) {
    console.error('❌ Genel hata:', error.message)
  }
}

// Script çalıştır
checkRealDatabase()