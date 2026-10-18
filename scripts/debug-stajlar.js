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
          const value = valueParts.join('=').trim().replace(/"/g, '');
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStajlar() {
  try {
    console.log('🔍 Stajlar debug...\n');
    
    // İlk 3 staj kaydını al
    const { data: stajlar, error } = await supabase
      .from('stajlar')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Stajlar hatası:', error);
      return;
    }
    
    console.log('📊 İlk 3 staj kaydı:');
    stajlar.forEach((staj, index) => {
      console.log(`\n${index + 1}. Staj:`);
      console.log(`   ogrenci_id: "${staj.ogrenci_id}" (${typeof staj.ogrenci_id})`);
      console.log(`   isletme_id: "${staj.isletme_id}" (${typeof staj.isletme_id})`);
      console.log(`   ogretmen_id: "${staj.ogretmen_id}" (${typeof staj.ogretmen_id})`);
      console.log('   Tüm alanlar:', Object.keys(staj));
    });

    // Öğrenciler kontrol
    const { data: ogrenciler } = await supabase.from('ogrenciler').select('id').limit(3);
    console.log('\n📊 İlk 3 öğrenci ID:');
    ogrenciler?.forEach((o, index) => {
      console.log(`   ${index + 1}. "${o.id}" (${typeof o.id})`);
    });

    // İşletmeler kontrol
    const { data: isletmeler } = await supabase.from('isletmeler').select('id').limit(3);
    console.log('\n🏢 İlk 3 işletme ID:');
    isletmeler?.forEach((i, index) => {
      console.log(`   ${index + 1}. "${i.id}" (${typeof i.id})`);
    });

    // Öğretmenler kontrol
    const { data: ogretmenler } = await supabase.from('ogretmenler').select('id').limit(3);
    console.log('\n👨‍🏫 İlk 3 öğretmen ID:');
    ogretmenler?.forEach((o, index) => {
      console.log(`   ${index + 1}. "${o.id}" (${typeof o.id})`);
    });
    
  } catch (error) {
    console.error('❌ Debug hatası:', error.message);
  }
}

debugStajlar();