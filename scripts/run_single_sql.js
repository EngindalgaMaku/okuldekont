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
  console.log('🚀 Tek seferlik SQL betiği çalıştırılıyor...');
  
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

    const sqlFilePath = path.join(__dirname, 'create_gorev_belgeleri_rpc.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`✅ SQL betiği okunuyor: ${path.basename(sqlFilePath)}`);

    await client.query(sql);
    console.log('✅ SQL betiği başarıyla çalıştırıldı. `get_gorev_belgeleri_detayli` fonksiyonu oluşturuldu.');

  } catch (err) {
    console.error('❌ Betik çalıştırılırken hata oluştu:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Veritabanı bağlantısı kapatıldı.');
  }
}

main();