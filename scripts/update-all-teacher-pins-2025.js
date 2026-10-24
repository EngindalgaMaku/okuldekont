const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Environment variables from Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Environment variables gerekli! .env.local dosyasını kontrol edin.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateAllTeacherPins() {
  console.log('Tüm öğretmenlerin PIN kodları 2025 olarak güncelleniyor...')
  
  try {
    // Önce mevcut öğretmenleri kontrol et
    const { data: teachers, error: fetchError } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, pin')
      .order('ad')
    
    if (fetchError) {
      console.error('Öğretmenler getirilemedi:', fetchError)
      throw fetchError
    }
    
    if (!teachers || teachers.length === 0) {
      console.log('Güncellenecek öğretmen bulunamadı.')
      return
    }
    
    console.log(`${teachers.length} öğretmen bulundu. PIN kodları güncelleniyor...`)
    
    // Her öğretmenin PIN kodunu tek tek güncelle
    let successCount = 0
    let errorCount = 0
    
    for (const teacher of teachers) {
      const { error: updateError } = await supabase
        .from('ogretmenler')
        .update({ pin: '2025' })
        .eq('id', teacher.id)
      
      if (updateError) {
        console.error(`${teacher.ad} ${teacher.soyad} için PIN güncelleme hatası:`, updateError)
        errorCount++
      } else {
        successCount++
      }
    }
    
    console.log(`✅ ${successCount} öğretmenin PIN kodu başarıyla 2025 olarak güncellendi!`)
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} öğretmenin PIN kodu güncellenemedi.`)
    }
    
    // Güncellenmiş öğretmenleri tekrar kontrol et
    const { data: updatedTeachers, error: verifyError } = await supabase
      .from('ogretmenler')
      .select('id, ad, soyad, pin')
      .order('ad')
    
    if (verifyError) {
      console.error('Doğrulama hatası:', verifyError)
      throw verifyError
    }
    
    console.log('\n📊 Güncelleme Özeti:')
    console.log('==================')
    
    const pin2025Count = updatedTeachers.filter(t => t.pin === '2025').length
    const otherPinCount = updatedTeachers.filter(t => t.pin !== '2025').length
    
    console.log(`✅ PIN kodu 2025 olan öğretmenler: ${pin2025Count}`)
    console.log(`❌ PIN kodu 2025 olmayan öğretmenler: ${otherPinCount}`)
    
    if (otherPinCount > 0) {
      console.log('\n⚠️  PIN kodu 2025 olmayan öğretmenler:')
      updatedTeachers
        .filter(t => t.pin !== '2025')
        .forEach(teacher => {
          console.log(`   - ${teacher.ad} ${teacher.soyad} (PIN: ${teacher.pin || 'YOK'})`)
        })
    }
    
    // Giriş denemelerini temizle (yeni PIN ile fresh start)
    console.log('\n🧹 Eski giriş denemelerini temizleniyor...')
    const { error: clearError } = await supabase
      .from('ogretmen_giris_denemeleri')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (clearError) {
      console.warn('Giriş denemelerini temizleme hatası:', clearError.message)
    } else {
      console.log('✅ Eski giriş denemeleri temizlendi.')
    }
    
  } catch (error) {
    console.error('❌ İşlem sırasında hata:', error)
    process.exit(1)
  }
}

updateAllTeacherPins()