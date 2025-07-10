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

async function checkStajlar() {
  try {
    console.log('🔍 stajlar tablosunu kontrol ediliyor...\n');
    
    // Tüm kayıtları al
    const { data, error } = await supabase
      .from('stajlar')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Hata:', error);
      return;
    }
    
    console.log('📊 stajlar tablosu:');
    if (data && data.length > 0) {
      console.log('   Sütunlar:', Object.keys(data[0]));
      console.log('   İlk kayıt:', data[0]);
    } else {
      console.log('   Hiç kayıt bulunamadı.');
    }
    
  } catch (error) {
    console.error('❌ Kontrol hatası:', error.message);
  }
}

checkStajlar();