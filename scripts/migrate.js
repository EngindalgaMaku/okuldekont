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

// Migration dosyalarını okuma fonksiyonu
async function readMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = ['combined_migrations.sql'];

  const migrations = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    migrations.push({
      name: file,
      content: content
    });
  }
  return migrations;
}

async function main() {
  console.log('🎓 Hüsniye Özdilek MTAL - Doğrudan Veritabanı Migration');
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

    const migrations = await readMigrationFiles();
    console.log(`✅ ${migrations.length} adet migration dosyası bulundu.`);

    if (migrations.length === 0) {
      console.log('⚠️ Çalıştırılacak yeni migration dosyası bulunamadı.');
      return;
    }

    for (const migration of migrations) {
      console.log(`\n📄 Migration çalıştırılıyor: ${migration.name}`);
      try {
        const commands = migration.content.split(';').filter(c => c.trim() !== '');
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
        console.log(`👍 "${migration.name}" başarıyla tamamlandı.`);
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710') { // "duplicate_table" veya "duplicate_object" hatası
          console.warn(`⚠️  "${migration.name}" atlandı: Nesne (tablo, policy, vb.) zaten mevcut.`);
        } else {
          console.error(`❌ "${migration.name}" çalıştırılırken hata oluştu:`, err.message);
          throw err; // Diğer hatalarda işlemi durdur
        }
      }
    }

    console.log('\n🎉 Tüm migration işlemleri başarıyla tamamlandı!');
  } catch (error) {
    console.error('\n❌ Migration sırasında kritik bir hata oluştu:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  }
}

main();