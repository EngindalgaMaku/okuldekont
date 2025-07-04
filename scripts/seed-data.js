import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://guqwqbxsfvddwwczwljp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXdxYnhzZnZkZHd3Y3p3bGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NjAsImV4cCI6MjA2NjI2NTQ2MH0.M9DmYt3TcUiM50tviy8P4DhgTlADVjPEZBX8CNCpQOs'

const supabase = createClient(supabaseUrl, supabaseKey)

const isletmeler = [
  {
    ad: 'Teknoloji A.Ş.',
    yetkili_kisi: 'Ahmet Yılmaz',
    pin: '1234'
  },
  {
    ad: 'Yazılım Ltd. Şti.',
    yetkili_kisi: 'Mehmet Demir',
    pin: '5678'
  },
  {
    ad: 'Bilişim Sistemleri',
    yetkili_kisi: 'Ayşe Kaya',
    pin: '9012'
  }
]

async function seedData() {
  console.log('🌱 Örnek veriler yükleniyor...')

  try {
    const { data, error } = await supabase
      .from('isletmeler')
      .insert(isletmeler)
      .select()

    if (error) throw error

    console.log('✅ Veriler başarıyla yüklendi:', data)
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

seedData() 