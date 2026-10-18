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
  console.log('🛡️ Süper admin koruma sistemi uygulanıyor...');
  
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

    const sqlFilePath = path.join(__dirname, 'add-super-admin-protection.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`✅ SQL betiği okunuyor: ${path.basename(sqlFilePath)}`);

    await client.query(sql);
    console.log('✅ Süper admin koruma sistemi başarıyla uygulandı.');
    console.log('🛡️ Artık süper admin aktif durumu hiçbir şekilde değiştirilemez.');

  } catch (err) {
    console.error('❌ Süper admin koruma sistemi uygulanırken hata oluştu:', err);
    console.error('Hata detayı:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Veritabanı bağlantısı kapatıldı.');
  }
}

main();