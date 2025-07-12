const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addColumnsDirectly() {
  console.log('🚀 Sütunları direkt eklemeye çalışıyor...')
  
  const columns = [
    { name: 'faaliyet_alani', description: 'İşletmenin faaliyet alanı ve öğrenci verilme temeli' },
    { name: 'vergi_numarasi', description: 'İşletmenin vergi numarası' },
    { name: 'banka_hesap_no', description: 'Devlet katkı payı için banka hesap numarası' },
    { name: 'calisan_sayisi', description: 'İşletmedeki çalışan sayısı' },
    { name: 'katki_payi_talebi', description: 'Devlet katkı payı talebi durumu (evet/hayir)' },
    { name: 'usta_ogretici_adi', description: 'Usta öğretici adı soyadı' },
    { name: 'usta_ogretici_telefon', description: 'Usta öğretici telefon numarası' }
  ]

  for (const column of columns) {
    try {
      console.log(`📝 ${column.name} sütunu ekleniyor...`)
      
      // Try with a simple test insert approach
      const { data, error } = await supabase
        .from('isletmeler')
        .select('id')
        .limit(1)
        .single()

      if (data) {
        // Try to update with the new column to force schema refresh
        const updateResult = await supabase
          .from('isletmeler')
          .update({ [column.name]: null })
          .eq('id', data.id)
        
        if (updateResult.error) {
          console.log(`❌ ${column.name} sütunu mevcut değil - manuel ekleme gerekli`)
        } else {
          console.log(`✅ ${column.name} sütunu zaten mevcut`)
        }
      }
    } catch (error) {
      console.log(`⚠️ ${column.name} kontrol edilemedi`)
    }
  }

  console.log('\n📋 MANUEL EKLEME TALİMATLARI:')
  console.log('Supabase Dashboard\'a gidin: https://supabase.com/dashboard')
  console.log('1. Projenizi seçin')
  console.log('2. Table Editor > isletmeler tablosuna gidin')
  console.log('3. "Add Column" butonuna tıklayın')
  console.log('4. Aşağıdaki sütunları tek tek ekleyin:\n')
  
  columns.forEach(col => {
    console.log(`   📌 ${col.name}:`)
    console.log(`      - Name: ${col.name}`)
    console.log(`      - Type: text`)
    console.log(`      - Default value: (boş bırakın)`)
    console.log(`      - Description: ${col.description}`)
    console.log('')
  })
}

// Run the function
addColumnsDirectly()
  .then(() => {
    console.log('🎉 İşlem tamamlandı!')
    console.log('💡 Sütunları manuel olarak ekledikten sonra edit/save işlevi çalışacaktır.')
  })
  .catch(console.error)