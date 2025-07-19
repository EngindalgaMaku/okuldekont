const { createClient } = require('@supabase/supabase-js')

// Supabase bağlantısı test et
async function testDatabase() {
  console.log('Veritabanı bağlantısı test ediliyor...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    // Alanlar tablosunu kontrol et
    console.log('Alanlar tablosunu kontrol ediliyor...')
    const { data: alanlar, error: alanlarError } = await supabase
      .from('alanlar')
      .select('*')
      .limit(5)

    if (alanlarError) {
      console.error('Alanlar tablosu hatası:', alanlarError)
    } else {
      console.log('Alanlar tablosu başarıyla okundu:', alanlar)
    }

    // Bir alan güncelleme testi
    if (alanlar && alanlar.length > 0) {
      const testAlan = alanlar[0]
      console.log('Test alanı:', testAlan)
      
      const { error: updateError } = await supabase
        .from('alanlar')
        .update({
          ad: testAlan.ad + ' (test)',
          aciklama: 'Test güncelleme'
        })
        .eq('id', testAlan.id)

      if (updateError) {
        console.error('Güncelleme hatası:', updateError)
      } else {
        console.log('Güncelleme başarılı!')
        
        // Geri al
        const { error: revertError } = await supabase
          .from('alanlar')
          .update({
            ad: testAlan.ad,
            aciklama: testAlan.aciklama
          })
          .eq('id', testAlan.id)

        if (revertError) {
          console.error('Geri alma hatası:', revertError)
        } else {
          console.log('Geri alma başarılı!')
        }
      }
    }

  } catch (err) {
    console.error('Genel hata:', err)
  }
}

testDatabase() 