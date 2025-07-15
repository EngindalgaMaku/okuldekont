const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL veya Service Role Key bulunamadı!')
  console.error('Lütfen .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateIsletmePinCodes() {
  try {
    console.log('🔄 İşletme PIN kodları güncelleniyor...')
    
    // Önce tüm işletmeleri getir
    const { data: isletmeler, error: selectError } = await supabase
      .from('isletmeler')
      .select('id, ad, pin')
    
    if (selectError) {
      console.error('❌ İşletmeler getirilirken hata:', selectError)
      return
    }
    
    if (!isletmeler || isletmeler.length === 0) {
      console.log('⚠️ Güncellenecek işletme bulunamadı')
      return
    }
    
    console.log(`📋 ${isletmeler.length} işletme bulundu, PIN kodları güncelleniyor...`)
    
    // Tüm işletmelerin PIN kodlarını 1234 olarak güncelle
    const { data, error } = await supabase
      .from('isletmeler')
      .update({
        pin: '1234'
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Fake condition to update all
      .select('id, ad, pin')
    
    if (error) {
      console.error('❌ PIN kodları güncellenirken hata:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log(`✅ ${data.length} işletmenin PIN kodu başarıyla güncellendi:`)
      data.forEach(isletme => {
        console.log(`  📋 ${isletme.ad} - PIN: ${isletme.pin}`)
      })
    } else {
      console.log('⚠️ Güncellenecek işletme bulunamadı')
    }
    
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
  }
}

updateIsletmePinCodes()