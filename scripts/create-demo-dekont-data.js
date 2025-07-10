import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createDemoDekontData() {
  console.log('🔄 DEMO DEKONT VERİLERİ OLUŞTURULUYOR...')
  console.log('=====================================')

  try {
    // Önce mevcut verileri kontrol et
    const { data: existingStajlar } = await supabase
      .from('stajlar')
      .select('id')
      .limit(5)

    if (!existingStajlar || existingStajlar.length === 0) {
      console.log('❌ Önce staj verilerinin olması gerekiyor!')
      console.log('📋 Şu komutları çalıştırın:')
      console.log('   node scripts/seed-data.js')
      return
    }

    // Demo dekont verileri oluştur
    const dekontlar = []
    const statuses = ['bekliyor', 'onaylandi', 'reddedildi']
    
    for (let i = 1; i <= 50; i++) {
      const randomStajId = existingStajlar[Math.floor(Math.random() * existingStajlar.length)].id
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomAmount = Math.floor(Math.random() * 5000) + 1000 // 1000-6000 arası
      
      // Rastgele tarih (son 6 ay içinde)
      const randomDate = new Date()
      randomDate.setMonth(randomDate.getMonth() - Math.floor(Math.random() * 6))
      
      dekontlar.push({
        staj_id: randomStajId,
        miktar: randomAmount,
        odeme_tarihi: randomDate.toISOString(),
        onay_durumu: randomStatus,
        dosya_url: `demo/dekont_${i}.pdf`, // Demo dosya URL'i
        created_at: new Date().toISOString()
      })
    }

    console.log(`📄 ${dekontlar.length} demo dekont oluşturuluyor...`)

    // Dekontları ekle
    const { data, error } = await supabase
      .from('dekontlar')
      .insert(dekontlar)
      .select()

    if (error) {
      console.error('❌ Dekont ekleme hatası:', error)
      return
    }

    console.log(`✅ ${data.length} demo dekont başarıyla oluşturuldu!`)
    console.log('')
    console.log('📊 ÖZET:')
    console.log(`   - Toplam: ${data.length} dekont`)
    console.log(`   - Bekleyen: ${data.filter(d => d.onay_durumu === 'bekliyor').length}`)
    console.log(`   - Onaylanan: ${data.filter(d => d.onay_durumu === 'onaylandi').length}`)
    console.log(`   - Reddedilen: ${data.filter(d => d.onay_durumu === 'reddedildi').length}`)
    console.log('')
    console.log('🧪 TEST İÇİN:')
    console.log('   1. http://localhost:3000/admin/dekontlar adresine gidin')
    console.log('   2. Sayfa 1\'de birkaç dekont seçin')
    console.log('   3. Sayfa 2\'ye geçin - seçimler korunacak')
    console.log('   4. Sayfa 2\'de daha fazla dekont seçin')
    console.log('   5. Toplu işlem yapın - tüm seçili dekontlar işlenecek')

  } catch (error) {
    console.error('❌ Hata:', error)
  }
}

createDemoDekontData() 