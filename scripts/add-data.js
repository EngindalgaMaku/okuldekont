import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'

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