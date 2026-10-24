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

async function comprehensiveCleanup() {
  try {
    console.log('🧹 Kapsamlı veri temizliği başlıyor...\n');
    
    // Mevcut veri durumunu logla
    console.log('📊 Mevcut veri durumu:');
    
    const counts = await Promise.all([
      supabase.from('dekontlar').select('id', { count: 'exact' }),
      supabase.from('stajlar').select('id', { count: 'exact' }),
      supabase.from('ogrenci_koordinatorleri').select('id', { count: 'exact' }),
      supabase.from('ogrenciler').select('id', { count: 'exact' }),
      supabase.from('isletmeler').select('id', { count: 'exact' }),
      supabase.from('ogretmenler').select('id', { count: 'exact' }),
      supabase.from('siniflar').select('id', { count: 'exact' }),
      supabase.from('alanlar').select('id', { count: 'exact' }),
      supabase.from('isletme_alanlar').select('id', { count: 'exact' }),
    ]);
    
    console.log(`   - Dekontlar: ${counts[0].count}`);
    console.log(`   - Stajlar: ${counts[1].count}`);
    console.log(`   - Öğrenci Koordinatörleri: ${counts[2].count}`);
    console.log(`   - Öğrenciler: ${counts[3].count}`);
    console.log(`   - İşletmeler: ${counts[4].count}`);
    console.log(`   - Öğretmenler: ${counts[5].count}`);
    console.log(`   - Sınıflar: ${counts[6].count}`);
    console.log(`   - Alanlar: ${counts[7].count}`);
    console.log(`   - İşletme Alanlar: ${counts[8].count}\n`);

    // Kullanıcı onayı iste
    console.log('⚠️  Bu işlem TÜM verileri silecek!');
    console.log('💡 Sadece alanlar (areas) ve eğitim yılları korunacak.');
    console.log('🛑 Devam etmek istiyorsanız "EVET" yazın, iptal için CTRL+C basın');
    
    // Simple prompt simulation for script
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve, reject) => {
      rl.question('Onay: ', (answer) => {
        rl.close();
        
        if (answer.toUpperCase() === 'EVET') {
          performCleanup().then(resolve).catch(reject);
        } else {
          console.log('❌ İşlem iptal edildi.');
          resolve();
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Temizlik hatası:', error.message);
    throw error;
  }
}

async function performCleanup() {
  console.log('\n🗑️  Veri silme işlemi başlatılıyor...\n');
  
  // Doğru sırayla silme (foreign key constraints nedeniyle)
  const deleteOperations = [
    { table: 'dekontlar', desc: 'Dekontları' },
    { table: 'stajlar', desc: 'Stajları' },
    { table: 'ogrenci_koordinatorleri', desc: 'Öğrenci koordinatör atamalarını' },
    { table: 'ogrenciler', desc: 'Öğrencileri' },
    { table: 'isletme_alanlar', desc: 'İşletme alan ilişkilerini' },
    { table: 'isletmeler', desc: 'İşletmeleri' },
    { table: 'ogretmenler', desc: 'Öğretmenleri' },
    { table: 'siniflar', desc: 'Sınıfları' }
  ];

  for (const operation of deleteOperations) {
    try {
      console.log(`🗑️  ${operation.desc} siliniyor...`);
      
      const { data, error } = await supabase
        .from(operation.table)
        .delete()
        .neq('id', 'impossible-uuid-to-match-nothing')  // Delete all records
        .select('id');
      
      if (error) {
        console.warn(`⚠️  ${operation.table} silme hatası: ${error.message}`);
      } else {
        console.log(`✅ ${data?.length || 0} ${operation.desc.toLowerCase()} silindi.`);
      }
    } catch (error) {
      console.warn(`⚠️  ${operation.table} silme hatası: ${error.message}`);
    }
  }

  console.log('\n✅ Kapsamlı veri temizliği tamamlandı!');
  console.log('💡 Alanlar ve eğitim yılları korundu.');
  console.log('🚀 Şimdi fresh seed data çalıştırabilirsiniz: npm run seed:fresh');
}

// Eğer script doğrudan çalıştırılırsa
if (require.main === module) {
  comprehensiveCleanup()
    .then(() => {
      console.log('\n🎉 İşlem tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal hata:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveCleanup, performCleanup };