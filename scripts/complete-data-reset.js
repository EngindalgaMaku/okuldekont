const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function completeDataReset() {
  console.log('🧹 KAPSAMLI VERİ SIFIRLAMA SİSTEMİ')
  console.log('══════════════════════════════════════════════')
  console.log('⚠️  TÜM veriler foreign key sırasına göre silinecek')
  console.log()
  
  try {
    // Önce mevcut veri durumunu kontrol et
    console.log('🔍 Mevcut veri durumu:')
    const tables = [
      'dekontlar', 'stajlar', 'ogrenciler', 'isletmeler', 'ogretmenler', 'siniflar', 'alanlar'
    ]
    
    for (const table of tables) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact' })
        console.log(`   ${table}: ${count} kayıt`)
      } catch (error) {
        console.log(`   ${table}: Hata - ${error.message}`)
      }
    }
    
    console.log('\n🧹 Veriler foreign key sırasına göre siliniyor...')
    
    // 1. Dekontları sil (en üstte)
    console.log('   💰 Dekontlar siliniyor...')
    try {
      const { error: dekontError } = await supabase.from('dekontlar').delete().neq('id', null)
      if (dekontError) throw dekontError
      console.log('   ✅ Dekontlar silindi')
    } catch (error) {
      console.log(`   ❌ Dekont silme hatası: ${error.message}`)
    }
    
    // 2. Stajları sil
    console.log('   📋 Stajlar siliniyor...')
    try {
      const { error: stajError } = await supabase.from('stajlar').delete().neq('id', null)
      if (stajError) throw stajError
      console.log('   ✅ Stajlar silindi')
    } catch (error) {
      console.log(`   ❌ Staj silme hatası: ${error.message}`)
    }
    
    // 3. Öğrencileri sil
    console.log('   👨‍🎓 Öğrenciler siliniyor...')
    try {
      const { error: ogrenciError } = await supabase.from('ogrenciler').delete().neq('id', null)
      if (ogrenciError) throw ogrenciError
      console.log('   ✅ Öğrenciler silindi')
    } catch (error) {
      console.log(`   ❌ Öğrenci silme hatası: ${error.message}`)
    }
    
    // 4. İşletmeleri sil
    console.log('   🏢 İşletmeler siliniyor...')
    try {
      const { error: isletmeError } = await supabase.from('isletmeler').delete().neq('id', null)
      if (isletmeError) throw isletmeError
      console.log('   ✅ İşletmeler silindi')
    } catch (error) {
      console.log(`   ❌ İşletme silme hatası: ${error.message}`)
    }
    
    // 5. Öğretmenleri sil
    console.log('   👨‍🏫 Öğretmenler siliniyor...')
    try {
      const { error: ogretmenError } = await supabase.from('ogretmenler').delete().neq('id', null)
      if (ogretmenError) throw ogretmenError
      console.log('   ✅ Öğretmenler silindi')
    } catch (error) {
      console.log(`   ❌ Öğretmen silme hatası: ${error.message}`)
    }
    
    // 6. Sınıfları sil
    console.log('   📚 Sınıflar siliniyor...')
    try {
      const { error: sinifError } = await supabase.from('siniflar').delete().neq('uuid_id', null)
      if (sinifError) throw sinifError
      console.log('   ✅ Sınıflar silindi')
    } catch (error) {
      console.log(`   ❌ Sınıf silme hatası: ${error.message}`)
    }
    
    // Final kontrol
    console.log('\n🔍 Temizlik sonrası durum:')
    for (const table of tables) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact' })
        console.log(`   ${table}: ${count} kayıt`)
      } catch (error) {
        console.log(`   ${table}: Kontrol hatası - ${error.message}`)
      }
    }
    
    console.log('\n✅ VERİ TEMİZLEME TAMAMLANDI!')
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
    throw error
  }
}

// Script çalıştırılırsa otomatik başlat
if (require.main === module) {
  completeDataReset()
}

module.exports = { completeDataReset }