const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okuldb.run.place/'
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1MjQ0ODM4MCwiZXhwIjo0OTA4MTIxOTgwLCJyb2xlIjoiYW5vbiJ9.RPfSXqTiO_iS6d0VZr_HY1nEOxMTdiTursH8KZbF1uA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStajRLS() {
  console.log('=== STAJ RLS KONTROL ===')
  
  try {
    // Test staj access
    const { data: stajlar, error: stajError } = await supabase
      .from('stajlar')
      .select('*')
      .limit(5)
    
    if (stajError) {
      console.error('Staj erişim hatası:', stajError)
      return
    }
    
    console.log('Staj verisi başarılı:', stajlar.length, 'kayıt')
    
    // Test specific student
    const { data: ogrenci, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .select('*')
      .eq('id', 591)
      .single()
    
    if (ogrenciError) {
      console.error('Öğrenci erişim hatası:', ogrenciError)
      return
    }
    
    console.log('Öğrenci bulundu:', ogrenci.ad, ogrenci.soyad)
    
    // Test staj for specific student
    const { data: ogrenciStaj, error: ogrenciStajError } = await supabase
      .from('stajlar')
      .select('*')
      .eq('ogrenci_id', 591)
    
    if (ogrenciStajError) {
      console.error('Öğrenci staj erişim hatası:', ogrenciStajError)
      return
    }
    
    console.log('Öğrenci staj verisi:', ogrenciStaj.length, 'kayıt')
    
  } catch (error) {
    console.error('Genel hata:', error)
  }
}

checkStajRLS()