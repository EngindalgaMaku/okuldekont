const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStajDurum() {
  console.log('=== STAJ DURUM KONTROL ===')
  
  // Get all unique durum values
  const { data: durumData, error: durumError } = await supabase
    .from('stajlar')
    .select('durum')
    .not('durum', 'is', null)
  
  if (durumError) {
    console.error('Durum sorgu hatası:', durumError)
    return
  }
  
  // Count unique durum values
  const durumCounts = {}
  durumData.forEach(item => {
    durumCounts[item.durum] = (durumCounts[item.durum] || 0) + 1
  })
  
  console.log('Staj durum dağılımı:')
  Object.entries(durumCounts).forEach(([durum, count]) => {
    console.log(`  ${durum}: ${count} kayıt`)
  })
  
  // Get some sample records for each durum
  console.log('\nÖrnek kayıtlar:')
  for (const durum of Object.keys(durumCounts)) {
    const { data: sampleData } = await supabase
      .from('stajlar')
      .select('id, ogrenci_id, durum, baslama_tarihi, bitis_tarihi')
      .eq('durum', durum)
      .limit(2)
    
    console.log(`\n${durum} durumuna örnek:`)
    sampleData?.forEach(record => {
      console.log(`  ID: ${record.id}, Öğrenci: ${record.ogrenci_id}, Başlama: ${record.baslama_tarihi}, Bitiş: ${record.bitis_tarihi}`)
    })
  }
}

checkStajDurum()