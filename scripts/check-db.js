import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// .env dosyasını yükle
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase bağlantı bilgileri eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Veritabanı Kontrol Ediliyor...')
  console.log('==================================')

  try {
    // İşletmeleri kontrol et
    const { data: isletmeler, error: isletmeError } = await supabase
      .from('isletmeler')
      .select('*')
    
    if (isletmeError) throw isletmeError

    console.log('\n📊 İşletmeler:', isletmeler.length)
    isletmeler.forEach(i => {
      console.log(`- ${i.ad} (${i.yetkili_kisi})`)
    })

    // Öğrencileri kontrol et
    const { data: ogrenciler, error: ogrenciError } = await supabase
      .from('ogrenciler')
      .select('*')
    
    if (ogrenciError) throw ogrenciError

    console.log('\n👥 Öğrenciler:', ogrenciler.length)
    ogrenciler.forEach(o => {
      console.log(`- ${o.ad} ${o.soyad} (${o.sinif})`)
    })

    // Stajları kontrol et
    const { data: stajlar, error: stajError } = await supabase
      .from('stajlar')
      .select('*')
    
    if (stajError) throw stajError

    console.log('\n📋 Stajlar:', stajlar.length)
    stajlar.forEach(s => {
      console.log(`- Staj #${s.id} (${s.durum})`)
    })

    console.log('\n✅ Veritabanı kontrolü tamamlandı!')

  } catch (error) {
    console.error('\n❌ Hata:', error.message)
    process.exit(1)
  }
}

checkDatabase() 