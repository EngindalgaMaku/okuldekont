const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

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