const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteAllData() {
  console.log('🧹 BASİT TÜM VERİ SİLME')
  console.log('═══════════════════════════════')
  
  try {
    // Foreign key sırasına göre sil
    const deleteOperations = [
      { table: 'dekontlar', name: '💰 Dekontlar' },
      { table: 'stajlar', name: '📋 Stajlar' },
      { table: 'ogrenciler', name: '👨‍🎓 Öğrenciler' },
      { table: 'isletmeler', name: '🏢 İşletmeler' },
      { table: 'ogretmenler', name: '👨‍🏫 Öğretmenler' },
      { table: 'siniflar', name: '📚 Sınıflar' }
    ]
    
    for (const operation of deleteOperations) {
      console.log(`   ${operation.name} siliniyor...`)
      try {
        // Tüm kayıtları sil (filter olmadan)
        const { error } = await supabase
          .from(operation.table)
          .delete()
          .gte('created_at', '1900-01-01T00:00:00.000Z')
        
        if (error) {
          console.log(`   ❌ ${operation.table} silme hatası: ${error.message}`)
        } else {
          console.log(`   ✅ ${operation.table} silindi`)
        }
      } catch (err) {
        console.log(`   ❌ ${operation.table} exception: ${err.message}`)
      }
    }
    
    // Final kontrol
    console.log('\n🔍 Sonuç kontrolü:')
    for (const operation of deleteOperations) {
      try {
        const { count } = await supabase
          .from(operation.table)
          .select('*', { count: 'exact' })
        console.log(`   ${operation.table}: ${count} kayıt`)
      } catch (error) {
        console.log(`   ${operation.table}: Kontrol hatası`)
      }
    }
    
  } catch (error) {
    console.error('❌ Genel hata:', error)
  }
}

// Script çalıştır
deleteAllData()