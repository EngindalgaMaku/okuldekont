const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4OTQ2MCwiZXhwIjoyMDY2MjY1NDYwfQ.snDNh-cNBjEoLstTmE3U6loXPrhKydBoTG7BvP6BONQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanDemoData() {
  try {
    console.log('🧹 Demo test verileri temizleniyor...')
    
    // Demo stajları sil
    const { error: stajError } = await supabase
      .from('stajlar')
      .delete()
      .or('ogrenci_id.in.(select id from ogrenciler where no like \'TEST%\')')
    
    if (stajError) console.warn('Staj silme hatası:', stajError.message)
    
    // Demo koordinatör atamalarını sil  
    const { error: koordinatorError } = await supabase
      .from('ogrenci_koordinatorleri')
      .delete()
      .or('ogrenci_id.in.(select id from ogrenciler where no like \'TEST%\')')
    
    if (koordinatorError) console.warn('Koordinatör silme hatası:', koordinatorError.message)
    
    // Demo öğrencileri sil
    const { data: deletedOgrenciler, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .delete()
      .ilike('no', 'TEST%')
      .select()
    
    if (ogrenciError) throw ogrenciError
    
    // Demo işletmeleri sil
    const { data: deletedIsletmeler, error: isletmeError } = await supabase
      .from('isletmeler')
      .delete()
      .ilike('ad', 'Demo %')
      .select()
    
    if (isletmeError) throw isletmeError
    
    // Demo sınıfları sil
    const { data: deletedSiniflar, error: sinifError } = await supabase
      .from('siniflar')
      .delete()
      .ilike('ad', 'Demo %')
      .select()
    
    if (sinifError) console.warn('Sınıf silme hatası:', sinifError.message)
    
    console.log(`✅ ${deletedOgrenciler?.length || 0} demo öğrenci silindi`)
    console.log(`✅ ${deletedIsletmeler?.length || 0} demo işletme silindi`)
    console.log(`✅ ${deletedSiniflar?.length || 0} demo sınıf silindi`)
    console.log('✅ İlgili staj ve koordinatör kayıtları temizlendi')
    
    console.log('\n🎉 Demo test verileri başarıyla temizlendi!')
    console.log('💡 Alanlar ve öğretmenler korundu.')
    
  } catch (error) {
    console.error('❌ Temizleme hatası:', error.message)
  }
}

cleanDemoData()