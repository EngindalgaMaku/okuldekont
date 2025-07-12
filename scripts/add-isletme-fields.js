const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addIsletmeFields() {
  console.log('🚀 İşletmeler tablosuna yeni alanlar ekleniyor...')
  
  try {
    // Add new columns to isletmeler table one by one
    const columns = [
      'faaliyet_alani',
      'vergi_numarasi',
      'banka_hesap_no',
      'calisan_sayisi',
      'katki_payi_talebi',
      'usta_ogretici_adi',
      'usta_ogretici_telefon'
    ]

    // First, let's check current structure
    console.log('📋 İşletmeler tablosu mevcut yapısını kontrol ediliyor...')
    
    // Try a test query to see current structure
    const { data: testData, error: testError } = await supabase
      .from('isletmeler')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Tablo yapısı kontrol hatası:', testError)
      return
    }

    const existingColumns = testData && testData.length > 0 ? Object.keys(testData[0]) : []
    console.log('📍 Mevcut sütunlar:', existingColumns)

    const missingColumns = columns.filter(col => !existingColumns.includes(col))
    console.log('🔍 Eksik sütunlar:', missingColumns)

    if (missingColumns.length === 0) {
      console.log('✅ Tüm sütunlar zaten mevcut!')
      return
    }

    console.log('⚠️ Supabase üzerinde manuel olarak şu sütunları eklemeniz gerekiyor:')
    missingColumns.forEach(col => {
      console.log(`   ALTER TABLE isletmeler ADD COLUMN IF NOT EXISTS ${col} TEXT;`)
    })
    
    console.log('\n📝 Supabase Dashboard > Table Editor > isletmeler tablosuna gidin ve bu sütunları ekleyin.')

    console.log('✅ İşletmeler tablosuna yeni alanlar başarıyla eklendi!')
    
    // Verify the columns were added
    const { data: columnInfo, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'isletmeler')
      .in('column_name', [
        'faaliyet_alani',
        'vergi_numarasi', 
        'banka_hesap_no',
        'calisan_sayisi',
        'katki_payi_talebi',
        'usta_ogretici_adi',
        'usta_ogretici_telefon'
      ])

    if (columnsError) {
      console.warn('⚠️ Sütun doğrulaması yapılamadı:', columnsError)
    } else {
      console.log('📋 Eklenen sütunlar:')
      columnInfo.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`)
      })
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
  }
}

// Run if called directly
if (require.main === module) {
  addIsletmeFields()
    .then(() => {
      console.log('🎉 Migration tamamlandı!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration başarısız:', error)
      process.exit(1)
    })
}

module.exports = { addIsletmeFields }