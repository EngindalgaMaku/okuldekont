const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Environment variables gerekli! .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updatePinsDirectly() {
  console.log('SQL ile tüm öğretmenlerin PIN kodları 2025 olarak güncelleniyor...')
  
  try {
    // Direct SQL update
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        UPDATE ogretmenler 
        SET pin = '2025' 
        WHERE id IS NOT NULL;
        
        SELECT COUNT(*) as updated_count FROM ogretmenler WHERE pin = '2025';
      `
    })
    
    if (error) {
      console.error('SQL güncelleme hatası:', error)
      throw error
    }
    
    console.log('✅ SQL güncelleme başarılı!')
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, pin')
      .order('ad')
    
    if (verifyError) {
      console.error('Doğrulama hatası:', verifyError)
      throw verifyError
    }
    
    console.log('\n📊 Doğrulama Sonuçları:')
    console.log('====================')
    
    const pin2025Count = verifyData.filter(t => t.pin === '2025').length
    const otherPinCount = verifyData.filter(t => t.pin !== '2025').length
    
    console.log(`✅ PIN kodu 2025 olan öğretmenler: ${pin2025Count}`)
    console.log(`❌ PIN kodu 2025 olmayan öğretmenler: ${otherPinCount}`)
    
    if (pin2025Count > 0) {
      console.log('\n✅ PIN kodu 2025 olan öğretmenler:')
      verifyData
        .filter(t => t.pin === '2025')
        .forEach(teacher => {
          console.log(`   - ${teacher.ad} ${teacher.soyad}`)
        })
    }
    
    if (otherPinCount > 0) {
      console.log('\n⚠️  PIN kodu 2025 olmayan öğretmenler:')
      verifyData
        .filter(t => t.pin !== '2025')
        .forEach(teacher => {
          console.log(`   - ${teacher.ad} ${teacher.soyad} (PIN: ${teacher.pin || 'YOK'})`)
        })
    }
    
  } catch (error) {
    console.error('❌ İşlem sırasında hata:', error)
    process.exit(1)
  }
}

updatePinsDirectly()