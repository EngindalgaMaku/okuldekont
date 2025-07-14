const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function forceCleanAllData() {
  console.log('🧹 ZORLA TÜM VERİ TEMİZLEME SİSTEMİ')
  console.log('═══════════════════════════════════════════════')
  console.log('⚠️  TÜM veriler silinecek (admin kullanıcıları hariç)')
  console.log()
  
  try {
    console.log('🔍 Mevcut veri durumu kontrol ediliyor...')
    
    // Önce mevcut verileri kontrol et
    const { data: ogretmenler, count: ogretmenCount } = await supabase
      .from('ogretmenler')
      .select('*', { count: 'exact' })
    
    console.log(`   Mevcut öğretmen sayısı: ${ogretmenCount}`)
    
    if (ogretmenCount > 0) {
      console.log('\n🧹 Tüm veriler zorla siliniyor...')
      
      // 1. Dekontları sil
      console.log('   💰 Tüm dekontlar siliniyor...')
      const { error: dekontError } = await supabase
        .from('dekontlar')
        .delete()
        .gte('id', 0)
      
      if (dekontError) console.log(`   ❌ Dekont silme hatası: ${dekontError.message}`)
      else console.log('   ✅ Dekontlar silindi')
      
      // 2. Stajları sil
      console.log('   📋 Tüm stajlar siliniyor...')
      const { error: stajError } = await supabase
        .from('stajlar')
        .delete()
        .gte('id', 0)
      
      if (stajError) console.log(`   ❌ Staj silme hatası: ${stajError.message}`)
      else console.log('   ✅ Stajlar silindi')
      
      // 3. Öğrencileri sil
      console.log('   👨‍🎓 Tüm öğrenciler siliniyor...')
      const { error: ogrenciError } = await supabase
        .from('ogrenciler')
        .delete()
        .gte('id', 0)
      
      if (ogrenciError) console.log(`   ❌ Öğrenci silme hatası: ${ogrenciError.message}`)
      else console.log('   ✅ Öğrenciler silindi')
      
      // 4. İşletmeleri sil
      console.log('   🏢 Tüm işletmeler siliniyor...')
      const { error: isletmeError } = await supabase
        .from('isletmeler')
        .delete()
        .gte('id', 0)
      
      if (isletmeError) console.log(`   ❌ İşletme silme hatası: ${isletmeError.message}`)
      else console.log('   ✅ İşletmeler silindi')
      
      // 5. Öğretmenleri sil
      console.log('   👨‍🏫 Tüm öğretmenler siliniyor...')
      const { error: ogretmenError } = await supabase
        .from('ogretmenler')
        .delete()
        .gte('id', 0)
      
      if (ogretmenError) console.log(`   ❌ Öğretmen silme hatası: ${ogretmenError.message}`)
      else console.log('   ✅ Öğretmenler silindi')
      
      // 6. Sınıfları sil
      console.log('   📚 Tüm sınıflar siliniyor...')
      const { error: sinifError } = await supabase
        .from('siniflar')
        .delete()
        .gte('id', 0)
      
      if (sinifError) console.log(`   ❌ Sınıf silme hatası: ${sinifError.message}`)
      else console.log('   ✅ Sınıflar silindi')
      
      console.log('\n✅ TÜM VERİLER TEMİZLENDİ!')
      
      // Final kontrol
      console.log('\n🔍 Temizlik sonrası kontrol:')
      const tables = ['ogretmenler', 'isletmeler', 'ogrenciler', 'stajlar', 'dekontlar', 'siniflar']
      
      for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact' })
        console.log(`   ${table}: ${count} kayıt`)
      }
      
    } else {
      console.log('   ✅ Zaten temiz - hiç öğretmen yok')
    }
    
  } catch (error) {
    console.error('❌ Zorla temizleme hatası:', error)
    throw error
  }
}

// Script çalıştırılırsa otomatik başlat
if (require.main === module) {
  forceCleanAllData()
}

module.exports = { forceCleanAllData }