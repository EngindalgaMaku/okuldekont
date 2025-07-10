const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local dosyasındaki çevre değişkenlerini yükle
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      });
    }
  } catch (error) {
    console.error('⚠️ .env.local dosyası okunurken hata oluştu:', error);
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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

const isletme_alanlar = [
  {
    isletme_id: 'a7e8b9c0-1234-4567-89ab-cdef01234567',
    alan_id: '24368626-8da7-49f9-983b-f57ee8886c3c'
  },
  {
    isletme_id: 'b8f9c0d1-2345-4678-9abc-def012345678',
    alan_id: '24368626-8da7-49f9-983b-f57ee8886c3c'
  },
  {
    isletme_id: 'c90ab1e2-3456-4789-abcd-ef0123456789',
    alan_id: '24368626-8da7-49f9-983b-f57ee8886c3c'
  }
];

async function seedData() {
  console.log('🌱 Örnek veriler yükleniyor...')

  try {
    const { data: isletmelerData, error: isletmelerError } = await supabase
      .from('isletmeler')
      .insert(isletmeler)
      .select()

    if (isletmelerError) throw isletmelerError

    console.log('✅ İşletmeler başarıyla yüklendi:', isletmelerData)

    const { data: isletmeAlanlarData, error: isletmeAlanlarError } = await supabase
      .from('isletme_alanlar')
      .insert(isletme_alanlar)
      .select()

    if (isletmeAlanlarError) throw isletmeAlanlarError

    console.log('✅ İşletme Alanlar başarıyla yüklendi:', isletmeAlanlarData)
  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

seedData() 