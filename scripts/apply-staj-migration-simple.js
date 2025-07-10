const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyStajMigration() {
  try {
    console.log('🚀 Staj tablosu sütunları kontrol ediliyor...')
    
    // Önce mevcut bir stajı kontrol edelim
    const { data: existingStaj, error: selectError } = await supabase
      .from('stajlar')
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.error('❌ Stajlar tablosu erişim hatası:', selectError)
      return
    }
    
    console.log('✅ Stajlar tablosuna erişim başarılı')
    
    if (existingStaj && existingStaj.length > 0) {
      console.log('📊 Mevcut staj örneği:', Object.keys(existingStaj[0]))
      
      // sozlesme_url sütunu var mı kontrol et
      if (!existingStaj[0].hasOwnProperty('sozlesme_url')) {
        console.log('⚠️ sozlesme_url sütunu eksik!')
      } else {
        console.log('✅ sozlesme_url sütunu mevcut')
      }
      
      if (!existingStaj[0].hasOwnProperty('ogretmen_id')) {
        console.log('⚠️ ogretmen_id sütunu eksik!')
      } else {
        console.log('✅ ogretmen_id sütunu mevcut')
      }
    }
    
    // Test için basit bir INSERT deneyelim
    console.log('🧪 Test staj kaydı oluşturmayı deniyoruz...')
    
    const { data: testStaj, error: insertError } = await supabase
      .from('stajlar')
      .insert({
        ogrenci_id: '123e4567-e89b-12d3-a456-426614174000',
        isletme_id: '123e4567-e89b-12d3-a456-426614174001',
        ogretmen_id: '123e4567-e89b-12d3-a456-426614174002',
        baslangic_tarihi: '2024-01-01',
        durum: 'aktif',
        sozlesme_url: 'https://test.com/sozlesme.pdf'
      })
      .select()
    
    if (insertError) {
      console.log('❌ Test INSERT hatası (bu beklenen olabilir):', insertError.message)
      
      if (insertError.message.includes('sozlesme_url')) {
        console.log('🔧 sozlesme_url sütunu eksik, eklenmesi gerekiyor')
      }
      if (insertError.message.includes('ogretmen_id')) {
        console.log('🔧 ogretmen_id sütunu eksik, eklenmesi gerekiyor')
      }
    } else {
      console.log('✅ Test INSERT başarılı, sütunlar mevcut')
      
      // Test kaydını sil
      await supabase
        .from('stajlar')
        .delete()
        .eq('id', testStaj[0].id)
    }
    
  } catch (error) {
    console.error('💥 Beklenmeyen hata:', error.message)
  }
}

applyStajMigration()