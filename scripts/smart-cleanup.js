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
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variables gerekli!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function smartCleanup() {
  try {
    console.log('🧹 Akıllı veri temizliği başlıyor...\n');
    
    // Her tablo için custom temizlik
    const cleanupOperations = [
      {
        name: 'dekontlar',
        method: async () => {
          const { data, error } = await supabase.from('dekontlar').delete().gte('created_at', '1900-01-01').select('created_at');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'stajlar',
        method: async () => {
          const { data, error } = await supabase.from('stajlar').delete().gte('created_at', '1900-01-01').select('created_at');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'ogrenci_koordinatorleri',
        method: async () => {
          const { data, error } = await supabase.from('ogrenci_koordinatorleri').delete().gte('created_at', '1900-01-01').select('created_at');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'ogrenciler',
        method: async () => {
          const { data, error } = await supabase.from('ogrenciler').delete().gt('id', 0).select('id');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'isletme_alanlar',
        method: async () => {
          const { data, error } = await supabase.from('isletme_alanlar').delete().gte('created_at', '1900-01-01').select('created_at');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'isletmeler',
        method: async () => {
          const { data, error } = await supabase.from('isletmeler').delete().ilike('id', '%').select('id');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'ogretmenler',
        method: async () => {
          const { data, error } = await supabase.from('ogretmenler').delete().ilike('id', '%').select('id');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      },
      {
        name: 'siniflar',
        method: async () => {
          const { data, error } = await supabase.from('siniflar').delete().gte('created_at', '1900-01-01').select('created_at');
          if (error && !error.message.includes('does not exist')) throw error;
          return data?.length || 0;
        }
      }
    ];

    for (const operation of cleanupOperations) {
      try {
        console.log(`🗑️  ${operation.name} temizleniyor...`);
        const deletedCount = await operation.method();
        console.log(`✅ ${deletedCount} ${operation.name} kaydı silindi.`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`ℹ️  ${operation.name} tablosu mevcut değil, atlanıyor.`);
        } else {
          console.warn(`⚠️  ${operation.name} temizleme hatası: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Akıllı veri temizliği tamamlandı!');
    console.log('💡 Alanlar ve eğitim yılları korundu.');
    console.log('🚀 Şimdi fresh seed data çalıştırabilirsiniz.');
    
  } catch (error) {
    console.error('❌ Temizlik hatası:', error.message);
    throw error;
  }
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  smartCleanup()
    .then(() => {
      console.log('\n🎉 İşlem tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { smartCleanup };