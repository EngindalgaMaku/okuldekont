const { Client } = require('pg');
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

async function main() {
  console.log('🔧 Ogrenciler UUID Fix Migration');
  console.log('='.repeat(50));

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL bulunamadı. Lütfen .env.local dosyasını kontrol edin.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Veritabanı bağlantısı başarılı.');

    // Migration dosyasını oku
    const migrationPath = path.join(__dirname, 'fix-ogrenciler-uuid.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 UUID fix migration çalıştırılıyor...');
    
    // SQL komutlarını parçala ve çalıştır
    const commands = migrationContent.split(';').filter(c => c.trim() !== '');
    
    for (const command of commands) {
      try {
        await client.query(command);
      } catch (err) {
        // "duplicate" hatalarını görmezden gel, diğerlerini logla
        if (err.code !== '42P07' && err.code !== '42710' && err.code !== '42701') {
          console.warn(`⚠️ Komut çalıştırılırken hata (ancak devam ediliyor): ${err.message.split('\n')[0]}`);
        }
      }
    }
    
    console.log('✅ UUID fix migration başarıyla tamamlandı!');
    
    // Veritabanı durumunu kontrol et
    console.log('\n🔍 Veritabanı durumu kontrol ediliyor...');
    
    const tableCheck = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('ogrenciler', 'stajlar', 'egitim_yillari', 'siniflar') 
      AND column_name = 'id'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tablo ID türleri:');
    tableCheck.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('\n❌ Migration sırasında kritik bir hata oluştu:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  }
}

main();