const { createClient } = require('@supabase/supabase-js')

// .env.local dosyasını açıkça oku
require('dotenv').config({ path: '.env.local' })

// Uygulamanın kullandığı aynı veritabanına bağlan
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('📅 STAJ TARİHLERİ GÜNCELLENİYOR')
console.log('═══════════════════════════════════════════════')

async function updateStajDates() {
  try {
    // 1. Mevcut stajları al
    const { data: stajlar, error: fetchError } = await supabase
      .from('stajlar')
      .select('id, ogrenci_id, baslangic_tarihi, bitis_tarihi, durum')
    
    if (fetchError) throw fetchError
    
    console.log(`📊 Toplam ${stajlar.length} staj bulundu`)
    
    // 2. Tarihleri güncelle
    const updates = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
    
    for (let i = 0; i < stajlar.length; i++) {
      const staj = stajlar[i]
      let baslangic, bitis, durum
      
      // Stajları farklı kategorilere ayır
      const stajIndex = i % 100 // 100'lük gruplar halinde
      
      if (stajIndex < 30) {
        // %30 - Geçen yıl başlayıp bu yıl biten stajlar (bitmiş)
        baslangic = `${currentYear - 1}-09-15`
        bitis = `${currentYear}-06-15`
        durum = 'tamamlandi'
      } else if (stajIndex < 60) {
        // %30 - Geçen yıl başlayıp bu yıl devam eden stajlar (aktif)
        baslangic = `${currentYear - 1}-09-15`
        bitis = `${currentYear}-08-30`
        durum = 'aktif'
      } else if (stajIndex < 75) {
        // %15 - Bu yıl başlayan kısa dönem stajlar (aktif)
        baslangic = `${currentYear}-02-01`
        bitis = `${currentYear}-08-30`
        durum = 'aktif'
      } else if (stajIndex < 85) {
        // %10 - Yaz stajları (aktif)
        baslangic = `${currentYear}-06-15`
        bitis = `${currentYear}-08-30`
        durum = 'aktif'
      } else {
        // %15 - Yeni dönem stajları (aktif)
        baslangic = `${currentYear}-09-15`
        bitis = `${currentYear + 1}-06-15`
        durum = 'aktif'
      }
      
      updates.push({
        id: staj.id,
        baslangic_tarihi: baslangic,
        bitis_tarihi: bitis,
        durum: durum
      })
    }
    
    // 3. Batch update yap
    console.log('🔄 Tarihler güncelleniyor...')
    let updateCount = 0
    
    for (const update of updates) {
      const { error } = await supabase
        .from('stajlar')
        .update({
          baslangic_tarihi: update.baslangic_tarihi,
          bitis_tarihi: update.bitis_tarihi,
          durum: update.durum
        })
        .eq('id', update.id)
      
      if (error) {
        console.error(`❌ Staj ${update.id} güncellenemedi:`, error.message)
      } else {
        updateCount++
      }
    }
    
    console.log(`✅ ${updateCount} staj tarihi güncellendi`)
    
    // 4. Güncel durumu göster
    const { data: updatedStajlar } = await supabase
      .from('stajlar')
      .select('durum')
    
    const aktifCount = updatedStajlar.filter(s => s.durum === 'aktif').length
    const tamamlandiCount = updatedStajlar.filter(s => s.durum === 'tamamlandi').length
    
    console.log('\n📊 GÜNCEL DURUM:')
    console.log(`   🟢 Aktif stajlar: ${aktifCount}`)
    console.log(`   ✅ Tamamlanan stajlar: ${tamamlandiCount}`)
    console.log(`   📅 Referans tarih: ${currentDate.toLocaleDateString('tr-TR')}`)
    
    console.log('\n✅ STAJ TARİHLERİ BAŞARIYLA GÜNCELLENDİ!')
    
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

updateStajDates()