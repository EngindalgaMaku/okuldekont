const { createClient } = require('@supabase/supabase-js')

// .env.local dosyasını açıkça oku
require('dotenv').config({ path: '.env.local' })

// Uygulamanın kullandığı aynı veritabanına bağlan
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('⏰ BAZI STAJLARI SÜRESİ GEÇMİŞ OLARAK AYARLANIYOR')
console.log('═══════════════════════════════════════════════')

async function addExpiredStajlar() {
  try {
    // Aktif stajları al
    const { data: aktifStajlar, error: fetchError } = await supabase
      .from('stajlar')
      .select('id, ogrenci_id, baslangic_tarihi, bitis_tarihi')
      .eq('durum', 'aktif')
      .limit(50) // İlk 50 aktif stajdan bazılarını seçeceğiz
    
    if (fetchError) throw fetchError
    
    console.log(`📊 ${aktifStajlar.length} aktif staj bulundu`)
    
    // İlk 20 stajı süresi geçmiş yapacağız
    const expiredStajlar = aktifStajlar.slice(0, 20)
    
    console.log('⏰ Süresi geçmiş stajlar oluşturuluyor...')
    
    let updateCount = 0
    
    for (const staj of expiredStajlar) {
      // Farklı geçmiş tarihler oluştur
      const randomDays = Math.floor(Math.random() * 90) + 10 // 10-100 gün önce bitmiş
      const bitisDate = new Date()
      bitisDate.setDate(bitisDate.getDate() - randomDays)
      
      // Başlangıç tarihini de o dönemde ayarla
      const baslangicDate = new Date(bitisDate)
      baslangicDate.setMonth(baslangicDate.getMonth() - 8) // 8 ay öncesi başlangıç
      
      const { error } = await supabase
        .from('stajlar')
        .update({
          baslangic_tarihi: baslangicDate.toISOString().split('T')[0],
          bitis_tarihi: bitisDate.toISOString().split('T')[0],
          durum: 'aktif' // Durumu aktif bırakıyoruz ki süresi geçmiş aktif staj olsun
        })
        .eq('id', staj.id)
      
      if (error) {
        console.error(`❌ Staj ${staj.id} güncellenemedi:`, error.message)
      } else {
        updateCount++
        console.log(`   ✅ Staj ${staj.id}: ${randomDays} gün önce bitmiş olarak ayarlandı`)
      }
    }
    
    console.log(`\n✅ ${updateCount} staj süresi geçmiş olarak ayarlandı`)
    
    // Güncel durumu göster
    const { data: allStajlar } = await supabase
      .from('stajlar')
      .select('durum, bitis_tarihi')
    
    const today = new Date().toISOString().split('T')[0]
    const expiredCount = allStajlar.filter(s => 
      s.durum === 'aktif' && s.bitis_tarihi && s.bitis_tarihi < today
    ).length
    
    const activeCount = allStajlar.filter(s => 
      s.durum === 'aktif' && (!s.bitis_tarihi || s.bitis_tarihi >= today)
    ).length
    
    const completedCount = allStajlar.filter(s => s.durum === 'tamamlandi').length
    
    console.log('\n📊 GÜNCEL DURUM:')
    console.log(`   🟢 Aktif stajlar: ${activeCount}`)
    console.log(`   🔴 Süresi geçmiş aktif stajlar: ${expiredCount}`)
    console.log(`   ✅ Tamamlanan stajlar: ${completedCount}`)
    console.log(`   📅 Referans tarih: ${new Date().toLocaleDateString('tr-TR')}`)
    
    console.log('\n✅ SÜRESİ GEÇMİŞ STAJLAR BAŞARIYLA OLUŞTURULDU!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

addExpiredStajlar()