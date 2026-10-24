const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

const isletmeler = [
  {
    ad: 'Teknoloji A.Ş.',
    yetkili_kisi: 'Ahmet Yılmaz',
    telefon: '0212 555 1234',
    email: 'info@teknoloji.com',
    adres: 'Ataşehir, İstanbul',
    vergi_no: '1234567890',
    pin: '1234'
  },
  {
    ad: 'Yazılım Ltd. Şti.',
    yetkili_kisi: 'Mehmet Demir',
    telefon: '0216 555 5678',
    email: 'info@yazilim.com',
    adres: 'Kadıköy, İstanbul',
    vergi_no: '9876543210',
    pin: '5678'
  },
  {
    ad: 'Bilişim Sistemleri',
    yetkili_kisi: 'Ayşe Kaya',
    telefon: '0212 555 9012',
    email: 'info@bilisim.com',
    adres: 'Beşiktaş, İstanbul',
    vergi_no: '4567890123',
    pin: '9012'
  }
]

async function addData() {
  console.log('🌱 Örnek işletmeler ekleniyor...')

  try {
    const { data, error } = await supabase
      .from('isletmeler')
      .insert(isletmeler)
      .select()

    if (error) throw error

    console.log('✅ İşletmeler başarıyla eklendi:', data)
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

addData() 